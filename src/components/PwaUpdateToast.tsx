import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Zap } from 'lucide-react';

interface PwaUpdateToastProps {
  needRefresh: boolean;
  onUpdate: () => Promise<void>;
}

export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({ needRefresh, onUpdate }) => {
  const [updating, setUpdating] = useState(false);

  if (!needRefresh) {
    return null;
  }

  const handleUpdate = async () => {
    setUpdating(true);
    await onUpdate();
  };

  return (
    <motion.aside
      aria-label="Application update notification"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[400px] pointer-events-auto"
    >
      <div
        id="pwa-update-toast"
        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#090f22]/95 border border-cyan-400/60 shadow-[0_0_25px_rgba(0,240,255,0.3)] backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-cyan-300 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold text-white tracking-wide">
              New QuestLife version available.
            </h4>
            <p className="text-[10px] text-cyan-300/80 font-sans">
              Local progress & stats safely preserved.
            </p>
          </div>
        </div>

        <button
          id="pwa-update-btn"
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,240,255,0.5)] cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
          <span>{updating ? 'UPDATING...' : 'UPDATE'}</span>
        </button>
      </div>
    </motion.aside>
  );
};
