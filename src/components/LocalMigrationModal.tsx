import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, UploadCloud, RotateCcw, AlertTriangle, Check, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const LocalMigrationModal: React.FC = () => {
  const { pendingLocalMigration, saveLocalToCloud, startFreshCloud } = useAuth();
  const [isConfirmingStartFresh, setIsConfirmingStartFresh] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!pendingLocalMigration) return null;

  const handleSaveToAccount = async () => {
    setIsProcessing(true);
    await saveLocalToCloud();
    setIsProcessing(false);
  };

  const handleConfirmStartFresh = async () => {
    setIsProcessing(true);
    await startFreshCloud();
    setIsProcessing(false);
    setIsConfirmingStartFresh(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="w-full max-w-md rounded-2xl bg-[#090d1c] border border-cyan-500/50 p-6 shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col gap-4 text-slate-100"
      >
        {/* Top Header */}
        <div className="flex items-center gap-3 text-cyan-400">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Database className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-cyan-400/80 uppercase">
              DATA RESOLUTION PROTOCOL
            </div>
            <h2 className="text-base font-bold font-mono tracking-wider uppercase text-white">
              LOCAL PROGRESS FOUND
            </h2>
          </div>
        </div>

        {/* Informational text */}
        <p className="text-xs font-mono text-slate-300 leading-relaxed">
          You have existing QuestLife progress on this device. Would you like to bind your existing
          level, XP, streaks, workouts, and quest history to your newly authenticated cloud account?
        </p>

        <div className="p-3.5 rounded-xl bg-[#05070e] border border-cyan-950 flex flex-col gap-1.5 text-[11px] font-mono text-cyan-300/80">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Transaction-based XP & ledger continuity</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-device synchronization enabled</span>
          </div>
        </div>

        {/* Start Fresh Confirmation View */}
        {isConfirmingStartFresh ? (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>CONFIRM FRESH START</span>
            </div>
            <p className="text-[11px] font-mono text-rose-200/90 leading-relaxed">
              This will discard existing local progress on this device and establish a brand new Level 1 Hunter baseline in the cloud. Are you sure?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmingStartFresh(false)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
              >
                CANCEL
              </button>
              <button
                type="button"
                id="confirm-start-fresh-btn"
                onClick={handleConfirmStartFresh}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold tracking-wider transition-colors shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                {isProcessing ? 'RESETTING...' : 'YES, START FRESH'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-2">
            {/* Primary Action: Save to Account */}
            <button
              type="button"
              id="save-to-account-btn"
              onClick={handleSaveToAccount}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>{isProcessing ? 'UPLOADING PROGRESS...' : 'SAVE TO ACCOUNT'}</span>
            </button>

            {/* Secondary Action: Start Fresh */}
            <button
              type="button"
              id="start-fresh-btn"
              onClick={() => setIsConfirmingStartFresh(true)}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-mono text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>START FRESH</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
