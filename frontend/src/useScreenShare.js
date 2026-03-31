import { useState, useRef, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Azure Web PubSub subprotocol — enables group messaging without extra libraries
const WS_SUBPROTOCOL = 'json.webpubsub.azure.v1';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN server — required for viewers behind strict NATs (replace with real credentials)
    // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' },
  ],
};

export function useScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [code, setCode] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micTrackRef = useRef(null);
  const displayStreamRef = useRef(null);
  // Store the room code in a ref so async callbacks always see the latest value
  const codeRef = useRef(null);

  const stopSharing = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    micTrackRef.current = null;
    codeRef.current = null;
    setIsSharing(false);
    setCode(null);
    setIsMicOn(true);
    setError(null);
  }, []);

  const startSharing = useCallback(async () => {
    try {
      setError(null);

      // 1. Create room — get short code and sharer's WebSocket URL
      const res = await fetch(`${API_BASE_URL}/room/screen/create`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create room');
      const { code: roomCode, wsUrl } = await res.json();
      codeRef.current = roomCode;
      setCode(roomCode);

      // 2. Open WebSocket with Azure Web PubSub subprotocol
      const ws = new WebSocket(wsUrl, WS_SUBPROTOCOL);
      wsRef.current = ws;

      // 3. Capture screen (try with audio first, silently fall back without)
      let displayStream;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } catch {
        displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }
      displayStreamRef.current = displayStream;

      // 4. Capture microphone (optional — continue without if denied)
      let micTrack = null;
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micTrack = micStream.getAudioTracks()[0] ?? null;
        micTrackRef.current = micTrack;
      } catch {
        // mic denied — continue without
      }

      // 5. Mix screen audio + mic into one track via AudioContext
      const audioTracks = [
        ...displayStream.getAudioTracks(),
        ...(micTrack ? [micTrack] : []),
      ];
      let mixedAudioTrack = null;
      if (audioTracks.length > 0) {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const dest = ctx.createMediaStreamDestination();
        audioTracks.forEach((track) => {
          ctx.createMediaStreamSource(new MediaStream([track])).connect(dest);
        });
        mixedAudioTrack = dest.stream.getAudioTracks()[0] ?? null;
      }

      // 6. Create RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // 7. Add video track (and mixed audio if available)
      pc.addTrack(displayStream.getVideoTracks()[0], displayStream);
      if (mixedAudioTrack) pc.addTrack(mixedAudioTrack);

      // 8. Send ICE candidates through the signaling channel
      pc.onicecandidate = ({ candidate }) => {
        if (candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'sendToGroup',
              group: codeRef.current,
              data: { type: 'ice', candidate },
            })
          );
        }
      };

      // 9. Handle incoming signaling messages
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        // Azure Web PubSub wraps group messages as {type:'message', from:'group', data:{...}}
        if (msg.type !== 'message') return;
        const data = msg.data;

        if (data.type === 'viewer-joined') {
          // A viewer connected — create and send an offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(
            JSON.stringify({
              type: 'sendToGroup',
              group: codeRef.current,
              data: { type: 'offer', sdp: pc.localDescription },
            })
          );
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'ice' && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };

      // 10. If user stops screen share via browser UI, tear down cleanly
      displayStream.getVideoTracks()[0].onended = () => stopSharing();

      ws.onopen = () => setIsSharing(true);
      ws.onerror = () => setError('Signaling connection error');
    } catch (err) {
      setError(err.message || 'Failed to start sharing');
      stopSharing();
    }
  }, [stopSharing]);

  // Toggle mic without restarting the stream
  const toggleMic = useCallback(() => {
    if (micTrackRef.current) {
      micTrackRef.current.enabled = !micTrackRef.current.enabled;
      setIsMicOn((prev) => !prev);
    }
  }, []);

  return { startSharing, stopSharing, toggleMic, isSharing, isMicOn, code, error };
}
