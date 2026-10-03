import { DailyQuestStorage, UserProfileStorage } from '../types.ts';
import { INITIAL_BASE_XP, DEFAULT_STREAK, DEFAULT_DAILY_QUESTS } from '../data/defaultQuests.ts';
import { getLevelInfo } from './levelSystem.ts';
import {
  getActiveDate,
  setSimulatedDate,
  getLocalDateKey,
  getTodayDateKey,
  getTodayKey,
  getStoredData,
  setStoredData,
} from './storageCore.ts';

export {
  getActiveDate,
  setSimulatedDate,
  getLocalDateKey,
  getTodayDateKey,
  getTodayKey,
};

const USER_PROFILE_KEY = 'questlife_user_profile';
const DAILY_STORAGE_PREFIX = 'questlife_daily_';

/**
 * Advances simulated date by given number of days.
 */
export function advanceSimulatedDays(days: number = 1): string {
  const current = getActiveDate();
  current.setDate(current.getDate() + days);
  setSimulatedDate(current);
  return getLocalDateKey(current);
}

/**
 * Resets simulated date back to real system date.
 */
export function resetSimulatedDate(): string {
  setSimulatedDate(null);
  return getLocalDateKey(new Date());
}

/**
 * Gets the date key for the day immediately preceding the given date key.
 */
export function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const prev = new Date(y, m - 1, d);
  prev.setDate(prev.getDate() - 1);
  return getLocalDateKey(prev);
}

/**
 * Human-readable date string (e.g. "MONDAY, OCT 24" or current date)
 */
export function formatDisplayDate(date: Date = getActiveDate()): string {
  try {
    return date
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
      .toUpperCase();
  } catch {
    return 'MONDAY, OCT 24';
  }
}

/**
 * Generates initial consecutive completed days ending yesterday.
 * Used to initialize established streak from previous phases without losing continuity.
 */
export function generateInitialCompletedDays(
  streakCount: number = DEFAULT_STREAK,
  todayKey: string = getLocalDateKey()
): string[] {
  const days: string[] = [];
  const [y, m, d] = todayKey.split('-').map(Number);
  const base = new Date(y, m - 1, d);

  for (let i = 1; i <= streakCount; i++) {
    const prevDate = new Date(base);
    prevDate.setDate(base.getDate() - i);
    days.push(getLocalDateKey(prevDate));
  }
  return days.sort();
}

/**
 * Calculates the current active streak based on consecutive completed calendar dates.
 *
 * Rules:
 * - A day counts if present in completedDays.
 * - If today is complete: count consecutive days backwards starting from today.
 * - If today is NOT complete: check if yesterday was complete.
 *   - If yesterday was complete: count consecutive days backwards starting from yesterday.
 *   - If yesterday was NOT complete: streak is 0.
 * - Missed days break the streak.
 */
