import { DailyRewardRecord } from '../types.ts';
import { getDeterministicRewardForDate } from '../data/rewardPool.ts';
import { getStoredData, setStoredData } from './storageCore.ts';

const DAILY_REWARD_PREFIX = 'questlife_daily_reward_';
const REWARD_HISTORY_KEY = 'questlife_rewards_history';

/**
 * Loads daily reward record for a given date key (YYYY-MM-DD).
 * If none exists, deterministically picks one from the pool and initializes unrevealed state.
 */
export function loadDailyReward(dateKey: string): DailyRewardRecord {
  const key = `${DAILY_REWARD_PREFIX}${dateKey}`;
  const parsed = getStoredData<DailyRewardRecord | null>(key, null);

  if (parsed && parsed.rewardId && parsed.rewardName) {
    return parsed;
  }

  // Initialize new record for this date
  const baseReward = getDeterministicRewardForDate(dateKey);
  const initialRecord: DailyRewardRecord = {
    date: dateKey,
    rewardId: baseReward.id,
    rewardName: baseReward.name,
    category: baseReward.category,
    description: baseReward.description,
    iconName: baseReward.iconName,
    lore: baseReward.lore,
    tagline: baseReward.tagline,
    revealed: false,
    claimed: false,
  };

  saveDailyReward(initialRecord);
  return initialRecord;
}

/**
 * Saves daily reward record to storage and syncs into rewards history array.
 */
export function saveDailyReward(record: DailyRewardRecord): void {
  const key = `${DAILY_REWARD_PREFIX}${record.date}`;
  setStoredData(key, record);

  // Synchronize into reward history array
  const history = loadAllRewardHistory();
  const existingIndex = history.findIndex((item) => item.date === record.date);

  if (existingIndex >= 0) {
    history[existingIndex] = { ...record };
  } else {
    history.push({ ...record });
  }

  setStoredData(REWARD_HISTORY_KEY, history);
}

/**
 * Marks today's reward as revealed and claimed.
 */
export function revealDailyReward(dateKey: string): DailyRewardRecord {
  const record = loadDailyReward(dateKey);
  if (!record.revealed) {
    record.revealed = true;
    record.claimed = true;
    record.revealedAt = new Date().toISOString();
    record.claimedAt = new Date().toISOString();
    saveDailyReward(record);
  }
  return record;
}

/**
 * Marks today's reward as claimed.
 */
export function claimDailyReward(dateKey: string): DailyRewardRecord {
  const record = loadDailyReward(dateKey);
  if (!record.claimed) {
    record.claimed = true;
    record.claimedAt = new Date().toISOString();
    saveDailyReward(record);
  }
  return record;
}

/**
 * Loads historical reward records from localStorage safely.
 */
export function loadAllRewardHistory(): DailyRewardRecord[] {
  const history = getStoredData<DailyRewardRecord[]>(REWARD_HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}

