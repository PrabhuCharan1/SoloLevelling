import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Flame } from 'lucide-react';

export interface XpNotificationItem {
  id: string;
  amount: number;
  title: string;
}

interface XpFeedbackToastProps {
  notifications: XpNotificationItem[];
  streakNotification: { visible: boolean; days: number } | null;
}

export const XpFeedbackToast: React.FC<XpFeedbackToastProps> = ({
  notifications,
  streakNotification,
}) => {
  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none select-none max-w-[280px]">
      {/* Streak increase animation */}
      <AnimatePresence>
        {streakNotification && streakNotification.visible && (
          <motion.div
            key="streak-toast"
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#1f1305] via-[#140c03] to-[#0a0701] border border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.4)] text-amber-200 font-hud"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-amber-400/90 font-bold uppercase">
                STREAK RECORDED
              </div>
              <div className="text-xs font-bold text-white tracking-wide">
                🔥 {streakNotification.days} DAYS CONSECUTIVE
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP gain notification */}
      <AnimatePresence>
        {notifications.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#091226]/90 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.35)] backdrop-blur-md"
          >
            <div className="w-6 h-6 rounded-md bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-300 shrink-0">
              <Zap className="w-3.5 h-3.5 fill-cyan-400" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="font-hud text-xs font-black text-cyan-300 tracking-wider">
                +{item.amount} XP
              </div>
              <div className="font-sans text-[10px] text-slate-300 truncate max-w-[170px]">
                {item.title}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
