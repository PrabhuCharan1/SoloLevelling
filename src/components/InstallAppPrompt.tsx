import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Share2, PlusSquare } from 'lucide-react';

interface InstallAppPromptProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isDismissed: boolean;
  onInstall: () => Promise<boolean>;
  onDismiss: () => void;
}

export const InstallAppPrompt: React.FC<InstallAppPromptProps> = ({
  isInstallable,
  isInstalled,
  isIOS,
  isDismissed,
  onInstall,
  onDismiss,
}) => {
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed or dismissed, do NOT show the prompt
  if (isInstalled || isDismissed) {
    return null;
  }

  // Show if browser fired beforeinstallprompt (Android / Chrome / Desktop) OR on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    setIsInstalling(true);
    await onInstall();
    setIsInstalling(false);
  };

  return (
    <>
      <motion.aside
        aria-label="Install application banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25 }}
        className="w-full px-4 mb-3"
      >
        <div
          id="install-questlife-card"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#081226]/95 via-[#0b1530]/95 to-[#120b2e]/95 border border-cyan-500/40 p-4 shadow-[0_0_25px_rgba(6,182,212,0.15)] backdrop-blur-md"
        >
          {/* Subtle tech background lines */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 flex-shrink-0 shadow-[0_0_12px_rgba(0,240,255,0.4)] flex items-center justify-center">
                <img
                  src="/pwa-192x192.png"
                  alt="QuestLife Icon"
                  className="w-full h-full rounded-[10px] object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono tracking-widest text-cyan-400 uppercase bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    PWA STANDALONE
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono tracking-wider mt-1">
                  INSTALL QUESTLIFE
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Turn your daily routine into a game.
                </p>
              </div>
            </div>

            <button
              id="dismiss-install-card-btn"
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              aria-label="Dismiss installation prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative z-10 flex items-center justify-end gap-2 mt-3.5 pt-2.5 border-t border-slate-800/80">
            <button
              id="install-not-now-btn"
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
            >
              NOT NOW
            </button>
            <button
              id="install-questlife-action-btn"
              type="button"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'INSTALLING...' : 'INSTALL'}</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* iOS Installation Instruction Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-[#090d1c] border border-cyan-500/40 p-5 shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-mono font-bold text-white tracking-wider">
                    INSTALL ON IOS SAFARI
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <Share2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Step 1:</span>
                    Tap the <strong className="text-cyan-300">Share</strong> button in the Safari navigation bar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <PlusSquare className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Step 2:</span>
                    Scroll down and select <strong className="text-purple-300">Add to Home Screen</strong>.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowIOSModal(false);
                  onDismiss();
                }}
                className="mt-5 w-full py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold tracking-wider hover:bg-cyan-900/60 transition-colors"
              >
                GOT IT
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
