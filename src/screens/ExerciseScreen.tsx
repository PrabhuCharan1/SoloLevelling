import React from 'react';
import { Check, Dumbbell, Minus, Plus } from 'lucide-react';
import { SystemHeader } from '../components/SystemHeader.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { AppRoute } from '../types.ts';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';

interface ExerciseScreenProps {
  onNavigate: (route: AppRoute) => void;
}

export const ExerciseScreen: React.FC<ExerciseScreenProps> = ({ onNavigate }) => {
  const {
    activeMuscleGroup,
    exerciseStates,
    toggleExercise,
    updateExerciseWeight,
    updateExerciseReps,
    getGroupStats,
  } = useWorkoutSystem();

  if (!activeMuscleGroup) {
    return (
      <div className="relative min-h-screen p-4 text-center select-none flex flex-col items-center justify-center">
        <p className="font-hud text-sm text-slate-400">NO MUSCLE GROUP SELECTED</p>
        <button
          onClick={() => onNavigate('/workout')}
          className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 text-white font-hud text-xs font-bold"
        >
          RETURN TO WORKOUT
        </button>
      </div>
    );
  }

  const groupStats = getGroupStats(activeMuscleGroup);
  const isPurple = activeMuscleGroup.color === 'purple';

  return (
    <div className="relative min-h-screen pb-24 select-none">
      {/* Ambient background glow */}
      <div
        className={`absolute top-12 left-1/2 -translate-x-1/2 w-80 h-72 rounded-full blur-[90px] pointer-events-none ${
          isPurple ? 'bg-purple-600/15' : 'bg-cyan-600/15'
        }`}
      />

      {/* Screen Header with Back Navigation */}
      <SystemHeader
        variant="subscreen"
        title={activeMuscleGroup.name}
        subtitle={`${groupStats.completed} / ${groupStats.total} COMPLETED (${groupStats.percent}%)`}
        onNavigate={onNavigate}
        onBack={() => onNavigate('/workout')}
      />

      <div className="p-4 space-y-4">
        {/* Progress Bar Header Card */}
        <div className="p-4 rounded-xl bg-[#080d1e]/90 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-cyan-400" />
              <span className="font-hud text-xs font-bold tracking-widest text-slate-300 uppercase">
                {activeMuscleGroup.name} DRILLS
              </span>
            </div>
            <span
              id="group-progress-counter"
              className="font-hud text-xs font-bold text-cyan-300 tracking-wider"
            >
              {groupStats.completed} / {groupStats.total} COMPLETED
            </span>
          </div>
          <ProgressBar
            progress={groupStats.percent}
            size="sm"
            glowColor={isPurple ? 'purple' : 'cyan'}
          />
        </div>

        {/* Exercise Cards List */}
        <div className="space-y-3">
          {activeMuscleGroup.exercises.map((ex) => {
            const state = exerciseStates[ex.id] || {
              completed: false,
              weight: ex.defaultWeight,
              reps: ex.defaultReps,
            };
            const isDone = state.completed;
            const step = ex.weightStep || 2.5;

            return (
              <div
                key={ex.id}
                id={`exercise-card-${ex.id}`}
                className={`relative rounded-xl p-4 border transition-all duration-200 ${
                  isDone
                    ? 'bg-[#08121d]/90 border-cyan-400/60 shadow-[0_0_18px_rgba(0,240,255,0.2)]'
                    : isPurple
                    ? 'bg-[#0c0e22]/90 border-purple-500/30 hover:border-purple-400/50'
                    : 'bg-[#080d1e]/90 border-cyan-500/30 hover:border-cyan-400/50'
                }`}
              >
                {/* Top Row: Checkbox + Name + Sets x Reps */}
                <div
                  onClick={() => toggleExercise(ex.id)}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Interactive Checkbox (☐ → ☑) */}
                    <button
                      type="button"
                      id={`checkbox-${ex.id}`}
                      role="checkbox"
                      aria-checked={isDone}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExercise(ex.id);
                      }}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
                        isDone
                          ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.7)]'
                          : 'border-slate-600 bg-[#060914] hover:border-cyan-400'
                      }`}
                    >
                      {isDone && <Check className="w-4 h-4 text-[#05070e] stroke-[3.5]" />}
                    </button>

                    <div className="min-w-0">
                      <h3
                        className={`font-display text-base font-bold tracking-wide transition-colors ${
                          isDone ? 'text-slate-300 line-through' : 'text-white'
                        }`}
                      >
                        {ex.name}
                      </h3>
                      <span className="font-hud text-xs font-semibold text-slate-400 tracking-wider">
                        {ex.setsReps}
                      </span>
                    </div>
                  </div>

                  {isDone && (
                    <span className="font-hud text-[10px] font-bold text-cyan-300 border border-cyan-400/40 px-2 py-0.5 rounded bg-cyan-950/60 uppercase shrink-0">
                      DONE
                    </span>
                  )}
                </div>

                {/* Bottom Row: Weight Tracking & Reps Tracking Controls (Requirements 6 & 7) */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3">
                  {/* WEIGHT CONTROL */}
                  <div className="p-2 rounded-lg bg-[#060814] border border-slate-800/90 flex flex-col justify-between">
                    <span className="font-hud text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      WEIGHT
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        id={`weight-minus-${ex.id}`}
                        onClick={() => updateExerciseWeight(ex.id, Math.max(0, state.weight - step))}
                        className="w-7 h-7 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center justify-center gap-0.5 min-w-0 flex-1 px-1">
                        <input
                          type="number"
                          id={`weight-input-${ex.id}`}
                          value={state.weight}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateExerciseWeight(ex.id, isNaN(val) ? 0 : val);
                          }}
                          className="w-12 bg-transparent text-center font-hud text-sm font-bold text-white focus:outline-none focus:text-cyan-300"
                        />
                        <span className="font-hud text-[11px] text-slate-400">kg</span>
                      </div>

                      <button
                        type="button"
                        id={`weight-plus-${ex.id}`}
                        onClick={() => updateExerciseWeight(ex.id, state.weight + step)}
                        className="w-7 h-7 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* REPS CONTROL */}
                  <div className="p-2 rounded-lg bg-[#060814] border border-slate-800/90 flex flex-col justify-between">
                    <span className="font-hud text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      REPS
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        id={`reps-minus-${ex.id}`}
                        onClick={() => updateExerciseReps(ex.id, Math.max(1, state.reps - 1))}
                        className="w-7 h-7 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center justify-center gap-0.5 min-w-0 flex-1 px-1">
                        <input
                          type="number"
                          id={`reps-input-${ex.id}`}
                          value={state.reps}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            updateExerciseReps(ex.id, isNaN(val) ? 1 : val);
                          }}
                          className="w-12 bg-transparent text-center font-hud text-sm font-bold text-white focus:outline-none focus:text-cyan-300"
                        />
                      </div>

                      <button
                        type="button"
                        id={`reps-plus-${ex.id}`}
                        onClick={() => updateExerciseReps(ex.id, state.reps + 1)}
                        className="w-7 h-7 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
