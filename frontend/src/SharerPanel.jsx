import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useScreenShare } from './useScreenShare';

export default function SharerPanel() {
  const { startSharing, stopSharing, toggleMic, isSharing, isMicOn, code, error } =
    useScreenShare();

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  if (!isSharing) {
    return (
      <button
        onClick={startSharing}
        className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-lg transition-all duration-200 transform hover:scale-105 border border-zinc-700"
      >
        <svg
          className="w-4 h-4 text-indigo-400"
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
        Share my screen
      </button>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4 shadow-2xl shadow-indigo-600/10">
      {/* Live status */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-zinc-300 text-sm font-medium">Live — screen sharing active</span>
      </div>

      {/* Code display */}
      <div className="bg-zinc-900 border border-indigo-600/30 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-zinc-500 mb-1">Share this code with viewers</p>
          <p className="text-3xl sm:text-4xl font-bold font-mono tracking-wider bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {code}
          </p>
        </div>
        <button
          onClick={handleCopyCode}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy Code
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          )}
          Mic {isMicOn ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={stopSharing}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg font-medium text-sm transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 10h6v4H9z"
            />
          </svg>
          Stop sharing
        </button>
      </div>
    </div>
  );
}
