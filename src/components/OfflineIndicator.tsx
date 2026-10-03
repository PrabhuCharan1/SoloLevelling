import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  onlineStatusChanged: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline, onlineStatusChanged }) => {
  // Show if offline, OR if connection recently transitioned back to online
  const shouldShow = !isOnline || (isOnline && onlineStatusChanged);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.aside
          aria-label="Network status indicator"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        >
          {!isOnline ? (
            <div
              id="offline-mode-pill"
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d121f]/95 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)] text-amber-300 text-[11px] font-mono tracking-wider backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">OFFLINE MODE</span>
              <span className="text-[9px] text-amber-400/70 border-l border-amber-500/30 pl-1.5">LOCAL TELEMETRY</span>
            </div>
          ) : (
            <div
              id="system-online-pill"
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#061822]/95 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.25)] text-cyan-300 text-[11px] font-mono tracking-wider backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">SYSTEM ONLINE</span>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
