import React from 'react';
import { CheckCircle2, AlertTriangle, Sparkles, Clock, ShieldCheck, X } from 'lucide-react';
import { TaskVerificationStatus } from '../types.ts';

interface TaskVerificationNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  captureTimeStr: string;
  status: TaskVerificationStatus;
  xpAwarded: number;
  allowedWindowStr?: string;
  onCompleteManually?: () => void;
}

export const TaskVerificationNotificationModal: React.FC<TaskVerificationNotificationModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  captureTimeStr,
  status,
  xpAwarded,
  allowedWindowStr,
  onCompleteManually,
}) => {
  if (!isOpen) return null;

  const isVerified = status === 'verified';
  const isMissed = status === 'window_missed';

  return (
    <div
      id="task-verification-notification-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-modal-title"
    >
      {/* Outer System HUD Container with pulsing neon border glow */}
      <div
        id="task-verification-modal-card"
        className={`relative w-full max-w-sm rounded-2xl p-6 text-center border transition-all duration-300 ${
          isVerified
            ? 'bg-gradient-to-b from-[#0a1428] via-[#070e1c] to-[#040812] border-cyan-400 shadow-[0_0_35px_rgba(0,240,255,0.45)]'
            : 'bg-gradient-to-b from-[#1c1214] via-[#120a0d] to-[#080406] border-amber-500/70 shadow-[0_0_35px_rgba(245,158,11,0.35)]'
        }`}
      >
        {/* Subtle decorative corner laser brackets */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

        {/* Ambient background glow ring */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full blur-[60px] pointer-events-none ${
            isVerified ? 'bg-cyan-500/20' : 'bg-amber-500/20'
          }`}
        />

        {/* Header: SYSTEM */}
        <div className="relative">
          <p
            id="system-modal-title"
            className="font-hud text-xs font-black tracking-[0.3em] text-slate-300 uppercase"
          >
            SYSTEM
          </p>

          <div
            className={`my-2 h-[1px] w-full ${
              isVerified
                ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#00f0ff]'
                : 'bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_8px_#f59e0b]'
            }`}
          />

          <h2
            className={`font-display text-lg sm:text-xl font-black tracking-widest uppercase ${
              isVerified
                ? 'text-cyan-300 system-text-glow'
                : 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'
            }`}
          >
            {isVerified ? 'QUEST VERIFIED' : 'VERIFICATION WINDOW MISSED'}
          </h2>

          <div
            className={`my-2 h-[1px] w-full ${
              isVerified
                ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#00f0ff]'
                : 'bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_8px_#f59e0b]'
            }`}
          />
        </div>

        {/* Central Icon */}
        <div className="my-4 flex justify-center">
          <div
            className={`relative w-16 h-16 rounded-2xl flex items-center justify-center border animate-pulse ${
              isVerified
                ? 'bg-cyan-950/70 border-cyan-400/80 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.5)]'
                : 'bg-amber-950/70 border-amber-400/80 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
            ) : (
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            )}
          </div>
        </div>

        {/* Task Name */}
        <div className="mb-4">
          <span className="text-[10px] font-hud tracking-widest text-slate-400 uppercase block mb-0.5">
            OBJECTIVE CLEARED
          </span>
          <p className="font-display text-base font-extrabold text-white tracking-wide">
            {taskTitle}
          </p>
        </div>

        {/* Metadata Details Grid */}
        <div className="bg-[#050914]/90 border border-slate-800 rounded-xl p-3.5 mb-4 text-left space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 uppercase text-[10px] font-hud tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              CAPTURE TIME
            </span>
            <span className="text-white font-bold">{captureTimeStr}</span>
          </div>

          {allowedWindowStr && (
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
              <span className="text-slate-400 uppercase text-[10px] font-hud tracking-wider">
                ALLOWED WINDOW
              </span>
              <span className="text-slate-300">{allowedWindowStr}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span className="text-slate-400 uppercase text-[10px] font-hud tracking-wider">
              STATUS
            </span>
            <span
              className={`font-hud font-extrabold tracking-wider ${
                isVerified ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              {isVerified ? '✓ VERIFIED' : 'WINDOW MISSED'}
            </span>
          </div>
        </div>

        {/* Verification Notice Disclaimer */}
        <p className="text-[10px] font-mono text-slate-400/90 leading-relaxed mb-4 px-1">
          {isVerified
            ? 'The capture verifies that a photo was taken through the app during the configured time window.'
            : 'The capture was registered outside the scheduled window. You may still claim quest completion manually.'}
        </p>

        {/* Reward XP Badge if verified */}
        {isVerified && (
          <div className="mb-4 py-2 px-3 rounded-lg bg-cyan-950/60 border border-cyan-400/50 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-hud text-sm font-black text-cyan-200 tracking-wider">
              +{xpAwarded} XP
            </span>
          </div>
        )}

        <div
          className={`mb-4 h-[1px] w-full ${
            isVerified
              ? 'bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent'
              : 'bg-gradient-to-r from-transparent via-amber-500/60 to-transparent'
          }`}
        />

        {/* Action Buttons */}
        {isVerified ? (
          <button
            type="button"
            id="btn-verification-ok"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white font-hud text-xs font-black tracking-widest uppercase hover:shadow-[0_0_20px_rgba(0,240,255,0.6)] active:scale-[0.98] transition-all cursor-pointer border border-cyan-300"
          >
            [ OK ]
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {onCompleteManually && (
              <button
                type="button"
                id="btn-verification-manual-fallback"
                onClick={() => {
                  onCompleteManually();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400/80 text-cyan-200 font-hud text-[11px] font-black tracking-wider uppercase hover:bg-cyan-900/60 transition-all cursor-pointer"
              >
                COMPLETE MANUALLY
              </button>
            )}
            <button
              type="button"
              id="btn-verification-dismiss"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-hud text-[11px] font-bold tracking-wider uppercase hover:bg-slate-800 transition-all cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
