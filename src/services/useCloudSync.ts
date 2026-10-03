import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';
import { useWaterSystem } from '../context/WaterContext.tsx';
import { useSettings } from '../context/SettingsContext.tsx';
import {
  syncDailyQuestsToCloud,
  syncRoutineToCloud,
  syncSettingsToCloud,
  syncWorkoutToCloud,
  syncWaterToCloud,
} from './supabaseSync.ts';

/**
 * Global background synchronization orchestrator.
 * Keeps local state primary and instantaneous while debouncing updates to Supabase Cloud.
 */
export function useCloudSync() {
  const { user, isAuthenticated, setSyncStatus, isConfigured } = useAuth();
  const { completedIds, todayKey, routineItems } = useQuestSystem();
  const { exerciseStates } = useWorkoutSystem();
  const { entries, totalMl } = useWaterSystem();
  const { settings } = useSettings();

  const isInitialQuests = useRef(true);
  const isInitialRoutine = useRef(true);
  const isInitialWorkout = useRef(true);
  const isInitialWater = useRef(true);
  const isInitialSettings = useRef(true);

  // 1. Sync Daily Quests
  useEffect(() => {
    if (!isAuthenticated || !user || !isConfigured) return;
    if (isInitialQuests.current) {
      isInitialQuests.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await syncDailyQuestsToCloud(user.id, todayKey, completedIds);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('[useCloudSync] Daily quests sync failed:', err);
        setSyncStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [completedIds, todayKey, user, isAuthenticated, isConfigured, setSyncStatus]);

  // 2. Sync Routine
  useEffect(() => {
    if (!isAuthenticated || !user || !isConfigured) return;
    if (isInitialRoutine.current) {
      isInitialRoutine.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await syncRoutineToCloud(user.id, routineItems);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('[useCloudSync] Routine sync failed:', err);
        setSyncStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [routineItems, user, isAuthenticated, isConfigured, setSyncStatus]);

  // 3. Sync Workout History
  useEffect(() => {
    if (!isAuthenticated || !user || !isConfigured) return;
    if (isInitialWorkout.current) {
      isInitialWorkout.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await syncWorkoutToCloud(user.id, todayKey, exerciseStates);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('[useCloudSync] Workout sync failed:', err);
        setSyncStatus('error');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [exerciseStates, todayKey, user, isAuthenticated, isConfigured, setSyncStatus]);

  // 4. Sync Hydration Entries
  useEffect(() => {
    if (!isAuthenticated || !user || !isConfigured) return;
    if (isInitialWater.current) {
      isInitialWater.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await syncWaterToCloud(user.id, todayKey, entries, totalMl);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('[useCloudSync] Water sync failed:', err);
        setSyncStatus('error');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [entries, totalMl, todayKey, user, isAuthenticated, isConfigured, setSyncStatus]);

  // 5. Sync App Settings
  useEffect(() => {
    if (!isAuthenticated || !user || !isConfigured) return;
    if (isInitialSettings.current) {
      isInitialSettings.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await syncSettingsToCloud(user.id, settings);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('[useCloudSync] Settings sync failed:', err);
        setSyncStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [settings, user, isAuthenticated, isConfigured, setSyncStatus]);
}
