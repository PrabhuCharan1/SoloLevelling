import { CustomWorkout, CustomExercise, CustomWorkoutDailyState, CustomWorkoutCategory } from '../types.ts';
import { getStoredData, setStoredData, getLocalDateKey } from './storageCore.ts';

export const CUSTOM_WORKOUTS_KEY = 'questlife_custom_workouts';
export const CUSTOM_WORKOUT_DAILY_PREFIX = 'questlife_custom_workout_daily_';

export const DAY_SHORT_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const DAY_FULL_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const VALID_CATEGORIES: CustomWorkoutCategory[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Abs/Core',
  'Cardio',
  'Full Body',
  'Other',
];

/**
 * Formats schedule day numbers (0-6) into human-readable label
 */
export function formatScheduleDays(schedule: number[]): string {
  if (!schedule || schedule.length === 0) return 'No days scheduled';
  if (schedule.length === 7) return 'EVERY DAY';
  if (schedule.length === 5 && [1, 2, 3, 4, 5].every((d) => schedule.includes(d))) {
    return 'WEEKDAYS (MON-FRI)';
  }
  if (schedule.length === 2 && [0, 6].every((d) => schedule.includes(d))) {
    return 'WEEKENDS (SAT-SUN)';
  }

  // Sort by week start (Mon = 1 ... Sun = 0)
  const orderedDays = [...schedule].sort((a, b) => {
    const aOrder = a === 0 ? 7 : a;
    const bOrder = b === 0 ? 7 : b;
    return aOrder - bOrder;
  });

  return orderedDays.map((d) => DAY_SHORT_LABELS[d]).join(' · ');
}

/**
 * Loads all custom workouts with robust structural validation
 */
