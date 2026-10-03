import React from 'react';
import { Dumbbell, Edit3, Trash2, CheckCircle2, Play, Zap, Calendar } from 'lucide-react';
import { CustomWorkout } from '../types.ts';
import { formatScheduleDays } from '../utils/customWorkoutStorage.ts';
import { ProgressBar } from './ProgressBar.tsx';

interface CustomWorkoutCardProps {
  workout: CustomWorkout;
  isCompletedToday: boolean;
  progress: {
    completedCount: number;
    totalCount: number;
    percent: number;
    isComplete: boolean;
  };
  onStart: (workout: CustomWorkout) => void;
  onEdit: (workout: CustomWorkout) => void;
  onDelete: (workout: CustomWorkout) => void;
}

export const CustomWorkoutCard: React.FC<CustomWorkoutCardProps> = ({
  workout,
  isCompletedToday,
  progress,
  onStart,
  onEdit,
  onDelete,
}) => {
  const isDone = isCompletedToday || progress.isComplete;
  const daysFormatted = formatScheduleDays(workout.schedule);

  return (
    <div
      id={`custom-workout-${workout.id}`}
      className={`group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 select-none ${
        isDone
          ? 'bg-gradient-to-br from-[#091a24] via-[#091422] to-[#070d18] border-cyan-400 shadow-[0_0_20px_-4px_rgba(0,240,255,0.3)]'
          : 'bg-gradient-to-br from-[#0c1830]/90 via-[#0a0d1e]/90 to-[#070a16] border-cyan-500/35 hover:border-cyan-400/60 shadow-[0_0_20px_-4px_rgba(0,240,255,0.2)] hover:shadow-[0_0_28px_rgba(0,240,255,0.35)]'
      }`}
    >
      {/* Energy glow in corner */}
      <div
        className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 ${
          isDone ? 'bg-cyan-500/20' : 'bg-purple-600/15 group-hover:bg-cyan-500/20'
        }`}
      />

      {/* Futuristic Corner Brackets */}
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 rounded-tl-sm pointer-events-none" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-400 rounded-br-sm pointer-events-none" />

      {/* Card Header: Category & XP Badge */}
      <div className="relative z-10 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block text-[9px] font-hud font-extrabold tracking-widest uppercase px-2 py-0.5 rounded border ${
              isDone
                ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300'
                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
            }`}
          >
            {workout.category}
          </span>
          <span className="font-hud text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span className="truncate max-w-[130px] sm:max-w-[200px]">{daysFormatted}</span>
          </span>
        </div>

        {/* XP Reward Badge */}
        <span className="font-hud text-xs font-bold text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
          <Zap className="w-3 h-3 text-purple-400" />
          +{workout.xpReward} XP
        </span>
      </div>

      {/* Card Title & Icon */}
      <div className="relative z-10 flex items-center gap-3.5 mb-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 shrink-0 ${
            isDone
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
              : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]'
          }`}
        >
          {isDone ? (
            <CheckCircle2 className="w-6 h-6 text-cyan-300" />
          ) : (
            <Dumbbell className="w-6 h-6 stroke-[2]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg sm:text-xl font-black text-white tracking-wider truncate uppercase group-hover:text-cyan-200 transition-colors">
            {workout.name}
          </h3>
          <p className="font-hud text-xs text-slate-400 tracking-wider">
            {workout.exercises.length} {workout.exercises.length === 1 ? 'EXERCISE' : 'EXERCISES'}
            {isDone ? (
              <span className="text-cyan-400 font-bold ml-2">✓ CLEARED TODAY</span>
            ) : progress.completedCount > 0 ? (
              <span className="text-cyan-300 ml-2">
                · {progress.completedCount} / {progress.totalCount} DONE ({progress.percent}%)
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Progress Bar if partially completed */}
      {!isDone && progress.totalCount > 0 && (
        <div className="mb-3">
          <ProgressBar progress={progress.percent} size="sm" glowColor="cyan" />
        </div>
      )}

      {/* Action Buttons: [START] [EDIT] [DELETE] */}
      <div className="relative z-10 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => onStart(workout)}
          className={`flex-1 py-2 px-3 rounded-xl font-hud text-xs font-black tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isDone
              ? 'bg-cyan-950/60 border border-cyan-400/60 text-cyan-300 hover:bg-cyan-900/60'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_14px_rgba(0,240,255,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] active:scale-[0.98]'
          }`}
        >
          {isDone ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>COMPLETED</span>
            </>
          ) : progress.completedCount > 0 ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onEdit(workout)}
          title="Edit workout"
          aria-label={`Edit ${workout.name}`}
          className="py-2 px-3 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-950/40 font-hud text-xs font-bold tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>EDIT</span>
        </button>

        <button
          type="button"
          onClick={() => onDelete(workout)}
          title="Delete custom workout"
          aria-label={`Delete ${workout.name}`}
          className="py-2 px-3 rounded-xl border border-red-900/40 bg-red-950/20 text-red-400 hover:text-red-300 hover:border-red-500 hover:bg-red-950/40 font-hud text-xs font-bold tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>DELETE</span>
        </button>
      </div>
    </div>
  );
};
