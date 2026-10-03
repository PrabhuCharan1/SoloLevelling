import { RoutineItemConfig, QuestCategory, TaskVerificationMethod } from '../types.ts';
import { getStoredData, setStoredData } from './storageCore.ts';

export const ROUTINE_STORAGE_KEY = 'questlife_routine';

/**
 * Loads the user's customized routine from localStorage.
 * For a new user, returns an empty array [].
 */
export function loadRoutine(): RoutineItemConfig[] {
  const parsed = getStoredData<any[] | null>(ROUTINE_STORAGE_KEY, null);

  if (Array.isArray(parsed)) {
    const validated: RoutineItemConfig[] = parsed
      .filter((item) => {
        if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') return false;
        // Strip legacy predefined automatic routine tasks
        if (item.isCustom === false) return false;
        if (
          item.id.startsWith('morning_') ||
          item.id.startsWith('college_') ||
          item.id.startsWith('evening_') ||
          item.id.startsWith('night_') ||
          item.id.startsWith('default_') ||
          item.id.startsWith('preset_')
        ) {
          return false;
        }
        return true;
      })
      .map((item) => {
        let vMethod: TaskVerificationMethod = 'MANUAL + CAPTURE';
        if (item.verificationMethod === 'MANUAL' || item.verificationMethod === 'CAPTURE') {
          vMethod = item.verificationMethod;
        }

        const startTime = item.startTime ? String(item.startTime) : '';
        const endTime = item.endTime ? String(item.endTime) : undefined;
        const duration = item.duration ? String(item.duration) : undefined;
        let timeSpan = item.timeSpan ? String(item.timeSpan) : '';
        if (!timeSpan) {
          if (startTime && duration) timeSpan = `${startTime} (${duration})`;
          else if (startTime) timeSpan = startTime;
          else if (duration) timeSpan = duration;
          else timeSpan = 'Scheduled';
        }

        return {
          id: String(item.id),
          title: String(item.title).trim(),
          category: (['Morning', 'College', 'Evening', 'Night'].includes(item.category)
            ? item.category
            : 'Morning') as QuestCategory,
          startTime,
          endTime,
          duration,
          timeSpan,
          xp: typeof item.xp === 'number' && !isNaN(item.xp) ? Math.min(100, Math.max(1, Math.round(item.xp))) : 25,
          enabled: item.enabled !== false,
          isCustom: true,
          iconName: item.iconName ? String(item.iconName) : undefined,
          verificationMethod: vMethod,
          recurring: item.recurring !== false,
          daysOfWeek: Array.isArray(item.daysOfWeek) ? item.daysOfWeek : undefined,
        };
      });

    return validated;
  }

  // Fresh new user state starts with empty routine
  return [];
}

/**
 * Saves the customized routine to localStorage safely.
 */
export function saveRoutine(routine: RoutineItemConfig[]): void {
  setStoredData(ROUTINE_STORAGE_KEY, routine);
}

/**
 * Restores the routine to empty/cleared state.
 */
export function resetRoutineToDefault(): RoutineItemConfig[] {
  saveRoutine([]);
  return [];
}

/**
 * Adds a custom task to the routine with validated parameters.
 */
export function addCustomTask(
  currentRoutine: RoutineItemConfig[],
  newTask: {
    title: string;
    category?: QuestCategory;
    startTime?: string;
    endTime?: string;
    duration?: string;
    xp?: number;
    verificationMethod?: TaskVerificationMethod;
    recurring?: boolean;
    daysOfWeek?: number[];
  }
): { success: boolean; error?: string; routine: RoutineItemConfig[]; newItem?: RoutineItemConfig } {
  const trimmedTitle = newTask.title.trim();
  if (!trimmedTitle) {
    return { success: false, error: 'Task name is required', routine: currentRoutine };
  }

  // XP Reward: default 25 XP, max 100 XP
  const safeXp = typeof newTask.xp === 'number' && !isNaN(newTask.xp)
    ? Math.min(100, Math.max(1, Math.round(newTask.xp)))
    : 25;

  const startTime = newTask.startTime?.trim() || '';
  const endTime = newTask.endTime?.trim() || undefined;
  const duration = newTask.duration?.trim() || undefined;

  let timeSpan = 'Scheduled';
  if (startTime && endTime) {
    timeSpan = `${startTime} to ${endTime}`;
  } else if (startTime && duration) {
    timeSpan = `${startTime} (${duration})`;
  } else if (startTime) {
    timeSpan = startTime;
  } else if (duration) {
    timeSpan = duration;
  }

  // Derive default category based on start time if not provided
  let category = newTask.category || 'Morning';
  if (!newTask.category && startTime) {
    if (startTime.includes('PM')) {
      const hour = parseInt(startTime, 10);
      if (hour >= 9 && hour < 12) category = 'Night';
      else category = 'Evening';
    } else {
      const hour = parseInt(startTime, 10);
      if (hour >= 9) category = 'College';
      else category = 'Morning';
    }
  }

  const customItem: RoutineItemConfig = {
    id: `quest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: trimmedTitle,
    category,
    startTime,
    endTime,
    duration,
    timeSpan,
    xp: safeXp,
    enabled: true,
    isCustom: true,
    verificationMethod: newTask.verificationMethod || 'MANUAL + CAPTURE',
    recurring: newTask.recurring !== false,
    daysOfWeek: newTask.daysOfWeek,
  };

  const updatedRoutine = [...currentRoutine, customItem];
  saveRoutine(updatedRoutine);
  return { success: true, routine: updatedRoutine, newItem: customItem };
}
