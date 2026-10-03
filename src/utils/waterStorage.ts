import { DailyWaterStorage, WaterEntry } from '../types.ts';
import { getStoredData, setStoredData, getLocalDateKey } from './storageCore.ts';

export const WATER_STORAGE_PREFIX = 'questlife_water_';
export const WATER_TARGET_KEY = 'questlife_water_target';
export const DEFAULT_DAILY_WATER_TARGET_ML = 3000; // 3.0 Liters

/**
 * Loads the user's custom water target in ML (default 3000 ML = 3.0 L).
 */
export function loadWaterTarget(): number {
  const stored = getStoredData<number | string>(WATER_TARGET_KEY, DEFAULT_DAILY_WATER_TARGET_ML);
  const parsed = Number(stored);
  if (!isNaN(parsed) && parsed >= 500 && parsed <= 10000) {
    return Math.round(parsed);
  }
  return DEFAULT_DAILY_WATER_TARGET_ML;
}

/**
 * Saves the custom water target in ML.
 */
export function saveWaterTarget(targetMl: number): void {
  const safeTarget = Math.max(500, Math.min(10000, Math.round(targetMl)));
  setStoredData(WATER_TARGET_KEY, safeTarget);
}

/**
 * Gets localStorage key for water on a specific date
 */
export function getWaterStorageKey(dateKey: string): string {
  return `${WATER_STORAGE_PREFIX}${dateKey}`;
}

/**
 * Formats a Date object into human-readable 12-hour time: "08:10 AM"
 */
export function formatEntryTime(date: Date = new Date()): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${strHours}:${strMinutes} ${ampm}`;
}

/**
 * Converts milliliters to liters display string with 2 decimals: 2250 -> "2.25"
 */
export function mlToLiters(ml: number): string {
  return (Math.max(0, ml) / 1000).toFixed(2);
}

/**
 * Calculates total ML strictly from the underlying entries.
 */
export function calculateTotalFromEntries(entries: WaterEntry[]): number {
  if (!Array.isArray(entries)) return 0;
  return entries.reduce((sum, item) => sum + (typeof item.amountMl === 'number' && !isNaN(item.amountMl) ? Math.max(0, item.amountMl) : 0), 0);
}

/**
 * Loads water data for a specific date (defaults to today).
 * Guarantees totalMl is derived from entries without desynchronization.
 */
export function loadDailyWater(dateKey: string = getLocalDateKey()): DailyWaterStorage {
  const key = getWaterStorageKey(dateKey);
  const fallback: DailyWaterStorage = {
    date: dateKey,
    totalMl: 0,
    entries: [],
    updatedAt: new Date().toISOString(),
  };

  const parsed = getStoredData<DailyWaterStorage>(key, fallback);
  if (parsed && parsed.date === dateKey && Array.isArray(parsed.entries)) {
    const validEntries = parsed.entries.map((e) => ({
      id: typeof e.id === 'string' ? e.id : `water-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amountMl: typeof e.amountMl === 'number' && !isNaN(e.amountMl) ? Math.max(0, Math.round(e.amountMl)) : 250,
      timestamp: typeof e.timestamp === 'string' ? e.timestamp : new Date().toISOString(),
      timeFormatted: typeof e.timeFormatted === 'string' ? e.timeFormatted : '12:00 PM',
    }));
    return {
      date: dateKey,
      totalMl: calculateTotalFromEntries(validEntries),
      entries: validEntries,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  }

  saveDailyWater(fallback);
  return fallback;
}

/**
 * Saves water data to localStorage, enforcing totalMl matches sum of entries.
 */
export function saveDailyWater(data: DailyWaterStorage): void {
  const key = getWaterStorageKey(data.date);
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const synchronizedTotal = calculateTotalFromEntries(entries);

  setStoredData(key, {
    date: data.date,
    totalMl: synchronizedTotal,
    entries,
    updatedAt: new Date().toISOString(),
  });
}

