import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface ScanCompleteModalProps {
  isOpen: boolean;
  isBaseline: boolean;
  onViewProgress: () => void;
}

export const ScanCompleteModal: React.FC<ScanCompleteModalProps> = ({
  isOpen,
  isBaseline,
  onViewProgress,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative w-full max-w-sm bg-[#080d1e] border-2 border-cyan-500/60 rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(0,240,255,0.3)] overflow-hidden"
      >
        {/* Futuristic Corner Tech Accents */}
        <span className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400" />
        <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400" />
        <span className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400" />
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400" />

        {/* Ambient Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-950 to-blue-900 border border-cyan-400/60 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
          {isBaseline ? (
            <CheckCircle2 className="w-7 h-7 text-cyan-300" />
          ) : (
            <Sparkles className="w-7 h-7 text-cyan-300" />
          )}
        </div>

        {/* System Header */}
        <p className="font-hud text-xs font-bold tracking-[0.25em] text-cyan-400 uppercase mb-1">
          SYSTEM
        </p>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent my-2" />

        <h3 className="font-display text-xl font-black text-white tracking-wider uppercase system-text-glow">
          {isBaseline ? 'BASELINE SCAN CREATED ✓' : 'PROGRESS SCAN COMPLETE'}
        </h3>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent my-2" />

        {/* System Message */}
        <p className="font-hud text-xs text-slate-300 tracking-wide mt-3 mb-6 leading-relaxed">
          {isBaseline ? (
            <>Your future scans will be compared with this baseline.</>
          ) : (
            <>
              Your latest development scan
              <br />
              has been recorded.
            </>
          )}
        </p>

        {/* Primary Action Button */}
        <button
          onClick={onViewProgress}
          className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-hud text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] cursor-pointer"
        >
          {isBaseline ? 'CONTINUE' : 'VIEW PROGRESS'}
        </button>

        {/* Security Footnote */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <ShieldCheck className="w-3 h-3 text-cyan-500/70" />
          <span>STORED PRIVATELY & SECURELY</span>
        </div>
      </motion.div>
    </div>
  );
};
