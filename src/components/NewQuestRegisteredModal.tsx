import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Check } from 'lucide-react';

interface NewQuestRegisteredModalProps {
  isOpen: boolean;
  questTitle: string;
  time: string;
  xp: number;
  onAccept: () => void;
}

export const NewQuestRegisteredModal: React.FC<NewQuestRegisteredModalProps> = ({
  isOpen,
  questTitle,
  time,
  xp,
  onAccept,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="new-quest-registered-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <motion.div
            id="new-quest-registered-card"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-sm bg-[#0a0f1d] border border-cyan-500/50 rounded-lg p-6 shadow-[0_0_40px_rgba(6,182,212,0.25)] text-center relative overflow-hidden"
          >
            {/* Solo Leveling Top Light Flare */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
                SYSTEM
              </span>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-5" />

            <div className="text-[11px] font-mono tracking-[0.2em] text-gray-400 uppercase mb-2">
              NEW QUEST REGISTERED
            </div>

            <h3
              id="registered-quest-title"
              className="text-xl font-black text-white tracking-wide uppercase mb-5 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
            >
              {questTitle}
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#0e1626] border border-cyan-900/40 rounded p-3 text-left">
                <div className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1">
                  TIME
                </div>
                <div className="text-sm font-bold text-gray-200">{time}</div>
              </div>

              <div className="bg-[#0e1626] border border-cyan-900/40 rounded p-3 text-left">
                <div className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest mb-1">
                  REWARD
                </div>
                <div className="text-sm font-black text-cyan-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />+{xp} XP
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-5" />

            <button
              id="btn-accept-new-quest"
              onClick={onAccept}
              className="w-full py-3.5 px-6 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold tracking-[0.2em] uppercase text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              [ ACCEPT ]
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
