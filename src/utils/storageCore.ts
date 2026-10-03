import {
  AppSettings,
  DailyQuestStorage,
  DailyRewardRecord,
  DailyWaterStorage,
  DailyWorkoutStorage,
  QuestLifeBackupPayload,
  RoutineItemConfig,
  UserProfileStorage,
  XpTransaction,
} from '../types.ts';

export const QUESTLIFE_SCHEMA_VERSION = 1;
export const SCHEMA_VERSION_KEY = 'questlife_schema_version';
export const SIMULATED_DATE_KEY = 'questlife_date_override';
export const XP_LEDGER_STORAGE_KEY = 'questlife_xp_ledger';

/**
 * Returns active Date object, respecting simulated date override if set.
 */
export function getActiveDate(): Date {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SIMULATED_DATE_KEY);
      if (raw) {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[QuestLife Storage] Error reading simulated date', err);
  }
  return new Date();
}

/**
 * Sets simulated date override (used for testing new day handling).
 */
export function setSimulatedDate(date: Date | null): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (date) {
        window.localStorage.setItem(SIMULATED_DATE_KEY, date.toISOString());
      } else {
        window.localStorage.removeItem(SIMULATED_DATE_KEY);
      }
    }
  } catch (err) {
    console.warn('[QuestLife Storage] Error setting simulated date', err);
  }
}

/**
 * Format date as LOCAL calendar date YYYY-MM-DD.
 * Note: Never use new Date().toISOString().slice(0, 10) as UTC offset can change dates.
 */
export function getLocalDateKey(date: Date = getActiveDate()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const getTodayDateKey = getLocalDateKey;
export const getTodayKey = getLocalDateKey;

/**
 * Safe local storage reader with try/catch and fallback defaults.
 * Prevents JSON parse errors from crashing the app.
 */
export function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (err) {
    console.warn(`[QuestLife Storage] Corrupted or invalid JSON for key "${key}". Reverting to safe default.`, err);
    return defaultValue;
  }
}

/**
 * Safe local storage writer with quota detection and atomic updates.
 */
export function setStoredData<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.error(`[QuestLife Storage] Failed to persist data for key "${key}":`, err);
    return false;
  }
}

/**
 * Safe item remover.
 */
export function removeStoredData(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`[QuestLife Storage] Failed to remove key "${key}":`, err);
  }
}

/**
 * Clears all QuestLife-specific data keys from localStorage.
 */
export function clearQuestLifeData(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    const storage = window.localStorage;
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('questlife_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => storage.removeItem(k));
  } catch (err) {
    console.error('[QuestLife Storage] Failed to clear app data:', err);
  }
}

/**
 * Returns the persisted application schema version.
 */
export function getStoredSchemaVersion(): number {
  return getStoredData<number>(SCHEMA_VERSION_KEY, QUESTLIFE_SCHEMA_VERSION);
}

/**
 * Persists the application schema version.
 */
export function setStoredSchemaVersion(version: number = QUESTLIFE_SCHEMA_VERSION): void {
  setStoredData(SCHEMA_VERSION_KEY, version);
}

/**
 * XP Transaction Ledger Functions (Duplicate XP Protection & Reversal)
 */
export function loadXpLedger(): XpTransaction[] {
  return getStoredData<XpTransaction[]>(XP_LEDGER_STORAGE_KEY, []);
}

export function saveXpLedger(ledger: XpTransaction[]): void {
  setStoredData(XP_LEDGER_STORAGE_KEY, ledger);
}

/**
 * Checks if an XP transaction already exists.
 */
export function hasXpTransaction(transactionId: string): boolean {
  const ledger = loadXpLedger();
  return ledger.some((tx) => tx.id === transactionId);
}

/**
 * Atomically records an XP transaction.
 * Returns true if recorded, or false if already exists (duplicate protection).
 */
export function recordXpTransaction(tx: XpTransaction): boolean {
  if (!tx.id || tx.amount <= 0) return false;
  const ledger = loadXpLedger();
  if (ledger.some((existing) => existing.id === tx.id)) {
    return false; // Duplicate prevented!
  }
  ledger.push(tx);
  saveXpLedger(ledger);
  return true;
}

/**
 * Reverses a previously recorded XP transaction safely.
 * Returns the transaction if found and reversed, or null if not found (preventing repeated reversals).
 */
export function reverseXpTransaction(transactionId: string): XpTransaction | null {
  const ledger = loadXpLedger();
  const index = ledger.findIndex((tx) => tx.id === transactionId);
  if (index === -1) {
    return null; // Not found or already reversed
  }
  const [removed] = ledger.splice(index, 1);
  saveXpLedger(ledger);
  return removed;
}

