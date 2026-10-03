import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  CheckCircle2,
  Zap,
  Dumbbell,
  Droplets,
  Trophy,
  Lock,
  Sparkles,
  Flame,
} from 'lucide-react';
import { DaySummary } from '../types.ts';
import { ProgressBar } from './ProgressBar.tsx';

interface DateDetailModalProps {
  summary: DaySummary | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DateDetailModal: React.FC<DateDetailModalProps> = ({
  summary,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !summary) return null;

  const hasData = summary.hasActivity || summary.completedCount > 0;
  const is100 = summary.progressPercent === 100;

  return (
    <AnimatePresence>
      <div
        id="date-detail-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          id="date-detail-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#0c1228] via-[#080d1e] to-[#04060f] border border-cyan-500/50 shadow-[0_0_40px_rgba(0,240,255,0.25)] p-5 text-slate-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-hud text-[10px] text-cyan-400 font-bold tracking-widest uppercase block">
                  TEMPORAL LOG
                </span>
                <h3 className="font-display text-base font-black text-white tracking-wider">
                  {summary.dateFormatted}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!hasData ? (
            /* Empty State (Requirement 6 & 18) */
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-slate-900/80 border border-slate-800 text-slate-500">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="font-display text-sm font-bold text-slate-300 tracking-wider uppercase">
                NO QUEST DATA
              </h4>
              <p className="font-sans text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                No daily protocols were logged on this date.
              </p>
            </div>
          ) : (
            /* Populated Day Details */
            <div className="space-y-3.5 font-hud">
              {/* Daily Progress Gauge */}
              <div className="p-3 rounded-xl bg-[#060814]/90 border border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-bold tracking-wider">DAILY PROGRESS</span>
                  <span
                    className={`font-black ${
                      is100 ? 'text-cyan-300 system-text-glow' : 'text-purple-300'
                    }`}
                  >
                    {summary.progressPercent}%
                  </span>
                </div>
                <ProgressBar
                  progress={summary.progressPercent}
                  size="md"
                  glowColor={is100 ? 'cyan' : 'purple'}
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>QUESTS CLEARED</span>
                  <span className="text-white font-bold">
                    {summary.completedCount} / {summary.totalCount}
                  </span>
                </div>
              </div>

              {/* XP Earned */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#060814]/90 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-400 font-bold tracking-wider">XP EARNED</span>
                </div>
                <span className="text-cyan-300 font-black text-sm">+{summary.xpEarned} XP</span>
              </div>

              {/* Workout Details */}
              <div className="p-3 rounded-xl bg-[#060814]/90 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-400 font-bold tracking-wider">WORKOUT</span>
                  </div>
                  <span
                    className={`font-bold ${
                      summary.workout.completed
                        ? 'text-cyan-300'
                        : summary.workout.isRestDay
                        ? 'text-slate-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {summary.workout.isRestDay
                      ? 'REST DAY'
                      : summary.workout.completed
                      ? 'COMPLETED ✓'
                      : 'NOT COMPLETED'}
                  </span>
                </div>
                {!summary.workout.isRestDay && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="truncate pr-2">{summary.workout.title}</span>
                    <span className="font-bold text-white shrink-0">
                      {summary.workout.completedCount} / {summary.workout.totalCount} EXERCISES
                    </span>
                  </div>
                )}
              </div>

              {/* Water Details */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#060814]/90 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-400 font-bold tracking-wider">WATER TARGET</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${
                      summary.water.isTargetReached ? 'text-cyan-300' : 'text-slate-200'
                    }`}
                  >
                    {summary.water.consumedLiters} / {summary.water.targetLiters} L
                  </span>
                  {summary.water.isTargetReached && (
                    <span className="ml-1 text-cyan-400 font-black">✓</span>
                  )}
                </div>
              </div>

              {/* Reward Status */}
              <div className="p-3 rounded-xl bg-[#060814]/90 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-400 font-bold tracking-wider">MYSTERY REWARD</span>
                  </div>
                  <span
                    className={`font-bold ${
                      summary.reward.revealed
                        ? 'text-cyan-300'
                        : is100
                        ? 'text-purple-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {summary.reward.revealed
                      ? 'CLAIMED ✓'
                      : is100
                      ? 'READY TO REVEAL'
                      : 'LOCKED'}
                  </span>
                </div>
                {summary.reward.revealed && summary.reward.name ? (
                  <div className="pt-1 text-[11px] text-cyan-200/90 font-sans font-medium border-t border-slate-800/60">
                    "{summary.reward.name}"
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-slate-500 font-hud tracking-wider border-t border-slate-800/60">
                    Reward remains hidden
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-hud text-xs font-bold tracking-wider hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              CLOSE RECORD
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
