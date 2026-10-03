import { DailyWorkoutStorage, ExerciseState } from '../types.ts';
import { WEEKLY_WORKOUT_SCHEDULE } from '../data/workoutSchedule.ts';
import { getStoredData, setStoredData, getLocalDateKey } from './storageCore.ts';

export const WORKOUT_STORAGE_PREFIX = 'questlife_workout_';

/**
 * Gets the localStorage key for a specific date's workout
 */
export function getWorkoutStorageKey(dateKey: string): string {
  return `${WORKOUT_STORAGE_PREFIX}${dateKey}`;
}

/**
 * Loads workout data for a specific date (defaults to today)
 */
export function loadDailyWorkout(dateKey: string = getLocalDateKey(), dayOfWeek?: number): DailyWorkoutStorage {
  const currentDayOfWeek =
    dayOfWeek !== undefined
      ? dayOfWeek
      : (() => {
          const [y, m, d] = dateKey.split('-').map(Number);
          return new Date(y, m - 1, d).getDay();
        })();

  const key = getWorkoutStorageKey(dateKey);
  const parsed = getStoredData<DailyWorkoutStorage | null>(key, null);

  if (parsed && parsed.date === dateKey && parsed.exercises && typeof parsed.exercises === 'object') {
    return parsed;
  }

  // Initialize fresh defaults from schedule
  const defaultExercises: Record<string, ExerciseState> = {};
  const dayPlan = WEEKLY_WORKOUT_SCHEDULE[currentDayOfWeek];
  if (dayPlan && !dayPlan.isRestDay && Array.isArray(dayPlan.groups)) {
    dayPlan.groups.forEach((g) => {
      g.exercises.forEach((ex) => {
        defaultExercises[ex.id] = {
          completed: false,
          weight: ex.defaultWeight,
          reps: ex.defaultReps,
        };
      });
    });
  }

  const initialData: DailyWorkoutStorage = {
    date: dateKey,
    dayOfWeek: currentDayOfWeek,
    exercises: defaultExercises,
    updatedAt: new Date().toISOString(),
  };

  saveDailyWorkout(initialData);
  return initialData;
}

/**
 * Saves workout data to localStorage atomically
 */
export function saveDailyWorkout(data: DailyWorkoutStorage): void {
  const key = getWorkoutStorageKey(data.date);
  setStoredData(key, data);
}