export function calculateStreak(completedDays: string[], todayKey: string): number {
  const completedSet = new Set(completedDays);
  const isTodayComplete = completedSet.has(todayKey);
  const [y, m, d] = todayKey.split('-').map(Number);

  if (isTodayComplete) {
    let streak = 0;
    const curr = new Date(y, m - 1, d);
    while (true) {
      const key = getLocalDateKey(curr);
      if (completedSet.has(key)) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  } else {
    // Today is still in progress. Check streak ending yesterday.
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() - 1);
    const yesterdayKey = getLocalDateKey(curr);

    if (!completedSet.has(yesterdayKey)) {
      return 0;
    }

    let streak = 0;
    while (true) {
      const key = getLocalDateKey(curr);
      if (completedSet.has(key)) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }
}

/**
 * Loads daily quest state for a given date.
 * If none exists, creates an empty daily record without overwriting previous days.
 */
export function loadDailyQuestState(dateKey: string): DailyQuestStorage {
  const key = `${DAILY_STORAGE_PREFIX}${dateKey}`;
  const parsed = getStoredData<any | null>(key, null);

  if (parsed && Array.isArray(parsed.completedIds)) {
    return {
      date: dateKey,
      completedIds: parsed.completedIds,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  }

  // Create initial fresh day entry
  const freshEntry: DailyQuestStorage = {
    date: dateKey,
    completedIds: [],
    updatedAt: new Date().toISOString(),
  };
  saveDailyQuestState(freshEntry);
  return freshEntry;
}

/**
 * Saves daily quest completed IDs for the given date.
 */
export function saveDailyQuestState(data: DailyQuestStorage): void {
  const key = `${DAILY_STORAGE_PREFIX}${data.date}`;
  setStoredData(key, {
    date: data.date,
    completedIds: data.completedIds,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Loads or initializes user profile (base XP, total XP, streak, completedDays, lastAcknowledgedLevel).
 * Handles date rollover: rolls yesterday's quest XP into baseXP so lifetime XP is preserved.
 */
export function loadUserProfile(todayKey: string): UserProfileStorage {
  let userName = '';
  let avatarInitial = '';
  let hunterTitle = 'E-RANK';
  let baseXP = 0;
  let totalXP = 0;
  let lastActiveDate = todayKey;
  let completedDays: string[] | undefined = undefined;
  let lastAcknowledgedLevel: number | undefined = undefined;

  const parsed = getStoredData<any | null>(USER_PROFILE_KEY, null);
  if (parsed && typeof parsed === 'object') {
    if (typeof parsed.userName === 'string' && parsed.userName.trim()) userName = parsed.userName.trim();
    if (typeof parsed.avatarInitial === 'string') avatarInitial = parsed.avatarInitial;
    if (typeof parsed.hunterTitle === 'string') hunterTitle = parsed.hunterTitle;
    if (typeof parsed.baseXP === 'number' && !isNaN(parsed.baseXP)) baseXP = Math.max(0, parsed.baseXP);
    if (typeof parsed.totalXP === 'number' && !isNaN(parsed.totalXP)) totalXP = Math.max(0, parsed.totalXP);
    if (typeof parsed.lastActiveDate === 'string') lastActiveDate = parsed.lastActiveDate;
    if (Array.isArray(parsed.completedDays)) completedDays = parsed.completedDays;
    if (typeof parsed.lastAcknowledgedLevel === 'number') lastAcknowledgedLevel = parsed.lastAcknowledgedLevel;
  }

  // Clean empty state: no fake days for fresh users
  if (!completedDays) {
    completedDays = [];
  }

  // Fresh account protection: Clear any demo or placeholder progress data if no genuine tasks were completed
  const hasHistory = completedDays.length > 0;
  let hasLedger = false;
  let hasTodayCompleted = false;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storage = window.localStorage;
      const ledgerRaw = storage.getItem('questlife_xp_ledger');
      if (ledgerRaw) {
        const parsedLedger = JSON.parse(ledgerRaw);
        hasLedger = Array.isArray(parsedLedger) && parsedLedger.length > 0;
      }
      const todayDailyRaw = storage.getItem(`questlife_daily_${todayKey}`);
      if (todayDailyRaw) {
        const parsedDaily = JSON.parse(todayDailyRaw);
        hasTodayCompleted = Array.isArray(parsedDaily?.completedIds) && parsedDaily.completedIds.length > 0;
      }
    } catch (_) {}
  }

  // If user has not completed legitimate tasks, enforce pristine 0 XP / Level 0 baseline
  if (!hasHistory && !hasLedger && !hasTodayCompleted) {
    baseXP = 0;
    totalXP = 0;
  }

  // Date rollover handling: If lastActiveDate is not todayKey, roll previous day's earned XP into baseXP
  if (lastActiveDate !== todayKey) {
    baseXP = totalXP;
    lastActiveDate = todayKey;
  }

  // Calculate dynamic streak from completedDays
  const dynamicStreak = calculateStreak(completedDays, todayKey);
  const currentLvlInfo = getLevelInfo(totalXP);

  // Default lastAcknowledgedLevel to current level so level up isn't falsely triggered on fresh load
  if (lastAcknowledgedLevel === undefined) {
    lastAcknowledgedLevel = currentLvlInfo.level;
  }

  hunterTitle = currentLvlInfo.rank;

  const profile: UserProfileStorage = {
    userName,
    avatarInitial: avatarInitial || (userName ? userName.charAt(0).toUpperCase() : 'H'),
    hunterTitle,
    baseXP,
    totalXP,
    streak: dynamicStreak,
    lastActiveDate,
    completedDays,
    lastAcknowledgedLevel,
  };

  saveUserProfile(profile);
  return profile;
}

/**
 * Saves updated user profile.
 */
export function saveUserProfile(profile: UserProfileStorage): void {
  setStoredData(USER_PROFILE_KEY, profile);
}


