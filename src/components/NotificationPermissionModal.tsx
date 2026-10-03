import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ShieldCheck, X } from 'lucide-react';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny?: () => void;
  onDismiss?: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onAllow,
  onDeny,
  onDismiss,
}) => {
  const handleClose = onDismiss || onDeny || (() => {});

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#090e24] to-[#04060f] border border-purple-500/40 p-5 shadow-[0_0_40px_rgba(168,85,247,0.2)]"
          >
            <div className="flex items-center justify-between border-b border-purple-950/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono font-bold tracking-widest text-purple-300 uppercase">
                  HUNTER ALERTS
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <h3 className="text-sm font-bold text-white font-mono">
                Allow QuestLife to remind you about your routine.
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Receive tactical routine reminders, workout prompts, hydration checks, and notifications when quests and mystery rewards unlock.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-purple-300/80 font-mono pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Zero spam. Can be turned off anytime in Settings.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                id="notification-deny-btn"
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
              >
                NOT NOW
              </button>
              <button
                id="notification-allow-btn"
                type="button"
                onClick={onAllow}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer"
              >
                ALLOW
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
