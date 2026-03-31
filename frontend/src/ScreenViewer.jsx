import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const WS_SUBPROTOCOL = 'json.webpubsub.azure.v1';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN server — required for viewers behind strict NATs (replace with real credentials)
    // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' },
  ],
};

export default function ScreenViewer({ code }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'live' | 'ended' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let ws;
    let pc;
    let cancelled = false;

    async function connect() {
      // 1. Join room — get WebSocket URL from backend
      let wsUrl;
      try {
        const res = await fetch(`${API_BASE_URL}/room/screen/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (res.status === 404) {
          setStatus('error');
          setErrorMsg('Room not found. Ask the sharer to check their code and try again.');
          return;
        }
        if (res.status === 410) {
          setStatus('error');
          setErrorMsg('This screen share link has expired.');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          setErrorMsg('Failed to join room. Please try again.');
          return;
        }

        ({ wsUrl } = await res.json());
      } catch {
        setStatus('error');
        setErrorMsg('Network error — could not reach the server.');
        return;
      }

      if (cancelled) return;

      // 2. Connect WebSocket
      ws = new WebSocket(wsUrl, WS_SUBPROTOCOL);

      // 3. Create RTCPeerConnection
      pc = new RTCPeerConnection(ICE_SERVERS);

      pc.ontrack = (event) => {
        if (videoRef.current && !cancelled) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('live');
        }
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'sendToGroup',
              group: code,
              data: { type: 'ice', candidate },
            })
          );
        }
      };

      ws.onopen = () => {
        if (cancelled) return;
        // 4. Tell the sharer a viewer has arrived
        ws.send(
          JSON.stringify({
            type: 'sendToGroup',
            group: code,
            data: { type: 'viewer-joined' },
          })
        );
      };

      ws.onmessage = async (event) => {
        if (cancelled) return;
        const msg = JSON.parse(event.data);
        if (msg.type !== 'message') return;
        const data = msg.data;

        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(
            JSON.stringify({
              type: 'sendToGroup',
              group: code,
              data: { type: 'answer', sdp: pc.localDescription },
            })
          );
        } else if (data.type === 'ice' && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };

      ws.onerror = () => {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg('Connection lost. Please refresh to reconnect.');
        }
      };

      ws.onclose = () => {
        if (!cancelled) setStatus('ended');
      };
    }

    connect();

    return () => {
      cancelled = true;
      ws?.close();
      pc?.close();
    };
  }, [code]);

  if (status === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-zinc-100 text-lg font-semibold mb-2">Can't connect to stream</p>
          <p className="text-zinc-400 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-zinc-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
            </svg>
          </div>
          <p className="text-zinc-100 text-lg font-semibold mb-2">Stream ended</p>
          <p className="text-zinc-500 text-sm">The sharer has stopped the screen share.</p>
        </div>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mb-4" />
          <p className="text-zinc-100 font-medium">Waiting for stream...</p>
          <p className="text-zinc-500 text-sm mt-1">The video will appear automatically once the sharer is ready</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="flex-1 w-full bg-black object-contain"
    />
  );
}
