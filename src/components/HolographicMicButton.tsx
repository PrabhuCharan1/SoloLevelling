import React from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { ScarState } from '../services/voiceService.ts';

interface HolographicMicButtonProps {
  state: ScarState;
  isVoiceActive: boolean;
  micPermissionDenied?: boolean;
  onClick: () => void;
  className?: string;
}

export const HolographicMicButton: React.FC<HolographicMicButtonProps> = ({
  state,
  isVoiceActive,
  micPermissionDenied = false,
  onClick,
  className = '',
}) => {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isProcessing = state === 'processing' || state === 'thinking';
  const isError = state === 'error' || micPermissionDenied;

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* 1. Floor Perspective Holographic Pedestal (Concentric Ellipses & Radial Lines) */}
      <div className="absolute -bottom-8 pointer-events-none w-72 h-20 flex items-center justify-center opacity-70">
        {/* Outermost Faint Ellipse */}
        <div className="absolute w-64 h-14 rounded-full border border-cyan-500/20 [transform:rotateX(65deg)]" />

        {/* Middle Luminous Ellipse with Glow */}
        <div
          className={`absolute w-52 h-12 rounded-full border transition-all duration-700 [transform:rotateX(65deg)] ${
            isListening || isSpeaking
              ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.4)]'
              : 'border-cyan-500/30'
          }`}
        />

        {/* Inner Bright Ellipse Ring */}
        <div
          className={`absolute w-36 h-9 rounded-full border transition-all duration-700 [transform:rotateX(65deg)] ${
            isListening || isSpeaking
              ? 'border-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.6)]'
              : 'border-cyan-400/40'
          }`}
        />

        {/* Radial Floor Glow Disc */}
        <div
          className={`w-28 h-6 rounded-full blur-sm transition-all duration-500 ${
            isError
              ? 'bg-rose-500/30'
              : isListening || isSpeaking
              ? 'bg-cyan-400/35 shadow-[0_0_25px_#00e5ff]'
              : 'bg-cyan-500/15'
          }`}
        />
      </div>

      {/* 2. Side Bracket Flares ( ) from the Reference Image */}
      <div className="relative flex items-center justify-center gap-4 z-10">
        {/* Left Curved HUD Bracket */}
        <div className="hidden sm:flex items-center text-cyan-400/60 pointer-events-none select-none">
          <svg width="24" height="60" viewBox="0 0 24 60" fill="none">
            <path
              d="M20 2C8 16 8 44 20 58"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={`transition-all duration-500 ${
                isListening || isSpeaking
                  ? 'text-cyan-300 drop-shadow-[0_0_8px_#00e5ff]'
                  : 'text-cyan-500/40'
              }`}
            />
          </svg>
        </div>

        {/* 3. The Central Holographic Microphone Button */}
        <div className="relative flex items-center justify-center">
          {/* Active Rippling Shockwaves in Listening or Speaking State */}
          {(isListening || isSpeaking) && (
            <>
              <span className="absolute inset-0 rounded-full border border-cyan-400/60 animate-ping opacity-60 pointer-events-none" />
              <span className="absolute -inset-3 rounded-full border border-cyan-400/40 animate-pulse pointer-events-none" />
            </>
          )}

          {/* Outer Layer Glowing Glass Rim */}
          <div
            className={`absolute -inset-2 rounded-full border transition-all duration-500 pointer-events-none ${
              isError
                ? 'border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                : isListening
                ? 'border-cyan-300 shadow-[0_0_35px_rgba(0,229,255,0.7)] animate-pulse'
                : isSpeaking
                ? 'border-cyan-200 shadow-[0_0_40px_rgba(0,229,255,0.8)]'
                : isVoiceActive
                ? 'border-cyan-400/50 shadow-[0_0_20px_rgba(0,210,255,0.35)]'
                : 'border-cyan-600/30'
            }`}
          />

          {/* Primary Button Element */}
          <button
            type="button"
            onClick={onClick}
            aria-label={
              micPermissionDenied
                ? 'Microphone permission denied'
                : isVoiceActive
                ? 'Deactivate Voice Mode'
                : 'Activate Voice Mode'
            }
            className={`group relative w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-95 ${
              isError
                ? 'bg-gradient-to-b from-rose-950/80 to-[#0d0208] border-2 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)]'
                : isListening
                ? 'bg-gradient-to-b from-cyan-400/30 via-blue-950/90 to-[#020b22] border-2 border-cyan-300 shadow-[0_0_40px_rgba(0,229,255,0.75)]'
                : isSpeaking
                ? 'bg-gradient-to-b from-cyan-300/35 via-blue-900/90 to-[#02071a] border-2 border-cyan-200 shadow-[0_0_45px_rgba(0,229,255,0.8)]'
                : isVoiceActive
                ? 'bg-gradient-to-b from-cyan-500/20 via-blue-950/80 to-[#020617] border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,210,255,0.4)]'
                : 'bg-gradient-to-b from-cyan-900/20 via-[#03091e] to-[#01030a] border-2 border-cyan-600/40 hover:border-cyan-400/70 hover:shadow-[0_0_25px_rgba(0,210,255,0.3)]'
            }`}
          >
            {/* Inner Concentric Sapphire Ring */}
            <div className="absolute inset-1.5 rounded-full border border-cyan-400/30 pointer-events-none" />

            {/* Icon */}
            {micPermissionDenied ? (
              <AlertCircle className="w-8 h-8 text-rose-400 group-hover:scale-110 transition-transform duration-200" />
            ) : isVoiceActive ? (
              <Mic
                className={`w-8 h-8 transition-transform duration-200 group-hover:scale-110 ${
                  isSpeaking
                    ? 'text-white drop-shadow-[0_0_12px_#00e5ff]'
                    : isListening
                    ? 'text-cyan-200 drop-shadow-[0_0_10px_#00e5ff] animate-pulse'
                    : 'text-cyan-300 drop-shadow-[0_0_8px_#00e5ff]'
                }`}
              />
            ) : (
              <Mic className="w-8 h-8 text-cyan-400/70 group-hover:text-cyan-200 transition-colors duration-200" />
            )}
          </button>
        </div>

        {/* Right Curved HUD Bracket */}
        <div className="hidden sm:flex items-center text-cyan-400/60 pointer-events-none select-none">
          <svg width="24" height="60" viewBox="0 0 24 60" fill="none">
            <path
              d="M4 2C16 16 16 44 4 58"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={`transition-all duration-500 ${
                isListening || isSpeaking
                  ? 'text-cyan-300 drop-shadow-[0_0_8px_#00e5ff]'
                  : 'text-cyan-500/40'
              }`}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
