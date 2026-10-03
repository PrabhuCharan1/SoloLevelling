import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Sparkles,
  Gift,
  CheckCircle2,
  Tv,
  Gamepad2,
  Headphones,
  Utensils,
  Coffee,
  Film,
  Compass,
  Moon,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { AppRoute } from '../types.ts';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { SystemHeader } from '../components/SystemHeader.tsx';
import { SystemCard } from '../components/SystemCard.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { systemSound } from '../utils/soundEffects.ts';

interface RewardScreenProps {
  onNavigate: (route: AppRoute) => void;
  onBack?: () => void;
}

// Icon dictionary for safely mapping revealed rewards
const REWARD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Tv,
  Gamepad2,
  Headphones,
  Utensils,
  Coffee,
  Film,
  Sparkles,
  Compass,
  Moon,
  ShieldCheck,
  BookOpen,
  CupSoda: Coffee,
  Gift,
};

export const RewardScreen: React.FC<RewardScreenProps> = ({ onNavigate, onBack }) => {
  const {
    todayFormatted,
    progressPercent,
    completedCount,
    totalCount,
    dailyReward,
    isRewardReady,
    isRewardRevealed,
    revealDailyRewardAction,
  } = useQuestSystem();

  // Revealing animation sequence state (Requirement 4 & 16)
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealStep, setRevealStep] = useState<'system' | 'decrypting' | 'complete'>('system');

  const handleRevealClick = async () => {
    if (!isRewardReady || dailyReward.revealed || isRevealing) return;

    // Start sequence
    setIsRevealing(true);
    setRevealStep('system');
    systemSound.playMysteryUnlock();

    // Step 2 after 800ms
    setTimeout(() => {
      setRevealStep('decrypting');
    }, 800);

    // Step 3 after 1800ms -> Commit reveal
    setTimeout(async () => {
      setRevealStep('complete');
      systemSound.playRewardReveal();
      await revealDailyRewardAction();
      setIsRevealing(false);
    }, 1800);
  };

  // Get mapped icon component for revealed state only
  const RevealedIcon = dailyReward.revealed
    ? REWARD_ICONS[dailyReward.iconName] || Gift
    : Lock;

  return (
    <div id="reward-screen-container" className="flex flex-col min-h-screen pb-24">
      <SystemHeader
        title="MYSTERY REWARD"
        subtitle="// SYSTEM VAULT PROTOCOL"
        date={todayFormatted}
        onBack={onBack || (() => onNavigate('/home'))}
        onProfileClick={() => onNavigate('/stats')}
      />

      <div className="p-4 space-y-4 flex-1 flex flex-col justify-start">
        {/* Progress Tracker Card */}
        <SystemCard
          id="reward-progress-card"
          glow={progressPercent === 100 ? 'cyan' : 'purple'}
          className="p-3.5 bg-gradient-to-r from-[#0d1024]/90 to-[#070b18]/90"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-hud text-xs font-bold text-slate-300 tracking-wider uppercase">
              DAILY PROTOCOL STATUS
            </span>
            <span
              id="reward-progress-count"
              className={`font-hud text-xs font-bold ${
                progressPercent === 100 ? 'text-cyan-300' : 'text-purple-300'
              }`}
            >
              {completedCount} / {totalCount} CLEARED ({progressPercent}%)
            </span>
          </div>
          <ProgressBar
            progress={progressPercent}
            size="md"
            glowColor={progressPercent === 100 ? 'cyan' : 'purple'}
          />

          <div className="mt-2 flex items-center justify-between text-[11px] font-hud text-slate-400">
            <span>
              {progressPercent === 100
                ? '✓ 100% PROTOCOLS COMPLETE'
                : `${totalCount - completedCount} MORE QUESTS NEEDED`}
            </span>
            {progressPercent < 100 && (
              <button
                type="button"
                onClick={() => onNavigate('/quests')}
                className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer flex items-center gap-1"
              >
                <span>OPEN QUESTS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </SystemCard>

        {/* Central Mystery Vault Container */}
        <div className="relative my-auto py-2">
          {/* Futuristic Revealing Animation Overlay (Requirement 4) */}
          <AnimatePresence>
            {isRevealing && (
              <motion.div
                key="revealing-overlay"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#070914]/95 border border-cyan-400 shadow-[0_0_50px_rgba(0,240,255,0.4)] backdrop-blur-md text-center"
              >
                <div className="relative mb-6">
                  {/* Rotating energy rings */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="w-28 h-28 rounded-full border-2 border-dashed border-cyan-400/60"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-2 rounded-full border-2 border-purple-500/70"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-cyan-300 animate-pulse" />
                  </div>
                </div>

                {revealStep === 'system' ? (
                  <motion.div
                    key="step-system"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5"
                  >
                    <span className="font-hud text-xs font-bold text-cyan-400 tracking-[0.25em] uppercase">
                      SYSTEM DIRECTIVE
                    </span>
                    <h3 className="font-display text-2xl font-black text-white system-text-glow">
                      QUEST COMPLETE
                    </h3>
                    <p className="font-hud text-xs text-slate-400">
                      INITIALIZING REWARD DECRYPTION...
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-decrypting"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5"
                  >
                    <span className="font-hud text-xs font-bold text-purple-400 tracking-[0.25em] uppercase">
                      MATRIX UNSEALED
                    </span>
                    <h3 className="font-display text-2xl font-black text-cyan-200 system-text-glow">
                      UNLOCKING REWARD...
                    </h3>
                    <p className="font-hud text-xs text-cyan-400/80 animate-pulse">
                      ACCESS AUTHORIZED // DISPENSING PRIVILEGE
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN CARD: STATE 1 (LOCKED) vs STATE 2 (READY) vs STATE 4/5 (REVEALED/CLAIMED) */}
          <SystemCard
            id="reward-main-vault-card"
            glow={
              dailyReward.revealed
                ? 'cyan'
                : isRewardReady
                ? 'cyan'
                : 'purple'
            }
            className={`p-6 flex flex-col items-center text-center transition-all duration-300 ${
              dailyReward.revealed
                ? 'bg-gradient-to-b from-[#0e172e]/95 via-[#090e1f]/95 to-[#04060e] border-cyan-400/70 shadow-[0_0_35px_rgba(0,240,255,0.25)]'
                : isRewardReady
                ? 'bg-gradient-to-b from-[#131230]/95 via-[#0c0f24]/95 to-[#060815] border-cyan-400/60 shadow-[0_0_30px_rgba(0,240,255,0.2)]'
                : 'bg-gradient-to-b from-[#120e26]/90 via-[#0a0d1e]/90 to-[#04060d] border-purple-500/40'
            }`}
          >
            {/* Vault Visual Asset */}
            {!dailyReward.revealed ? (
              <div className="relative mb-5">
                {/* Outer Glow Halo */}
                <div
                  className={`w-32 h-32 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                    isRewardReady
                      ? 'bg-gradient-to-br from-cyan-950/60 to-purple-950/60 border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.4)] animate-pulse'
                      : 'bg-[#0b0c1c] border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                  }`}
                >
                  {isRewardReady ? (
                    <div className="flex flex-col items-center">
                      <span className="font-display text-4xl font-black text-cyan-300 tracking-wider system-text-glow">
                        ???
                      </span>
                      <Sparkles className="w-4 h-4 text-purple-400 mt-1 animate-bounce" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Lock className="w-12 h-12 text-purple-400 stroke-[1.8] mb-1" />
                      <span className="font-hud text-[10px] tracking-widest text-purple-300/70 uppercase">
                        SEALED
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Revealed State Icon */
              <div className="relative mb-5">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-gradient-to-br from-cyan-950/80 to-purple-950/80 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                  <RevealedIcon className="w-12 h-12 stroke-[1.8]" />
                </div>
              </div>
            )}

            {/* STATE 1: LOCKED (Requirement 1 & 8) */}
            {!dailyReward.revealed && !isRewardReady && (
              <div id="reward-state-locked" className="space-y-3 w-full">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 font-hud text-xs font-bold tracking-widest uppercase">
                  <Lock className="w-3.5 h-3.5" />
                  <span>REWARD LOCKED</span>
                </div>

                <h2 className="font-display text-2xl font-black text-white tracking-wider uppercase">
                  MYSTERY REWARD
                </h2>

                <p className="font-sans text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Complete today's quests to unlock.
                </p>

                {/* Requirements breakdown */}
                <div className="p-3.5 rounded-xl bg-[#060814]/80 border border-slate-800 text-left space-y-2 mt-4">
                  <div className="flex items-center justify-between text-xs font-hud">
                    <span className="text-slate-400">UNLOCK REQUIREMENT:</span>
                    <span className="text-purple-300 font-bold">100% DAILY PROGRESS</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-hud">
                    <span className="text-slate-400">CURRENT STATUS:</span>
                    <span className="text-cyan-400 font-bold">
                      {completedCount} OF {totalCount} CLEARED
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('/quests')}
                  className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-950 to-slate-900 border border-purple-500/50 text-purple-200 font-hud text-xs font-bold tracking-widest uppercase hover:border-purple-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>CLEAR REMAINING QUESTS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STATE 2: READY TO REVEAL (Requirement 3 & 8) */}
            {!dailyReward.revealed && isRewardReady && (
              <div id="reward-state-ready" className="space-y-3 w-full">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/70 text-cyan-300 font-hud text-xs font-bold tracking-widest uppercase shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ALL DAILY QUESTS COMPLETE</span>
                </div>

                <h2 className="font-display text-2xl font-black text-white tracking-wider uppercase system-text-glow">
                  MYSTERY REWARD READY
                </h2>

                <p className="font-sans text-sm text-cyan-200/80 max-w-xs mx-auto leading-relaxed">
                  All daily protocols have been executed. Tap below to decrypt today's mystery reward.
                </p>

                {/* Prominent Reveal Button (Requirement 3, 4, 17) */}
                <button
                  id="reveal-reward-btn"
                  type="button"
                  onClick={handleRevealClick}
                  disabled={isRevealing}
                  className="w-full mt-5 py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-hud text-sm font-black tracking-widest uppercase shadow-[0_0_25px_rgba(0,240,255,0.6)] hover:shadow-[0_0_35px_rgba(0,240,255,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 border border-cyan-300"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200 animate-spin" />
                  <span>REVEAL REWARD</span>
                </button>
              </div>
            )}

            {/* STATE 4 & 5: REVEALED / CLAIMED (Requirement 7, 8, 16) */}
            {dailyReward.revealed && (
              <div id="reward-state-revealed" className="space-y-3.5 w-full">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/80 text-cyan-300 font-hud text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,240,255,0.35)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>REWARD UNLOCKED</span>
                </div>

                {/* Reward Name */}
                <h2
                  id="revealed-reward-name"
                  className="font-display text-2xl sm:text-3xl font-black text-white tracking-wide system-text-glow"
                >
                  {dailyReward.rewardName}
                </h2>

                {/* Tagline / System Category */}
                <div className="text-[11px] font-hud font-bold tracking-widest text-cyan-300 uppercase">
                  {dailyReward.tagline || `${dailyReward.category.toUpperCase()} PROTOCOL`}
                </div>

                {/* Description and Hunter Lore */}
                <div className="p-4 rounded-xl bg-[#060816]/80 border border-cyan-500/30 text-left space-y-2 mt-2">
                  <p className="font-sans text-sm text-slate-200 leading-relaxed">
                    {dailyReward.description}
                  </p>
                  {dailyReward.lore && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-cyan-400/80 italic">
                      "{dailyReward.lore}"
                    </div>
                  )}
                </div>

                {/* Claimed Status Badge */}
                <div
                  id="reward-claimed-badge"
                  className="mt-4 py-3 px-4 rounded-xl bg-[#071324] border border-cyan-400/60 text-cyan-300 font-hud text-xs font-extrabold tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>REWARD CLAIMED ✓</span>
                </div>

                <p className="font-hud text-[11px] text-slate-400 tracking-wide mt-1">
                  1 of 1 mystery rewards claimed for {todayFormatted}.
                </p>
              </div>
            )}
          </SystemCard>
        </div>

        {/* Back to Home Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigate('/home')}
            className="w-full py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 font-hud text-xs font-bold tracking-wider hover:text-white hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
            <span>RETURN TO SYSTEM HUB</span>
          </button>
        </div>
      </div>
    </div>
  );
};