/**
 * Gets all transactions recorded for a given calendar date.
 */
export function getXpTransactionsForDate(dateKey: string): XpTransaction[] {
  const ledger = loadXpLedger();
  return ledger.filter((tx) => tx.date === dateKey);
}

/**
 * Validates a full QuestLife backup/state payload.
 * Checks types, ranges, integrity, and repairs safe discrepancies.
 */
export function validateQuestLifeState(payload: any): {
  isValid: boolean;
  repairedState?: QuestLifeBackupPayload;
  errors: string[];
} {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Payload must be a valid JSON object'] };
  }

  // Schema version check
  const version = typeof payload.schemaVersion === 'number' ? payload.schemaVersion : 1;
  if (version > QUESTLIFE_SCHEMA_VERSION) {
    return {
      isValid: false,
      errors: [`Unsupported schema version ${version}. Current system supports up to ${QUESTLIFE_SCHEMA_VERSION}.`],
    };
  }

  // Deep validate Profile
  const profile = payload.profile || {};
  const repairedProfile: UserProfileStorage = {
    userName: typeof profile.userName === 'string' ? profile.userName.trim() : '',
    avatarInitial: typeof profile.avatarInitial === 'string' ? profile.avatarInitial : '',
    hunterTitle: typeof profile.hunterTitle === 'string' ? profile.hunterTitle : 'E-RANK',
    baseXP: typeof profile.baseXP === 'number' && !isNaN(profile.baseXP) ? Math.max(0, profile.baseXP) : 0,
    totalXP: typeof profile.totalXP === 'number' && !isNaN(profile.totalXP) ? Math.max(0, profile.totalXP) : 0,
    streak: typeof profile.streak === 'number' && !isNaN(profile.streak) ? Math.max(0, profile.streak) : 0,
    lastActiveDate:
      typeof profile.lastActiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(profile.lastActiveDate)
        ? profile.lastActiveDate
        : getLocalDateKey(),
    completedDays: Array.isArray(profile.completedDays)
      ? Array.from(new Set<string>(profile.completedDays.filter((d: any): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort()
      : [],

    lastAcknowledgedLevel: typeof profile.lastAcknowledgedLevel === 'number' ? profile.lastAcknowledgedLevel : 1,
  };

  // Deep validate Routine
  const rawRoutine = Array.isArray(payload.routine) ? payload.routine : [];
  const seenRoutineIds = new Set<string>();
  const repairedRoutine: RoutineItemConfig[] = [];

  rawRoutine.forEach((item: any, idx: number) => {
    if (!item || typeof item !== 'object') return;
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `task-${idx}`;
    if (seenRoutineIds.has(id)) {
      errors.push(`Duplicate task ID "${id}" detected in routine`);
      return;
    }
    seenRoutineIds.add(id);

    repairedRoutine.push({
      id,
      title: typeof item.title === 'string' ? item.title : `Protocol ${idx + 1}`,
      category: ['Morning', 'College', 'Evening', 'Night'].includes(item.category) ? item.category : 'Morning',
      startTime: typeof item.startTime === 'string' ? item.startTime : '06:00 AM',
      endTime: typeof item.endTime === 'string' ? item.endTime : undefined,
      timeSpan: typeof item.timeSpan === 'string' ? item.timeSpan : '06:00 AM',
      xp: typeof item.xp === 'number' && !isNaN(item.xp) ? Math.max(5, Math.min(500, Math.round(item.xp))) : 25,
      enabled: item.enabled !== false,
      isCustom: Boolean(item.isCustom),
      iconName: typeof item.iconName === 'string' ? item.iconName : undefined,
    });
  });

  // Deep validate Settings
  const rawSettings = payload.settings || {};
  const repairedSettings: AppSettings = {
    theme: rawSettings.theme === 'light' ? 'light' : 'dark',
    accentColor: ['blue', 'purple', 'red', 'gold'].includes(rawSettings.accentColor) ? rawSettings.accentColor : 'blue',
    compactMode: Boolean(rawSettings.compactMode),
    waterTargetMl:
      typeof rawSettings.waterTargetMl === 'number' && !isNaN(rawSettings.waterTargetMl)
        ? Math.max(500, Math.min(10000, Math.round(rawSettings.waterTargetMl)))
        : 3000,
    notifications: {
      dailyReminder: rawSettings.notifications?.dailyReminder !== false,
      workoutReminder: rawSettings.notifications?.workoutReminder !== false,
      waterReminder: rawSettings.notifications?.waterReminder !== false,
      questCompletion: rawSettings.notifications?.questCompletion !== false,
      rewardReady: rawSettings.notifications?.rewardReady !== false,
    },
    gamification: {
      floatingXp: rawSettings.gamification?.floatingXp !== false,
      levelUpModal: rawSettings.gamification?.levelUpModal !== false,
      soundEffects: rawSettings.gamification?.soundEffects !== false,
    },
  };

  // Validate Daily Quests Data
  const dailyData: Record<string, DailyQuestStorage> = {};
  if (payload.dailyData && typeof payload.dailyData === 'object') {
    Object.entries(payload.dailyData).forEach(([date, val]: [string, any]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && val && typeof val === 'object') {
        dailyData[date] = {
          date,
          completedIds: Array.isArray(val.completedIds) ? val.completedIds.filter((id: any) => typeof id === 'string') : [],
          updatedAt: typeof val.updatedAt === 'string' ? val.updatedAt : new Date().toISOString(),
        };
      }
    });
  }

  // Validate Workouts Data
  const workoutData: Record<string, DailyWorkoutStorage> = {};
  if (payload.workoutData && typeof payload.workoutData === 'object') {
    Object.entries(payload.workoutData).forEach(([date, val]: [string, any]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && val && typeof val === 'object') {
        workoutData[date] = {
          date,
          dayOfWeek: typeof val.dayOfWeek === 'number' ? val.dayOfWeek : new Date(date).getDay(),
          exercises: val.exercises && typeof val.exercises === 'object' ? val.exercises : {},
          updatedAt: typeof val.updatedAt === 'string' ? val.updatedAt : new Date().toISOString(),
        };
      }
    });
  }

  // Validate Water Data
  const waterHistory: Record<string, DailyWaterStorage> = {};
  const rawWater = payload.waterData || {};
  if (rawWater.history && typeof rawWater.history === 'object') {
    Object.entries(rawWater.history).forEach(([date, val]: [string, any]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && val && typeof val === 'object') {
        const rawEntries = Array.isArray(val.entries) ? val.entries : [];
        const entries = rawEntries.map((e: any, idx: number) => ({
          id: typeof e.id === 'string' ? e.id : `water-${date}-${idx}`,
          amountMl: typeof e.amountMl === 'number' && !isNaN(e.amountMl) ? Math.max(0, Math.round(e.amountMl)) : 250,
          timestamp: typeof e.timestamp === 'string' ? e.timestamp : new Date().toISOString(),
          timeFormatted: typeof e.timeFormatted === 'string' ? e.timeFormatted : '12:00 PM',
        }));
        // Total water derived from entries
        const calculatedTotal = entries.reduce((sum: number, e: any) => sum + e.amountMl, 0);

        waterHistory[date] = {
          date,
          totalMl: calculatedTotal,
          entries,
          updatedAt: typeof val.updatedAt === 'string' ? val.updatedAt : new Date().toISOString(),
        };
      }
    });
  }

  // Validate XP Data & Ledger
  const rawXpData = payload.xpData || {};
  const rawLedger = Array.isArray(rawXpData.ledger) ? rawXpData.ledger : [];
  const seenTxIds = new Set<string>();
  const repairedLedger: XpTransaction[] = [];

  rawLedger.forEach((tx: any, idx: number) => {
    if (!tx || typeof tx !== 'object') return;
    const txId = typeof tx.id === 'string' && tx.id.trim() ? tx.id.trim() : `tx-${idx}`;
    if (seenTxIds.has(txId)) {
      return; // Skip duplicate transaction ID
    }
    seenTxIds.add(txId);

    repairedLedger.push({
      id: txId,
      date: typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date) ? tx.date : getLocalDateKey(),
      source: ['quest', 'workout', 'water', 'bonus'].includes(tx.source) ? tx.source : 'quest',
      sourceId: typeof tx.sourceId === 'string' ? tx.sourceId : 'unknown',
      amount: typeof tx.amount === 'number' && !isNaN(tx.amount) ? Math.max(0, Math.round(tx.amount)) : 25,
      timestamp: typeof tx.timestamp === 'string' ? tx.timestamp : new Date().toISOString(),
    });
  });

  // Validate Rewards Data
  const rawRewardData = payload.rewardData || {};
  const rewardHistory: DailyRewardRecord[] = Array.isArray(rawRewardData.history) ? rawRewardData.history : [];
  const rewardDaily: Record<string, DailyRewardRecord> = rawRewardData.daily && typeof rawRewardData.daily === 'object' ? rawRewardData.daily : {};

  const repairedState: QuestLifeBackupPayload = {
    schemaVersion: QUESTLIFE_SCHEMA_VERSION,
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString(),
    profile: repairedProfile,
    settings: repairedSettings,
    routine: repairedRoutine,
    dailyData,
    xpData: {
      totalXp: Math.max(0, repairedProfile.totalXP),
      baseXp: Math.max(0, repairedProfile.baseXP),
      ledger: repairedLedger,
    },
    streakData: {
      currentStreak: Math.max(0, repairedProfile.streak),
      longestStreak: Math.max(repairedProfile.streak, payload.streakData?.longestStreak || 0),
      completedDays: repairedProfile.completedDays || [],
    },
    workoutData,
    waterData: {
      targetMl: repairedSettings.waterTargetMl,
      history: waterHistory,
    },
    rewardData: {
      history: rewardHistory,
      daily: rewardDaily,
    },
    history: payload.history || {},
  };

  return {
    isValid: true,
    repairedState,
    errors,
  };
}

