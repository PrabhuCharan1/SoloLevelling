import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Dumbbell, Zap, Calendar, AlertCircle } from 'lucide-react';
import { CustomWorkout, CustomExercise, CustomWorkoutCategory } from '../types.ts';
import { VALID_CATEGORIES, DAY_SHORT_LABELS } from '../utils/customWorkoutStorage.ts';
import { audioManager } from '../utils/audioManager.ts';

interface CustomWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workoutData: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => void;
  initialWorkout?: CustomWorkout | null;
}

export const CustomWorkoutModal: React.FC<CustomWorkoutModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWorkout,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CustomWorkoutCategory>('Cardio');
  const [exercises, setExercises] = useState<CustomExercise[]>([
    { id: 'ex_1', name: '', sets: 3, reps: 10, duration: '', notes: '' },
  ]);
  const [schedule, setSchedule] = useState<number[]>([1, 3, 5]); // Default Mon, Wed, Fri
  const [xpReward, setXpReward] = useState<number>(25);
  const [scheduleMode, setScheduleMode] = useState<'custom' | 'everyday'>('custom');

  // Inline Validation Errors
  const [errors, setErrors] = useState<{
    name?: string;
    exercises?: string;
    exerciseItems?: Record<number, string>;
    schedule?: string;
    xpReward?: string;
  }>({});

  // Reset or initialize form on open
  useEffect(() => {
    if (isOpen) {
      if (initialWorkout) {
        setName(initialWorkout.name);
        setCategory(initialWorkout.category);
        setExercises(
          initialWorkout.exercises.length > 0
            ? initialWorkout.exercises.map((e) => ({ ...e }))
            : [{ id: `ex_${Date.now()}`, name: '', sets: 3, reps: 10, duration: '', notes: '' }]
        );
        setSchedule([...initialWorkout.schedule]);
        setScheduleMode(initialWorkout.schedule.length === 7 ? 'everyday' : 'custom');
        setXpReward(initialWorkout.xpReward || 25);
      } else {
        setName('');
        setCategory('Cardio');
        setExercises([{ id: `ex_${Date.now()}`, name: '', sets: 3, reps: 10, duration: '', notes: '' }]);
        setSchedule([1, 2, 3, 4, 5]); // Mon - Fri default
        setScheduleMode('custom');
        setXpReward(25);
      }
      setErrors({});
    }
  }, [isOpen, initialWorkout]);

  if (!isOpen) return null;

  // Day toggle handler
  const handleToggleDay = (dayIndex: number) => {
    audioManager.playUiClick();
    setSchedule((prev) => {
      let next: number[];
      if (prev.includes(dayIndex)) {
        next = prev.filter((d) => d !== dayIndex);
      } else {
        next = [...prev, dayIndex].sort();
      }
      if (next.length === 7) {
        setScheduleMode('everyday');
      } else {
        setScheduleMode('custom');
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, schedule: undefined }));
  };

  const handleSetEveryDay = () => {
    audioManager.playUiClick();
    setSchedule([0, 1, 2, 3, 4, 5, 6]);
    setScheduleMode('everyday');
    setErrors((prev) => ({ ...prev, schedule: undefined }));
  };

  const handleSetCustomSchedule = () => {
    audioManager.playUiClick();
    setScheduleMode('custom');
  };

  // Exercise handlers
  const handleAddExercise = () => {
    audioManager.playUiClick();
    setExercises((prev) => [
      ...prev,
      {
        id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        sets: 3,
        reps: 10,
        duration: '',
        notes: '',
      },
    ]);
    setErrors((prev) => ({ ...prev, exercises: undefined }));
  };

  const handleRemoveExercise = (index: number) => {
    if (exercises.length <= 1) {
      setErrors((prev) => ({ ...prev, exercises: 'At least 1 exercise is required' }));
      return;
    }
    audioManager.playUiClick();
    setExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleExerciseChange = (index: number, field: keyof CustomExercise, value: any) => {
    setExercises((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    // Clear item error if name changed
    if (field === 'name') {
      setErrors((prev) => {
        if (!prev.exerciseItems) return prev;
        const nextItems = { ...prev.exerciseItems };
        delete nextItems[index];
        return { ...prev, exerciseItems: nextItems, exercises: undefined };
      });
    }
  };

  // XP stepper handler
  const handleAdjustXp = (delta: number) => {
    audioManager.playUiClick();
    setXpReward((prev) => Math.max(5, Math.min(500, prev + delta)));
    setErrors((prev) => ({ ...prev, xpReward: undefined }));
  };

  // Form submission & validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: {
      name?: string;
      exercises?: string;
      exerciseItems?: Record<number, string>;
      schedule?: string;
      xpReward?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Workout name is required (e.g. Morning Cardio)';
    }

    if (exercises.length === 0) {
      newErrors.exercises = 'Add at least one exercise to your workout';
    } else {
      const itemErrors: Record<number, string> = {};
      exercises.forEach((ex, idx) => {
        if (!ex.name.trim()) {
          itemErrors[idx] = `Exercise #${idx + 1} requires a name`;
        }
      });
      if (Object.keys(itemErrors).length > 0) {
        newErrors.exerciseItems = itemErrors;
        newErrors.exercises = 'Please complete all exercise names';
      }
    }

    if (schedule.length === 0) {
      newErrors.schedule = 'Select at least one day for this workout protocol';
    }

    if (isNaN(xpReward) || xpReward < 5 || xpReward > 500) {
      newErrors.xpReward = 'XP reward must be between 5 and 500';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      audioManager.playUiClick();
      return;
    }

    // Cleaned payload
    const workoutPayload: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      category,
      exercises: exercises.map((ex, idx) => ({
        id: ex.id || `ex_${idx}_${Date.now()}`,
        name: ex.name.trim(),
        sets: Math.max(1, Math.round(Number(ex.sets) || 1)),
        reps: Math.max(1, Math.round(Number(ex.reps) || 1)),
        duration: ex.duration?.trim() ? ex.duration.trim() : undefined,
        notes: ex.notes?.trim() ? ex.notes.trim() : undefined,
      })),
      schedule: [...schedule].sort(),
      xpReward: Math.max(5, Math.min(500, Math.round(xpReward))),
    };

    onSave(workoutPayload, initialWorkout?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-workout-title"
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
            <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="font-hud text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">
                HUNTER PROTOCOL FORGE
              </span>
              <h2 id="custom-workout-title" className="font-display text-lg sm:text-xl font-black text-white tracking-wider uppercase">
                {initialWorkout ? 'EDIT CUSTOM WORKOUT' : 'NEW CUSTOM WORKOUT'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-950/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-sm">
          {/* FIELD 1: Workout Name */}
          <div className="space-y-1.5">
            <label htmlFor="custom-workout-name" className="block font-hud text-xs font-bold tracking-wider text-slate-300 uppercase">
              1. WORKOUT NAME <span className="text-cyan-400">*</span>
            </label>
            <input
              id="custom-workout-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Morning Cardio, Core Blitz, Upper Strength"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-[#060a16] border text-white placeholder-slate-500 font-sans focus:outline-none transition-all ${
                errors.name
                  ? 'border-red-500/80 focus:border-red-400 focus:shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                  : 'border-cyan-900/60 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              }`}
            />
            {errors.name && (
              <p className="font-hud text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          {/* FIELD 2: Workout Category */}
          <div className="space-y-1.5">
            <label htmlFor="custom-workout-category" className="block font-hud text-xs font-bold tracking-wider text-slate-300 uppercase">
              2. WORKOUT CATEGORY
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {VALID_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      audioManager.playUiClick();
                    }}
                    className={`py-2 px-2 rounded-lg text-center font-hud text-[11px] font-bold tracking-wider transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-600/80 to-blue-600/80 text-white border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'bg-[#060a16] text-slate-400 border-cyan-950/60 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {cat.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FIELD 3: Exercises List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block font-hud text-xs font-bold tracking-wider text-slate-300 uppercase">
                3. EXERCISES ({exercises.length}) <span className="text-cyan-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddExercise}
                className="py-1 px-2.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 font-hud text-xs font-bold tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD EXERCISE</span>
              </button>
            </div>

            {errors.exercises && (
              <p className="font-hud text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.exercises}
              </p>
            )}

            <div className="space-y-3">
              {exercises.map((ex, index) => {
                const hasItemError = Boolean(errors.exerciseItems?.[index]);
                return (
                  <div
                    key={ex.id || index}
                    className={`p-3 sm:p-3.5 rounded-xl bg-[#060a16] border transition-all ${
                      hasItemError ? 'border-red-500/60' : 'border-cyan-950/80 hover:border-cyan-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-hud text-[11px] font-bold text-cyan-400">
                        EXERCISE #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(index)}
                        disabled={exercises.length <= 1}
                        title="Delete exercise"
                        className="p-1 rounded text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Exercise Name */}
                    <div className="mb-2">
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                        placeholder="e.g. Jumping Jacks, Running, Dumbbell Curls"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0a0f20] border border-cyan-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                      {errors.exerciseItems?.[index] && (
                        <p className="font-hud text-[10px] text-red-400 mt-1">
                          {errors.exerciseItems[index]}
                        </p>
                      )}
                    </div>

                    {/* Sets, Reps, Duration */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="block text-[10px] font-hud text-slate-400 mb-0.5">SETS</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={ex.sets}
                          onChange={(e) =>
                            handleExerciseChange(index, 'sets', Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-full px-2 py-1 rounded bg-[#0a0f20] border border-cyan-950 text-white text-xs text-center font-mono focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-hud text-slate-400 mb-0.5">REPS</label>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={ex.reps}
                          onChange={(e) =>
                            handleExerciseChange(index, 'reps', Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-full px-2 py-1 rounded bg-[#0a0f20] border border-cyan-950 text-white text-xs text-center font-mono focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-hud text-slate-400 mb-0.5">DURATION (OPT)</label>
                        <input
                          type="text"
                          value={ex.duration || ''}
                          onChange={(e) => handleExerciseChange(index, 'duration', e.target.value)}
                          placeholder="e.g. 20 mins"
                          className="w-full px-2 py-1 rounded bg-[#0a0f20] border border-cyan-950 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* Notes (Optional) */}
                    <div>
                      <input
                        type="text"
                        value={ex.notes || ''}
                        onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                        placeholder="Notes (optional, e.g. Form cues, rest interval)"
                        className="w-full px-2.5 py-1 rounded bg-[#0a0f20] border border-cyan-950 text-white text-[11px] placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FIELD 4: Workout Days */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-hud text-xs font-bold tracking-wider text-slate-300 uppercase">
                4. WORKOUT DAYS <span className="text-cyan-400">*</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSetEveryDay}
                  className={`py-1 px-2 rounded font-hud text-[10px] font-bold tracking-wider border cursor-pointer ${
                    scheduleMode === 'everyday'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-[#060a16] text-slate-400 border-cyan-950 hover:text-white'
                  }`}
                >
                  EVERY DAY
                </button>
                <button
                  type="button"
                  onClick={handleSetCustomSchedule}
                  className={`py-1 px-2 rounded font-hud text-[10px] font-bold tracking-wider border cursor-pointer ${
                    scheduleMode === 'custom'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                      : 'bg-[#060a16] text-slate-400 border-cyan-950 hover:text-white'
                  }`}
                >
                  CUSTOM
                </button>
              </div>
            </div>

            {/* Days Button Grid: MON through SUN (1 to 6 then 0) */}
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                const isSelected = schedule.includes(dayIndex);
                const label = DAY_SHORT_LABELS[dayIndex];
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => handleToggleDay(dayIndex)}
                    className={`py-2 rounded-lg text-center font-hud text-xs font-bold tracking-wider transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                        : 'bg-[#060a16] text-slate-400 border-cyan-950/60 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {errors.schedule && (
              <p className="font-hud text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.schedule}
              </p>
            )}
          </div>

          {/* FIELD 5: XP Reward */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="custom-workout-xp" className="block font-hud text-xs font-bold tracking-wider text-slate-300 uppercase">
                5. XP REWARD
              </label>
              <span className="font-hud text-xs font-bold text-purple-300 bg-purple-950/50 border border-purple-500/40 px-2 py-0.5 rounded">
                +{xpReward} XP PER COMPLETION
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjustXp(-25)}
                className="px-2.5 py-1.5 rounded-lg bg-[#060a16] border border-cyan-950 text-slate-300 hover:text-white hover:border-cyan-400 font-hud text-xs font-bold cursor-pointer"
              >
                -25
              </button>
              <button
                type="button"
                onClick={() => handleAdjustXp(-5)}
                className="px-2.5 py-1.5 rounded-lg bg-[#060a16] border border-cyan-950 text-slate-300 hover:text-white hover:border-cyan-400 font-hud text-xs font-bold cursor-pointer"
              >
                -5
              </button>
              <div className="relative flex-1">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  id="custom-workout-xp"
                  type="number"
                  min={5}
                  max={500}
                  step={5}
                  value={xpReward}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setXpReward(isNaN(val) ? 25 : val);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#060a16] border border-cyan-950 text-white font-mono text-center text-sm font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAdjustXp(5)}
                className="px-2.5 py-1.5 rounded-lg bg-[#060a16] border border-cyan-950 text-slate-300 hover:text-white hover:border-cyan-400 font-hud text-xs font-bold cursor-pointer"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleAdjustXp(25)}
                className="px-2.5 py-1.5 rounded-lg bg-[#060a16] border border-cyan-950 text-slate-300 hover:text-white hover:border-cyan-400 font-hud text-xs font-bold cursor-pointer"
              >
                +25
              </button>
            </div>
            {errors.xpReward && (
              <p className="font-hud text-xs text-red-400">{errors.xpReward}</p>
            )}
            <p className="text-[11px] text-slate-500 font-hud">
              Recommended: 20-50 XP based on intensity. Awarded once per scheduled day when completed.
            </p>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-cyan-950/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white font-hud text-xs font-bold tracking-wider transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white font-hud text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] active:scale-[0.98] transition-all cursor-pointer"
            >
              {initialWorkout ? 'UPDATE WORKOUT' : 'SAVE WORKOUT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
