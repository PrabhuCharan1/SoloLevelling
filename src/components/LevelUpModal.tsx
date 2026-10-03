import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Zap, ChevronRight } from 'lucide-react';
import { getHunterRank } from '../utils/levelSystem.ts';
import { audioManager } from '../utils/audioManager.ts';

interface LevelUpModalProps {
  isOpen: boolean;
  level: number;
  nextLevelXp: number;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  level,
  nextLevelXp,
  onClose,
}) => {
  // Play atmospheric level-up sound and auto-dismiss after 4.5 seconds if user does not click
  useEffect(() => {
    if (!isOpen) return;
    audioManager.playLevelUp();
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop with cybernetic dark blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#03060f]/85 backdrop-blur-md"
          />

          {/* Glowing particle / ambient backdrop effect */}
          <div className="absolute w-72 h-72 rounded-full bg-cyan-500/20 blur-[90px] pointer-events-none animate-pulse" />
          <div className="absolute w-60 h-60 rounded-full bg-purple-600/25 blur-[80px] pointer-events-none" />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="relative w-full max-w-[340px] rounded-2xl bg-gradient-to-b from-[#0e1635] via-[#090e24] to-[#050814] border-2 border-cyan-400 p-6 text-center shadow-[0_0_50px_rgba(0,240,255,0.4)] overflow-hidden"
          >
            {/* Corner cybernetic brackets */}
            <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-300" />
            <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-300" />
            <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-300" />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-300" />

            {/* Top Hunter System Emblem */}
            <div className="relative mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-950 via-[#101b44] to-purple-950 border border-cyan-400 p-1 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.5)]">
              <div className="w-full h-full rounded-xl bg-[#060a1a] flex items-center justify-center text-cyan-300">
                <Shield className="w-8 h-8 stroke-[2.2] text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
              </div>
              <Sparkles className="absolute -top-1.5 -right-1.5 w-5 h-5 text-cyan-300 animate-bounce" />
            </div>

            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-400/60 text-cyan-300 font-hud text-[11px] font-extrabold tracking-[0.25em] uppercase mb-2 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
              <Zap className="w-3 h-3 fill-cyan-400" />
              SYSTEM NOTIFICATION
            </div>

            {/* Big Level Up Title */}
            <h2 className="font-display text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 tracking-tight system-text-glow">
              LEVEL UP
            </h2>

            {/* Large Dynamic Level Number */}
            <div className="my-3 py-2 px-4 rounded-xl bg-[#070c20]/80 border border-cyan-500/40">
              <span className="font-hud text-xs text-cyan-400 font-bold tracking-widest block uppercase mb-0.5">
                CURRENT RANK: {getHunterRank(level)}
              </span>
              <span className="font-display text-3xl font-black text-cyan-300 tracking-wider">
                LEVEL {level}
              </span>
            </div>

            {/* Rank Increased Banner */}
            <p className="font-hud text-xs font-bold text-cyan-400 tracking-widest uppercase mb-1">
              + SYSTEM RANK INCREASED
            </p>
            <p className="font-hud text-[11px] text-slate-400 tracking-wider mb-5">
              Next milestone unlocked at {nextLevelXp.toLocaleString()} XP
            </p>

            {/* Acknowledge Button */}
            <button
              type="button"
              onClick={() => {
                audioManager.playUiClick();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 text-[#030612] font-hud text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.5)]"
            >
              <span>[ ACKNOWLEDGE ]</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
