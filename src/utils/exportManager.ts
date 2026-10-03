import { getLocalDateKey, QUESTLIFE_SCHEMA_VERSION, validateQuestLifeState } from './storageCore.ts';
import { loadUserProfile, saveUserProfile } from './questStorage.ts';
import { loadSettings, saveSettings } from './settingsStorage.ts';
import { loadRoutine, saveRoutine } from './routineStorage.ts';
import { loadWaterTarget, saveWaterTarget, loadDailyWater, saveDailyWater } from './waterStorage.ts';
import { loadAllRewardHistory, loadDailyReward, saveDailyReward } from './rewardStorage.ts';
import { loadXpLedger, saveXpLedger } from './storageCore.ts';
import { calculateLongestStreak, getAllRecordedDates } from './historyManager.ts';
import { DailyRewardRecord, QuestLifeBackupPayload } from '../types.ts';

/**
 * Gathers all QuestLife state into a unified, schema-versioned QuestLifeBackupPayload.
 * Masks unrevealed mystery rewards to prevent spoilers.
 */
export function generateExportData(): QuestLifeBackupPayload {
  const todayKey = getLocalDateKey();
  const profile = loadUserProfile(todayKey);
  const settings = loadSettings();
  const routine = loadRoutine();
  const waterTarget = loadWaterTarget();
  const xpLedger = loadXpLedger();
  const rewardHistory = loadAllRewardHistory();

  const allRecordedDates = getAllRecordedDates(todayKey);

  const dailyData: Record<string, any> = {};
  const workoutData: Record<string, any> = {};
  const waterDataHistory: Record<string, any> = {};
  const dailyRewards: Record<string, any> = {};

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storage = window.localStorage;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key || !key.startsWith('questlife_')) continue;

        const raw = storage.getItem(key);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);

          if (key.startsWith('questlife_daily_reward_')) {
            const date = key.replace('questlife_daily_reward_', '');
            const rewardRecord = parsed as DailyRewardRecord;
            // Protect unrevealed mystery rewards from inspection
            if (!rewardRecord.revealed && !rewardRecord.claimed) {
              dailyRewards[date] = {
                date: rewardRecord.date,
                revealed: false,
                claimed: false,
                rewardId: 'masked-mystery',
                rewardName: 'MYSTERY REWARD (LOCKED)',
                category: 'SECRET',
                description: 'Complete daily protocols to unlock.',
                iconName: 'Lock',
                lore: 'Hidden in dimensional vault until daily quest completion.',
                tagline: 'LOCKED',
              };
            } else {
              dailyRewards[date] = rewardRecord;
            }
          } else if (key.startsWith('questlife_daily_')) {
            const date = key.replace('questlife_daily_', '');
            dailyData[date] = parsed;
          } else if (key.startsWith('questlife_workout_')) {
            const date = key.replace('questlife_workout_', '');
            workoutData[date] = parsed;
          } else if (key.startsWith('questlife_water_')) {
            const date = key.replace('questlife_water_', '');
            waterDataHistory[date] = parsed;
          }
        } catch {
          // Skip unparseable non-critical keys
        }
      }
    } catch (err) {
      console.warn('Failed to aggregate local data for export', err);
    }
  }

  const payload: QuestLifeBackupPayload = {
    schemaVersion: QUESTLIFE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    settings,
    routine,
    dailyData,
    xpData: {
      totalXp: profile.totalXP,
      baseXp: profile.baseXP,
      ledger: xpLedger,
    },
    streakData: {
      currentStreak: profile.streak,
      longestStreak: calculateLongestStreak(profile.completedDays || []),
      completedDays: profile.completedDays || [],
    },
    workoutData,
    waterData: {
      targetMl: waterTarget,
      history: waterDataHistory,
    },
    rewardData: {
      history: rewardHistory,
      daily: dailyRewards,
    },
    history: {
      allRecordedDates,
    },
  };

  return payload;
}

/**
 * Downloads the exported JSON file to the user's device with exact filename:
 * questlife-backup-YYYY-MM-DD.json
 */