export function loadCustomWorkouts(): CustomWorkout[] {
  const rawList = getStoredData<any[]>(CUSTOM_WORKOUTS_KEY, []);
  if (!Array.isArray(rawList)) return [];

  const sanitized: CustomWorkout[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    if (typeof item.id !== 'string' || !item.id.trim()) continue;
    if (typeof item.name !== 'string' || !item.name.trim()) continue;

    const category: CustomWorkoutCategory = VALID_CATEGORIES.includes(item.category)
      ? item.category
      : 'Other';

    const rawExercises = Array.isArray(item.exercises) ? item.exercises : [];
    const validExercises: CustomExercise[] = [];

    for (const ex of rawExercises) {
      if (!ex || typeof ex !== 'object') continue;
      if (typeof ex.name !== 'string' || !ex.name.trim()) continue;

      validExercises.push({
        id: typeof ex.id === 'string' && ex.id.trim() ? ex.id : `ce_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: ex.name.trim(),
        sets: typeof ex.sets === 'number' && !isNaN(ex.sets) && ex.sets >= 1 ? Math.round(ex.sets) : 3,
        reps: typeof ex.reps === 'number' && !isNaN(ex.reps) && ex.reps >= 1 ? Math.round(ex.reps) : 10,
        duration: typeof ex.duration === 'string' && ex.duration.trim() ? ex.duration.trim() : undefined,
        notes: typeof ex.notes === 'string' && ex.notes.trim() ? ex.notes.trim() : undefined,
      });
    }

    const rawSchedule = Array.isArray(item.schedule) ? item.schedule : [1, 2, 3, 4, 5];
    const schedule = Array.from(new Set(rawSchedule))
      .filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
      .sort();

    const xpReward =
      typeof item.xpReward === 'number' && !isNaN(item.xpReward) && item.xpReward >= 5 && item.xpReward <= 500
        ? Math.round(item.xpReward)
        : 25;

    sanitized.push({
      id: item.id,
      name: item.name.trim(),
      category,
      exercises: validExercises,
      schedule: schedule.length > 0 ? schedule : [1, 2, 3, 4, 5],
      xpReward,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    });
  }

  return sanitized;
}

/**
 * Saves all custom workouts atomically
 */
export function saveCustomWorkouts(workouts: CustomWorkout[]): void {
  setStoredData(CUSTOM_WORKOUTS_KEY, workouts);
}

/**
 * Adds a new custom workout persistently
 */
export function createCustomWorkout(
  data: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'>
): CustomWorkout {
  const current = loadCustomWorkouts();
  const id = `cw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const newWorkout: CustomWorkout = {
    id,
    name: data.name.trim(),
    category: data.category,
    exercises: data.exercises.map((ex, idx) => ({
      ...ex,
      id: ex.id || `ce_${id}_${idx}_${Date.now()}`,
    })),
    schedule: data.schedule.length > 0 ? [...data.schedule].sort() : [1],
    xpReward: Math.max(5, Math.min(500, Math.round(data.xpReward || 25))),
    createdAt: now,
    updatedAt: now,
  };

  current.push(newWorkout);
  saveCustomWorkouts(current);
  return newWorkout;
}

/**
 * Updates an existing custom workout persistently
 */
export function updateCustomWorkout(updated: CustomWorkout): boolean {
  const current = loadCustomWorkouts();
  const index = current.findIndex((w) => w.id === updated.id);
  if (index === -1) return false;

  current[index] = {
    ...updated,
    name: updated.name.trim(),
    schedule: [...updated.schedule].sort(),
    xpReward: Math.max(5, Math.min(500, Math.round(updated.xpReward || 25))),
    updatedAt: new Date().toISOString(),
  };

  saveCustomWorkouts(current);
  return true;
}

/**
 * Deletes a custom workout safely. Predefined workouts can NEVER be deleted.
 */
export function deleteCustomWorkout(id: string): boolean {
  const current = loadCustomWorkouts();
  const filtered = current.filter((w) => w.id !== id);
  if (filtered.length === current.length) return false;

  saveCustomWorkouts(filtered);
  return true;
}

/**
 * Loads daily completion state for custom workouts on a specific date
 */
export function loadCustomWorkoutDaily(dateKey: string = getLocalDateKey()): CustomWorkoutDailyState {
  const key = `${CUSTOM_WORKOUT_DAILY_PREFIX}${dateKey}`;
  const parsed = getStoredData<CustomWorkoutDailyState | null>(key, null);

  if (
    parsed &&
    parsed.date === dateKey &&
    Array.isArray(parsed.completedWorkoutIds) &&
    parsed.exerciseStates &&
    typeof parsed.exerciseStates === 'object'
  ) {
    return parsed;
  }

  const initial: CustomWorkoutDailyState = {
    date: dateKey,
    completedWorkoutIds: [],
    exerciseStates: {},
    updatedAt: new Date().toISOString(),
  };

  setStoredData(key, initial);
  return initial;
}

/**
 * Saves daily completion state for custom workouts
 */
export function saveCustomWorkoutDaily(state: CustomWorkoutDailyState): void {
  const key = `${CUSTOM_WORKOUT_DAILY_PREFIX}${state.date}`;
  setStoredData(key, state);
}

/**
 * Toggles an exercise in a custom workout for a specific date
 */
export function toggleCustomWorkoutExercise(
  dateKey: string,
  workout: CustomWorkout,
  exerciseId: string
): {
  state: CustomWorkoutDailyState;
  isWorkoutNowComplete: boolean;
  isWorkoutNowUncompleted: boolean;
} {
  const state = loadCustomWorkoutDaily(dateKey);
  const currentExercise = state.exerciseStates[exerciseId] || { completed: false, weight: 0, reps: 10 };
  const nextCompleted = !currentExercise.completed;

  const nextExerciseStates = {
    ...state.exerciseStates,
    [exerciseId]: {
      ...currentExercise,
      completed: nextCompleted,
    },
  };

  // Check if ALL exercises of this custom workout are now completed
  const allExercisesCompleted =
    workout.exercises.length > 0 &&
    workout.exercises.every((ex) => {
      if (ex.id === exerciseId) return nextCompleted;
      return Boolean(nextExerciseStates[ex.id]?.completed);
    });

  const wasCompleted = state.completedWorkoutIds.includes(workout.id);
  let nextCompletedWorkoutIds = [...state.completedWorkoutIds];
  let isWorkoutNowComplete = false;
  let isWorkoutNowUncompleted = false;

  if (allExercisesCompleted && !wasCompleted) {
    nextCompletedWorkoutIds.push(workout.id);
    isWorkoutNowComplete = true;
  } else if (!allExercisesCompleted && wasCompleted) {
    nextCompletedWorkoutIds = nextCompletedWorkoutIds.filter((id) => id !== workout.id);
    isWorkoutNowUncompleted = true;
  }

  const updatedState: CustomWorkoutDailyState = {
    date: dateKey,
    completedWorkoutIds: nextCompletedWorkoutIds,
    exerciseStates: nextExerciseStates,
    updatedAt: new Date().toISOString(),
  };

  saveCustomWorkoutDaily(updatedState);

  return {
    state: updatedState,
    isWorkoutNowComplete,
    isWorkoutNowUncompleted,
  };
}

/**
 * Manually marks a custom workout as completed or uncompleted
 */
export function setCustomWorkoutCompletedState(
  dateKey: string,
  workout: CustomWorkout,
  completed: boolean
): CustomWorkoutDailyState {
  const state = loadCustomWorkoutDaily(dateKey);
  let nextCompletedWorkoutIds = [...state.completedWorkoutIds];

  const nextExerciseStates = { ...state.exerciseStates };
  workout.exercises.forEach((ex) => {
    const prev = nextExerciseStates[ex.id] || { weight: 0, reps: ex.reps };
    nextExerciseStates[ex.id] = {
      ...prev,
      completed,
    };
  });

  if (completed) {
    if (!nextCompletedWorkoutIds.includes(workout.id)) {
      nextCompletedWorkoutIds.push(workout.id);
    }
  } else {
    nextCompletedWorkoutIds = nextCompletedWorkoutIds.filter((id) => id !== workout.id);
  }

  const updatedState: CustomWorkoutDailyState = {
    date: dateKey,
    completedWorkoutIds: nextCompletedWorkoutIds,
    exerciseStates: nextExerciseStates,
    updatedAt: new Date().toISOString(),
  };

  saveCustomWorkoutDaily(updatedState);
  return updatedState;
}

/**
 * Filters workouts scheduled for a given day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
 */
export function getWorkoutsScheduledForDay(
  dayOfWeek: number,
  workouts: CustomWorkout[]
): CustomWorkout[] {
  return workouts.filter((w) => w.schedule.includes(dayOfWeek));
}
