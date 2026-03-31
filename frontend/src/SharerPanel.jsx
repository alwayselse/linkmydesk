import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useScreenShare } from './useScreenShare';

export default function SharerPanel() {
  const { startSharing, stopSharing, toggleMic, isSharing, isMicOn, code, error } =
    useScreenShare();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Idle: match the Uploader dashed-card style as a sibling ---
  if (!isSharing) {
    return (
      <div className="w-full max-w-2xl">
        <div
          onClick={startSharing}
          className="border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 border-zinc-700 bg-zinc-800/50 hover:border-indigo-600/50 hover:bg-zinc-800 hover:shadow-lg"
        >
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-zinc-700/50 flex items-center justify-center">
              <svg
                className="w-8 sm:w-10 h-8 sm:h-10 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-zinc-200 text-base sm:text-lg font-semibold mb-2">
                Share your screen live
              </p>
              <p className="text-zinc-500 text-sm">
                Viewers enter your code to watch in real time
              </p>
            </div>
            <button
              type="button"
              className="mt-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Share my screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Active: match SuccessCard style ---
  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6 sm:p-10 shadow-2xl shadow-indigo-600/10">
      {/* Live indicator */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 bg-red-600/20 rounded-full mb-4">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
        <p className="text-zinc-400 text-base sm:text-lg">Your screen is live!</p>
      </div>

      {/* Code — user-select: all so it's highlightable, one copy button */}
      <div className="bg-zinc-700 p-4 rounded-lg mb-6">
        <p className="text-sm text-zinc-400 mb-2">Share this code with viewers:</p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div
            className="flex-1 w-full text-center px-4 sm:px-6 py-3 sm:py-4 bg-zinc-900 border-2 border-indigo-600/30 rounded-lg cursor-text"
            style={{ userSelect: 'all' }}
          >
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-wider font-mono">
              {code}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-indigo-600/30 whitespace-nowrap"
          >
            <div className="flex items-center justify-center gap-2">
              {copied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              {copied ? 'Copied!' : 'Copy Code'}
            </div>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={toggleMic}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            isMicOn
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-500 border border-zinc-700'
          }`}
        >
          {isMicOn ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
          Mic {isMicOn ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={stopSharing}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg font-medium text-sm transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
          </svg>
          Stop sharing
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-zinc-500">Stream expires in 24 hours • Anonymous • Peer-to-peer</p>
      </div>
    </div>
  );
}