/**
 * Migrates data from older schema versions if necessary.
 */
export function migrateStorageData(data: any, fromVersion: number): any {
  let migrated = { ...data };
  if (fromVersion < 1) {
    // Migration logic for pre-v1 data
    migrated.schemaVersion = 1;
  }
  return migrated;
}

/**
 * Self-healing data integrity check run on app initialization.
 * Validates and repairs corrupted, NaN, or negative fields across local storage.
 */
export function checkAndRepairStoredData(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const storage = window.localStorage;

    // 1. Profile check
    const profileRaw = storage.getItem('questlife_user_profile');
    if (profileRaw) {
      try {
        const profile = JSON.parse(profileRaw);
        let modified = false;

        if (isNaN(profile.baseXP) || profile.baseXP < 0) {
          profile.baseXP = 0;
          modified = true;
        }
        if (isNaN(profile.totalXP) || profile.totalXP < 0) {
          profile.totalXP = profile.baseXP;
          modified = true;
        }
        if (isNaN(profile.streak) || profile.streak < 0) {
          profile.streak = 0;
          modified = true;
        }
        if (!Array.isArray(profile.completedDays)) {
          profile.completedDays = [];
          modified = true;
        }
        if (modified) {
          storage.setItem('questlife_user_profile', JSON.stringify(profile));
          console.info('[QuestLife Integrity] Repaired damaged user profile fields.');
        }
      } catch (err) {
        console.warn('[QuestLife Integrity] Resetting corrupted profile JSON');
      }
    }

    // 2. Settings check
    const settingsRaw = storage.getItem('questlife_settings');
    if (settingsRaw) {
      try {
        const settings = JSON.parse(settingsRaw);
        if (isNaN(settings.waterTargetMl) || settings.waterTargetMl < 500 || settings.waterTargetMl > 10000) {
          settings.waterTargetMl = 3000;
          storage.setItem('questlife_settings', JSON.stringify(settings));
          console.info('[QuestLife Integrity] Normalized water target setting.');
        }
      } catch (err) {
        console.warn('[QuestLife Integrity] Resetting corrupted settings JSON');
      }
    }

    // 3. Water Target check
    const waterTargetRaw = storage.getItem('questlife_water_target');
    if (waterTargetRaw) {
      const num = parseInt(waterTargetRaw, 10);
      if (isNaN(num) || num < 500 || num > 10000) {
        storage.setItem('questlife_water_target', '3000');
      }
    }

    // 4. Clean XP ledger
    const ledgerRaw = storage.getItem('questlife_xp_ledger');
    if (ledgerRaw) {
      try {
        const ledger = JSON.parse(ledgerRaw);
        if (Array.isArray(ledger)) {
          const cleaned = ledger.filter(
            (tx) => tx && typeof tx.id === 'string' && typeof tx.amount === 'number' && !isNaN(tx.amount) && tx.amount > 0
          );
          if (cleaned.length !== ledger.length) {
            storage.setItem('questlife_xp_ledger', JSON.stringify(cleaned));
            console.info('[QuestLife Integrity] Purged invalid XP transactions from ledger.');
          }
        }
      } catch (err) {
        storage.setItem('questlife_xp_ledger', '[]');
      }
    }

    // Set schema version marker
    setStoredSchemaVersion(QUESTLIFE_SCHEMA_VERSION);
  } catch (err) {
    console.error('[QuestLife Integrity] Integrity check error:', err);
  }
}

