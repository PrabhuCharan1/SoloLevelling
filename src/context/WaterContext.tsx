import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DailyWaterStorage, WaterEntry } from '../types.ts';
import {
  DEFAULT_DAILY_WATER_TARGET_ML,
  formatEntryTime,
  loadDailyWater,
  saveDailyWater,
  mlToLiters,
  loadWaterTarget,
  saveWaterTarget,
} from '../utils/waterStorage.ts';
import { getTodayKey } from '../utils/questStorage.ts';
import { useQuestSystem } from './QuestContext.tsx';
import { useSettings } from './SettingsContext.tsx';

interface WaterContextType {
  totalMl: number;
  targetMl: number;
  litersConsumed: string;
  litersTarget: string;
  progressPercent: number; // 0 to 100 (capped for bar visualization)
  actualPercent: number; // Raw percentage, e.g. 115% if over target
  isTargetReached: boolean;
  entries: WaterEntry[];
  lastEntry: WaterEntry | null;
  addWater: (amountMl: number) => { success: boolean; error?: string };
  undoLastEntry: () => void;
  removeEntry: (id: string) => void;
  setWaterTarget: (targetMl: number) => void;
  resetTodayWater: () => void;
  todayKey: string;
}

const WaterContext = createContext<WaterContextType | undefined>(undefined);

export const WaterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setQuestCompleted, todayKey } = useQuestSystem();
  const { settings, updateWaterTarget: updateSettingsWaterTarget } = useSettings();

  // Dynamic user water target in ml synced with Settings (default 3000 ml = 3.0 L)
  const targetMl = settings.waterTargetMl || 3000;

  // Active day storage state
  const [waterState, setWaterState] = useState<DailyWaterStorage>(() => {
    return loadDailyWater(todayKey);
  });

  // Function to set water target
  const setWaterTarget = useCallback(
    (newTargetMl: number) => {
      const safeTarget = Math.max(500, Math.min(10000, Math.round(newTargetMl)));
      updateSettingsWaterTarget(safeTarget);
      saveWaterTarget(safeTarget);
    },
    [updateSettingsWaterTarget]
  );

  // Reset today's water entries
  const resetTodayWater = useCallback(() => {
    const fresh: DailyWaterStorage = {
      date: todayKey,
      totalMl: 0,
      entries: [],
      updatedAt: new Date().toISOString(),
    };
    saveDailyWater(fresh);
    setWaterState(fresh);
  }, [todayKey]);

  // When dateKey rolls over, reload for new day
  useEffect(() => {
    const loaded = loadDailyWater(todayKey);
    setWaterState(loaded);
  }, [todayKey]);


  // Derived values
  const totalMl = waterState.totalMl;
  const entries = waterState.entries;
  const lastEntry = entries.length > 0 ? entries[0] : null;

  const litersConsumed = useMemo(() => mlToLiters(totalMl), [totalMl]);
  const litersTarget = useMemo(() => mlToLiters(targetMl), [targetMl]);

  const actualPercent = useMemo(() => {
    if (targetMl <= 0) return 0;
    return Math.round((totalMl / targetMl) * 100);
  }, [totalMl, targetMl]);

  // Capped at 100% for the main progress visual bar
  const progressPercent = useMemo(() => {
    return Math.min(100, actualPercent);
  }, [actualPercent]);

  const isTargetReached = totalMl >= targetMl;

  // Sync with Daily Quest "Water target" (id: 'quest-college-water-target', +50 XP)
  useEffect(() => {
    if (isTargetReached) {
      setQuestCompleted('quest-college-water-target', true);
    } else {
      setQuestCompleted('quest-college-water-target', false);
    }
  }, [isTargetReached, setQuestCompleted]);

  // Add water with validation
  const addWater = useCallback(
    (amountMl: number) => {
      if (isNaN(amountMl) || amountMl <= 0) {
        return { success: false, error: 'Please enter a valid amount greater than 0 ML' };
      }

      const roundedMl = Math.round(amountMl);
      const newEntry: WaterEntry = {
        id: `water-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        amountMl: roundedMl,
        timestamp: new Date().toISOString(),
        timeFormatted: formatEntryTime(new Date()),
      };

      setWaterState((prev) => {
        const nextTotal = prev.totalMl + roundedMl;
        const nextEntries = [newEntry, ...prev.entries];
        const nextState: DailyWaterStorage = {
          date: prev.date,
          totalMl: nextTotal,
          entries: nextEntries,
          updatedAt: new Date().toISOString(),
        };
        saveDailyWater(nextState);
        return nextState;
      });

      return { success: true };
    },
    []
  );

  // Undo latest entry
  const undoLastEntry = useCallback(() => {
    setWaterState((prev) => {
      if (prev.entries.length === 0) return prev;
      const [entryToRemove, ...remainingEntries] = prev.entries;
      const nextTotal = Math.max(0, prev.totalMl - entryToRemove.amountMl);
      const nextState: DailyWaterStorage = {
        date: prev.date,
        totalMl: nextTotal,
        entries: remainingEntries,
        updatedAt: new Date().toISOString(),
      };
      saveDailyWater(nextState);
      return nextState;
    });
  }, []);

  // Remove specific entry by ID
  const removeEntry = useCallback((id: string) => {
    setWaterState((prev) => {
      const entryToRemove = prev.entries.find((e) => e.id === id);
      if (!entryToRemove) return prev;
      const remainingEntries = prev.entries.filter((e) => e.id !== id);
      const nextTotal = Math.max(0, prev.totalMl - entryToRemove.amountMl);
      const nextState: DailyWaterStorage = {
        date: prev.date,
        totalMl: nextTotal,
        entries: remainingEntries,
        updatedAt: new Date().toISOString(),
      };
      saveDailyWater(nextState);
      return nextState;
    });
  }, []);

  const value = useMemo<WaterContextType>(
    () => ({
      totalMl,
      targetMl,
      litersConsumed,
      litersTarget,
      progressPercent,
      actualPercent,
      isTargetReached,
      entries,
      lastEntry,
      addWater,
      undoLastEntry,
      removeEntry,
      setWaterTarget,
      resetTodayWater,
      todayKey,
    }),
    [
      totalMl,
      targetMl,
      litersConsumed,
      litersTarget,
      progressPercent,
      actualPercent,
      isTargetReached,
      entries,
      lastEntry,
      addWater,
      undoLastEntry,
      removeEntry,
      setWaterTarget,
      resetTodayWater,
      todayKey,
    ]
  );

  return <WaterContext.Provider value={value}>{children}</WaterContext.Provider>;
};

export function useWaterSystem() {
  const context = useContext(WaterContext);
  if (!context) {
    throw new Error('useWaterSystem must be used within a WaterProvider');
  }
  return context;
}
