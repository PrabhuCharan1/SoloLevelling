import { AppSettings } from '../types.ts';
import { loadWaterTarget } from './waterStorage.ts';
import { getStoredData, setStoredData } from './storageCore.ts';

export const SETTINGS_STORAGE_KEY = 'questlife_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'blue',
  compactMode: false,
  waterTargetMl: 3000,
  notifications: {
    dailyReminder: true,
    workoutReminder: true,
    waterReminder: true,
    questCompletion: true,
    rewardReady: true,
  },
  gamification: {
    floatingXp: true,
    levelUpModal: true,
    soundEffects: true,
  },
};

/**
 * Loads application settings defensively from localStorage.
 */
export function loadSettings(): AppSettings {
  const raw = getStoredData<any | null>(SETTINGS_STORAGE_KEY, null);
  const waterTargetFallback = loadWaterTarget();

  if (raw && typeof raw === 'object') {
    return {
      theme: raw.theme === 'light' ? 'light' : 'dark',
      accentColor: ['blue', 'purple', 'red', 'gold'].includes(raw.accentColor) ? raw.accentColor : 'blue',
      compactMode: Boolean(raw.compactMode),
      waterTargetMl: typeof raw.waterTargetMl === 'number' && raw.waterTargetMl > 0
        ? raw.waterTargetMl
        : waterTargetFallback,
      notifications: {
        dailyReminder: raw.notifications?.dailyReminder !== false,
        workoutReminder: raw.notifications?.workoutReminder !== false,
        waterReminder: raw.notifications?.waterReminder !== false,
        questCompletion: raw.notifications?.questCompletion !== false,
        rewardReady: raw.notifications?.rewardReady !== false,
      },
      gamification: {
        floatingXp: raw.gamification?.floatingXp !== false,
        levelUpModal: raw.gamification?.levelUpModal !== false,
        soundEffects: raw.gamification?.soundEffects !== false,
      },
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    waterTargetMl: loadWaterTarget(),
  };
}

/**
 * Saves application settings to localStorage safely.
 */
export function saveSettings(settings: AppSettings): void {
  setStoredData(SETTINGS_STORAGE_KEY, settings);
  // Apply theme immediately
  applyTheme(settings.theme);
}


/**
 * Applies the dark or light theme class to the HTML root document element.
 */
export function applyTheme(theme: 'dark' | 'light'): void {
  try {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  } catch {}
}