export function downloadUserDataBackup(): void {
  try {
    const data = generateExportData();
    const todayKey = getLocalDateKey();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `questlife-backup-${todayKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download user data backup', err);
  }
}

/**
 * Validates a raw JSON string for restoring backup.
 * Does NOT overwrite state if corrupted or invalid.
 */
export function validateBackupFileContent(rawJson: string): {
  success: boolean;
  error?: string;
  data?: QuestLifeBackupPayload;
} {
  try {
    const parsed = JSON.parse(rawJson);
    const validation = validateQuestLifeState(parsed);

    if (!validation.isValid || !validation.repairedState) {
      return {
        success: false,
        error: validation.errors.length > 0 ? validation.errors.join('; ') : 'Corrupted or invalid QuestLife backup.',
      };
    }

    return {
      success: true,
      data: validation.repairedState,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Failed to parse JSON: ' + (err?.message || 'Invalid format'),
    };
  }
}

/**
 * Restores all application data from a validated QuestLife backup payload.
 * Atomically writes all keys to localStorage.
 */
export function applyRestoredBackup(payload: QuestLifeBackupPayload): void {
  try {
    // 1. Profile
    saveUserProfile(payload.profile);

    // 2. Settings
    saveSettings(payload.settings);

    // 3. Routine
    saveRoutine(payload.routine);

    // 4. Water Target
    saveWaterTarget(payload.waterData.targetMl || 3000);

    // 5. XP Ledger
    if (payload.xpData?.ledger) {
      saveXpLedger(payload.xpData.ledger);
    }

    // 6. Daily Quests
    if (payload.dailyData && typeof window !== 'undefined' && window.localStorage) {
      Object.entries(payload.dailyData).forEach(([date, data]) => {
        window.localStorage.setItem(`questlife_daily_${date}`, JSON.stringify(data));
      });
    }

    // 7. Workouts
    if (payload.workoutData && typeof window !== 'undefined' && window.localStorage) {
      Object.entries(payload.workoutData).forEach(([date, data]) => {
        window.localStorage.setItem(`questlife_workout_${date}`, JSON.stringify(data));
      });
    }

    // 8. Water Logs
    if (payload.waterData?.history) {
      Object.entries(payload.waterData.history).forEach(([date, data]) => {
        saveDailyWater(data);
      });
    }

    // 9. Rewards
    if (payload.rewardData?.history && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('questlife_rewards_history', JSON.stringify(payload.rewardData.history));
    }
    if (payload.rewardData?.daily) {
      Object.entries(payload.rewardData.daily).forEach(([date, record]) => {
        // Skip masked mystery rewards if restoring
        if (record.rewardId !== 'masked-mystery') {
          saveDailyReward(record);
        }
      });
    }

    console.log('[QuestLife Storage] Backup restored successfully.');
  } catch (err) {
    console.error('Failed to apply restored backup payload', err);
    throw err;
  }
}

/**
 * Resets today's progress without deleting previous history or lifetime base XP.
 */
export function executeResetTodayProgress(todayKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const storage = window.localStorage;
    storage.removeItem(`questlife_daily_${todayKey}`);
    storage.removeItem(`questlife_workout_${todayKey}`);
    storage.removeItem(`questlife_water_${todayKey}`);
    storage.removeItem(`questlife_daily_reward_${todayKey}`);

    // Remove today from completedDays in profile
    const profileRaw = storage.getItem('questlife_user_profile');
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      if (Array.isArray(profile.completedDays)) {
        profile.completedDays = profile.completedDays.filter((d: string) => d !== todayKey);
        storage.setItem('questlife_user_profile', JSON.stringify(profile));
      }
    }
  } catch (err) {
    console.error('Failed to reset today progress in storage', err);
  }
}

/**
 * Completely clears all QuestLife storage data from the browser.
 */
export function executeResetAllData(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const storage = window.localStorage;
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('questlife_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch (err) {
    console.error('Failed to execute reset all data', err);
  }
}

// Aliases for unified backup export and restoration
export const exportFullBackupPayload = generateExportData;
export const applyRestoredBackupToStorage = applyRestoredBackup;

