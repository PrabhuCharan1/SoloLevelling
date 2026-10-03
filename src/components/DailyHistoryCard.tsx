import React from 'react';
import { Dumbbell, Droplets, Trophy, Zap, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';
import { DaySummary } from '../types.ts';
import { SystemCard } from './SystemCard.tsx';
import { ProgressBar } from './ProgressBar.tsx';

interface DailyHistoryCardProps {
  summary: DaySummary;
  onClick?: () => void;
  className?: string;
}

export const DailyHistoryCard: React.FC<DailyHistoryCardProps> = ({
  summary,
  onClick,
  className = '',
}) => {
  const is100 = summary.progressPercent === 100;
  const isPartial = summary.progressPercent > 0 && !is100;

  return (
    <SystemCard
      id={`history-card-${summary.date}`}
      clickable={Boolean(onClick)}
      onClick={onClick}
      glow={is100 ? 'cyan' : isPartial ? 'purple' : undefined}
      className={`p-3.5 transition-all duration-200 group ${
        is100
          ? 'bg-gradient-to-r from-[#0a1526]/95 via-[#08101e]/90 to-[#040812] border-cyan-500/40 hover:border-cyan-400'
          : isPartial
          ? 'bg-gradient-to-r from-[#140f28]/95 via-[#0c0d1e]/90 to-[#060814] border-purple-500/40 hover:border-purple-400'
          : 'bg-[#060812]/90 border-slate-800/80 hover:border-slate-700'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        {/* Date and Completion Badge */}
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-black text-white tracking-wider">
            {summary.displayMonthDay}
          </span>
          <span
            className={`font-hud text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
              is100
                ? 'bg-cyan-950/70 border-cyan-400/60 text-cyan-300'
                : isPartial
                ? 'bg-purple-950/70 border-purple-500/50 text-purple-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {summary.progressPercent}% COMPLETE
          </span>
        </div>

        {/* XP Earned */}
        <div className="flex items-center gap-1 font-hud text-xs font-bold text-cyan-300">
          <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
          <span>+{summary.xpEarned} XP</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2.5">
        <ProgressBar
          progress={summary.progressPercent}
          size="sm"
          glowColor={is100 ? 'cyan' : 'purple'}
        />
      </div>

      {/* Status Chips Row */}
      <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-hud border-t border-slate-800/60">
        {/* Workout Status */}
        <div
          className={`flex items-center gap-1 px-1.5 py-1 rounded bg-[#060813] border truncate ${
            summary.workout.completed
              ? 'border-cyan-500/40 text-cyan-300'
              : summary.workout.isRestDay
              ? 'border-slate-800 text-slate-400'
              : 'border-slate-800 text-slate-500'
          }`}
        >
          <Dumbbell className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {summary.workout.isRestDay
              ? 'REST DAY'
              : summary.workout.completed
              ? 'WORKOUT ✓'
              : `${summary.workout.completedCount}/${summary.workout.totalCount}`}
          </span>
        </div>

        {/* Water Status */}
        <div
          className={`flex items-center gap-1 px-1.5 py-1 rounded bg-[#060813] border truncate ${
            summary.water.isTargetReached
              ? 'border-cyan-500/40 text-cyan-300'
              : summary.water.consumedMl > 0
              ? 'border-purple-500/30 text-purple-300'
              : 'border-slate-800 text-slate-500'
          }`}
        >
          <Droplets className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {summary.water.consumedLiters} / {summary.water.targetLiters} L
            {summary.water.isTargetReached ? ' ✓' : ''}
          </span>
        </div>

        {/* Reward Status */}
        <div
          className={`flex items-center gap-1 px-1.5 py-1 rounded bg-[#060813] border truncate ${
            summary.reward.revealed
              ? 'border-cyan-500/40 text-cyan-300'
              : summary.is100Percent
              ? 'border-purple-500/30 text-purple-300'
              : 'border-slate-800 text-slate-500'
          }`}
        >
          {summary.reward.revealed ? (
            <CheckCircle2 className="w-3 h-3 shrink-0 text-cyan-400" />
          ) : summary.is100Percent ? (
            <Trophy className="w-3 h-3 shrink-0 text-purple-400" />
          ) : (
            <Lock className="w-3 h-3 shrink-0 text-slate-500" />
          )}
          <span className="truncate">
            {summary.reward.revealed
              ? 'REWARD ✓'
              : summary.is100Percent
              ? 'READY'
              : 'LOCKED'}
          </span>
        </div>
      </div>

      {onClick && (
        <div className="mt-2 pt-1 flex items-center justify-end text-[10px] font-hud text-slate-500 group-hover:text-cyan-400 transition-colors">
          <span>VIEW BREAKDOWN</span>
          <ChevronRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </SystemCard>
  );
};
