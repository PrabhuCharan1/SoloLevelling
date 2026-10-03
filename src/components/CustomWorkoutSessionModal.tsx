import React from 'react';
import { X, CheckCircle2, Dumbbell, Zap, Clock, FileText, Check } from 'lucide-react';
import { CustomWorkout } from '../types.ts';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';
import { ProgressBar } from './ProgressBar.tsx';

interface CustomWorkoutSessionModalProps {
  workout: CustomWorkout | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomWorkoutSessionModal: React.FC<CustomWorkoutSessionModalProps> = ({
  workout,
  isOpen,
  onClose,
}) => {
  const {
    customWorkoutDaily,
    toggleCustomExercise,
    setCustomWorkoutCompleted,
    isCustomWorkoutCompleted,
    getCustomWorkoutProgress,
  } = useWorkoutSystem();

  if (!isOpen || !workout) return null;

  const isDone = isCustomWorkoutCompleted(workout.id);
  const progress = getCustomWorkoutProgress(workout);

  const handleToggleExercise = (exerciseId: string) => {
    toggleCustomExercise(workout.id, exerciseId);
  };

  const handleToggleCompleteAll = () => {
    setCustomWorkoutCompleted(workout.id, !isDone);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-workout-title"
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-[#080d1e]/95 border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.25)] text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Futuristic Corner Brackets */}
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-10" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-400 pointer-events-none z-10" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-400 pointer-events-none z-10" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cyan-900/50 bg-[#091124]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-hud text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">
                  {workout.category} PROTOCOL
                </span>
                <span className="font-hud text-xs font-bold text-purple-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" />
                  +{workout.xpReward} XP
                </span>
              </div>
              <h2 id="session-workout-title" className="font-display text-lg sm:text-xl font-black text-white tracking-wider uppercase">
                {workout.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close session"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-950/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Card */}
        <div className="p-4 bg-[#090e20] border-b border-cyan-950/80 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-hud text-xs font-bold tracking-wider text-slate-300 uppercase">
              SESSION PROGRESS
            </span>
            <span className="font-hud text-xs font-bold text-cyan-300">
              {progress.completedCount} / {progress.totalCount} COMPLETED ({progress.percent}%)
            </span>
          </div>
          <ProgressBar progress={progress.percent} size="md" glowColor="cyan" />
        </div>

        {/* Exercise Checklist Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <p className="font-hud text-[11px] text-slate-400 uppercase tracking-wider">
            DRILLS & EXERCISES · TAP TO LOG COMPLETION
          </p>

          {workout.exercises.map((ex, index) => {
            const isExerciseDone = Boolean(customWorkoutDaily.exerciseStates[ex.id]?.completed);

            return (
              <div
                key={ex.id || index}
                onClick={() => handleToggleExercise(ex.id)}
                className={`relative rounded-xl p-4 border transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
                  isExerciseDone
                    ? 'bg-[#08121d]/90 border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'bg-[#060a16] border-cyan-950 hover:border-cyan-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-hud text-[10px] font-extrabold text-cyan-400 tracking-wider">
                        #{index + 1}
                      </span>
                      <h4
                        className={`font-display text-base font-bold tracking-wider transition-colors ${
                          isExerciseDone ? 'text-cyan-200 line-through opacity-85' : 'text-white'
                        }`}
                      >
                        {ex.name}
                      </h4>
                    </div>

                    {/* Sets & Reps */}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-hud text-slate-300 mt-1">
                      <span className="text-cyan-300 font-bold">
                        {ex.sets} SETS × {ex.reps} REPS
                      </span>

                      {ex.duration && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {ex.duration}
                        </span>
                      )}
                    </div>

                    {/* Notes if any */}
                    {ex.notes && (
                      <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1 font-sans italic">
                        <FileText className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                        {ex.notes}
                      </p>
                    )}
                  </div>

                  {/* Checkbox Button */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all shrink-0 mt-0.5 ${
                      isExerciseDone
                        ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_12px_rgba(0,240,255,0.6)]'
                        : 'border-slate-700 bg-slate-900/80 text-transparent hover:border-cyan-400'
                    }`}
                  >
                    <Check className={`w-5 h-5 stroke-[3] ${isExerciseDone ? 'block' : 'hidden'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-cyan-950/80 bg-[#091124]/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleToggleCompleteAll}
            className={`py-2.5 px-4 rounded-xl font-hud text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
              isDone
                ? 'border-purple-500/50 bg-purple-950/40 text-purple-300 hover:bg-purple-900/40'
                : 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40'
            }`}
          >
            {isDone ? 'UNMARK WORKOUT' : 'MARK ALL CLEARED'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-hud text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_22px_rgba(0,240,255,0.6)] active:scale-[0.98] transition-all cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
