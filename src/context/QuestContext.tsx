import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  QuestItem,
  DailyRewardRecord,
  RoutineItemConfig,
  QuestCategory,
  TaskVerificationRecord,
  TaskCompletionMethod,
  TaskVerificationStatus,
  TaskVerificationMethod,
} from '../types.ts';
import {
  loadTaskVerificationsForDate,
  saveTaskVerificationsForDate,
  recordTaskVerification,
  removeTaskVerification,
} from '../utils/taskVerificationStorage.ts';
import { DEFAULT_DAILY_QUESTS, INITIAL_BASE_XP } from '../data/defaultQuests.ts';
import { DEFAULT_ROUTINE_ITEMS } from '../data/defaultRoutine.ts';
import {
  getTodayDateKey,
  formatDisplayDate,
  loadDailyQuestState,
  saveDailyQuestState,
  loadUserProfile,
  saveUserProfile,
  calculateStreak,
  advanceSimulatedDays,
  resetSimulatedDate,
} from '../utils/questStorage.ts';
import {
  loadDailyReward,
  revealDailyReward,
  claimDailyReward,
} from '../utils/rewardStorage.ts';
import {
  loadRoutine,
  saveRoutine,
  resetRoutineToDefault,
  addCustomTask,
} from '../utils/routineStorage.ts';
import {
  calculateLongestStreak,
} from '../utils/historyManager.ts';
import {
  downloadUserDataBackup,
  executeResetTodayProgress,
  executeResetAllData,
  validateBackupFileContent,
  applyRestoredBackup,
} from '../utils/exportManager.ts';
import {
  checkAndRepairStoredData,
  recordXpTransaction,
  reverseXpTransaction,
  hasXpTransaction,
  getXpTransactionsForDate,
} from '../utils/storageCore.ts';
import { getLevelInfo, LevelInfo } from '../utils/levelSystem.ts';
import { LevelUpModal } from '../components/LevelUpModal.tsx';
import { XpFeedbackToast, XpNotificationItem } from '../components/XpFeedbackToast.tsx';
import { notifyQuestCompletion, notifyRewardReady } from '../utils/notificationManager.ts';
import { loadSettings } from '../utils/settingsStorage.ts';
import { audioManager } from '../utils/audioManager.ts';

// Run self-healing data integrity check once on load
checkAndRepairStoredData();

interface QuestContextType {
  userName: string;
  updateUserName: (name: string) => void;
  routineItems: RoutineItemConfig[];
  updateRoutineItem: (id: string, updates: Partial<RoutineItemConfig>) => void;
  toggleRoutineItemEnabled: (id: string) => void;
  addCustomRoutineItem: (task: {
    title: string;
    category?: QuestCategory;
    startTime?: string;
    endTime?: string;
    duration?: string;
    xp?: number;
    verificationMethod?: TaskVerificationMethod;
    recurring?: boolean;
    daysOfWeek?: number[];
  }) => { success: boolean; error?: string; newItem?: RoutineItemConfig };
  deleteCustomRoutineItem: (id: string) => void;
  resetRoutineToDefaults: () => void;
  quests: QuestItem[];
  completedIds: string[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  xp: number;
  levelInfo: LevelInfo;
  streak: number;
  longestStreak: number;
  totalCompletedDaysCount: number;
  completedDays: string[];
  todayKey: string;
  todayFormatted: string;
  dailyReward: DailyRewardRecord;
  isRewardReady: boolean;
  isRewardRevealed: boolean;
  isRewardClaimed: boolean;
  revealDailyRewardAction: () => Promise<DailyRewardRecord | null>;
  claimDailyRewardAction: () => void;
  awardCustomWorkoutXp: (workoutId: string, amount: number, workoutName: string) => boolean;
  reverseCustomWorkoutXp: (workoutId: string) => boolean;
  toggleQuest: (id: string) => void;
  setQuestCompleted: (id: string, completed: boolean) => void;
  isQuestCompleted: (id: string) => boolean;
  taskVerifications: Record<string, TaskVerificationRecord>;
  completeQuestWithVerification: (
    id: string,
    method: TaskCompletionMethod,
    details?: {
      capturedPhotoUrl?: string;
      captureTimestamp?: number;
      verificationStatus?: TaskVerificationStatus;
      targetTimeStr?: string;
      allowedWindowStr?: string;
    }
  ) => Promise<{ success: boolean; isNew: boolean; xpAwarded: number }>;
  getTaskVerification: (id: string) => TaskVerificationRecord | undefined;
  completeAllForTest: () => void;
  acknowledgeLevelUp: () => void;
  advanceDayForTesting: () => void;
  resetDayForTesting: () => void;
  resetTodayProgress: () => void;
  resetAllData: () => void;
  exportUserDataJson: () => void;
  restoreBackupData: (backupJsonString: string) => { success: boolean; error?: string };
}


const QuestContext = createContext<QuestContextType | undefined>(undefined);

export const QuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active date key (YYYY-MM-DD)
  const [todayKey, setTodayKey] = useState<string>(getTodayDateKey);
  const [todayFormatted, setTodayFormatted] = useState<string>(formatDisplayDate);

  // Set of completed quest IDs for today
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    const key = getTodayDateKey();
    const stored = loadDailyQuestState(key);
    return stored.completedIds;
  });

  // User profile storage initialization
  const initialProfile = useMemo(() => {
    const key = getTodayDateKey();
    return loadUserProfile(key);
  }, []);

  // Hunter identity / user name
  const [userName, setUserName] = useState<string>(initialProfile.userName || '');

  // Daily Routine custom configuration
  const [routineItems, setRoutineItems] = useState<RoutineItemConfig[]>(() => loadRoutine());

  // Task verification records for today
  const [taskVerifications, setTaskVerifications] = useState<Record<string, TaskVerificationRecord>>(() => {
    return loadTaskVerificationsForDate(getTodayDateKey());
  });

  // Base XP (starting from saved lifetime XP before today's quests)
  const [baseXP, setBaseXP] = useState<number>(initialProfile.baseXP ?? INITIAL_BASE_XP);

  // Completed calendar dates
  const [completedDays, setCompletedDays] = useState<string[]>(
    initialProfile.completedDays || []
  );

  // Level acknowledged state (to prevent repeating level-up modal on refresh)
  const [lastAcknowledgedLevel, setLastAcknowledgedLevel] = useState<number>(() => {
    return (
      initialProfile.lastAcknowledgedLevel ??
      getLevelInfo(initialProfile.totalXP ?? INITIAL_BASE_XP).level
    );
  });

  // Level-up modal state
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const [levelUpTarget, setLevelUpTarget] = useState({ level: 1, nextLevelXp: 500 });

  // Floating XP feedback toasts
  const [xpNotifications, setXpNotifications] = useState<XpNotificationItem[]>([]);
  const [streakNotification, setStreakNotification] = useState<{
    visible: boolean;
    days: number;
  } | null>(null);

  // Daily Mystery Reward State (Phased persistence)
  const [dailyReward, setDailyReward] = useState<DailyRewardRecord>(() => {
    return loadDailyReward(getTodayDateKey());
  });

  // Derived active quests from enabled routine items
  const quests = useMemo<QuestItem[]>(() => {
    const completedSet = new Set(completedIds);
    const currentDayOfWeek = new Date().getDay();

    return routineItems
      .filter((item) => {
        if (item.enabled === false) return false;
        if (item.daysOfWeek && item.daysOfWeek.length > 0) {
          return item.daysOfWeek.includes(currentDayOfWeek);
        }
        return true;
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        xp: item.xp,
        completed: completedSet.has(item.id),
        timeSpan: item.timeSpan,
        startTime: item.startTime,
        endTime: item.endTime,
        duration: item.duration,
        isCustom: item.isCustom,
        enabled: item.enabled,
        verificationMethod: item.verificationMethod || 'MANUAL + CAPTURE',
        recurring: item.recurring,
        daysOfWeek: item.daysOfWeek,
      }))
      .sort((a, b) => {
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }, [routineItems, completedIds]);

  // Routine management methods
  const updateUserName = useCallback((newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    saveUserProfile({
      userName: trimmed,
      avatarInitial: trimmed.charAt(0).toUpperCase(),
      baseXP,
      totalXP: xp,
      streak,
      lastActiveDate: todayKey,
      completedDays,
      lastAcknowledgedLevel,
    });
  }, [baseXP, todayKey, completedDays, lastAcknowledgedLevel]);

  const updateRoutineItem = useCallback((id: string, updates: Partial<RoutineItemConfig>) => {
    setRoutineItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, ...updates };
          if (updates.startTime || updates.endTime) {
            const start = updates.startTime || item.startTime;
            const end = updates.endTime !== undefined ? updates.endTime : item.endTime;
            newItem.timeSpan = end ? `${start} to ${end}` : start;
          }
          return newItem;
        }
        return item;
      });
      saveRoutine(updated);
      return updated;
    });
  }, []);

  const toggleRoutineItemEnabled = useCallback((id: string) => {
    setRoutineItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
      saveRoutine(updated);
      return updated;
    });
  }, []);

  const addCustomRoutineItem = useCallback(
    (task: {
      title: string;
      category?: QuestCategory;
      startTime?: string;
      endTime?: string;
      duration?: string;
      xp?: number;
      verificationMethod?: TaskVerificationMethod;
      recurring?: boolean;
      daysOfWeek?: number[];
    }) => {
      const result = addCustomTask(routineItems, task);
      if (result.success) {
        setRoutineItems(result.routine);
      }
      return { success: result.success, error: result.error, newItem: result.newItem };
    },
    [routineItems]
  );

  const deleteCustomRoutineItem = useCallback((id: string) => {
    setRoutineItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveRoutine(updated);
      return updated;
    });
  }, []);

  const resetRoutineToDefaults = useCallback(() => {
    const restored = resetRoutineToDefault();
    setRoutineItems(restored);
  }, []);

  // Daily quest completion metrics
  const completedCount = useMemo(() => {
    return quests.filter((q) => q.completed).length;
  }, [quests]);

  const totalCount = quests.length;

  const progressPercent = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
  }, [completedCount, totalCount]);

  // Ledger version trigger to react to atomic non-quest XP transactions (custom workouts, rewards)
  const [ledgerVersion, setLedgerVersion] = useState(0);

  // Dynamic non-quest XP earned today from ledger transactions (e.g. custom workouts, bonus rewards)
  const todayNonQuestXp = useMemo(() => {
    const transactions = getXpTransactionsForDate(todayKey);
    return transactions
      .filter((tx) => tx.source !== 'quest')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [todayKey, ledgerVersion]);

  // Centralized Lifetime Total XP: baseXP + sum of all completed daily quests today + non-quest ledger XP
  const xp = useMemo(() => {
    const todayEarned = quests
      .filter((q) => q.completed)
      .reduce((sum, q) => sum + q.xp, 0);
    return baseXP + todayEarned + todayNonQuestXp;
  }, [baseXP, quests, todayNonQuestXp]);

  // Dynamic Hunter Level Info derived from total XP
  const levelInfo = useMemo(() => {
    return getLevelInfo(xp);
  }, [xp]);

  // Dynamic Current Streak derived from completedDays and todayKey
  const streak = useMemo(() => {
    return calculateStreak(completedDays, todayKey);
  }, [completedDays, todayKey]);

  // Longest streak and total completed days from history
  const longestStreak = useMemo(() => {
    return calculateLongestStreak(completedDays);
  }, [completedDays]);

  const totalCompletedDaysCount = completedDays.length;

  // Trigger floating XP toast
  const triggerXpGain = useCallback((amount: number, title: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setXpNotifications((prev) => [...prev, { id, amount, title }]);

    setTimeout(() => {
      setXpNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 2000);
  }, []);

  // Level-up detection (when current level exceeds acknowledged level)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (levelInfo.level > lastAcknowledgedLevel) {
      setLevelUpTarget({
        level: levelInfo.level,
        nextLevelXp: levelInfo.nextLevelXp,
      });
      setIsLevelUpModalOpen(true);
      audioManager.playLevelUp();
    }
  }, [levelInfo.level, levelInfo.nextLevelXp, lastAcknowledgedLevel]);

  // Daily completion handling (100% progress completes the day)
  useEffect(() => {
    if (totalCount === 0) return;

    if (progressPercent === 100) {
      const currentSettings = loadSettings();
      if (currentSettings.notifications?.rewardReady) {
        notifyRewardReady().catch(() => {});
      }

      if (!completedDays.includes(todayKey)) {
        const nextDays = [...completedDays, todayKey].sort();
        setCompletedDays(nextDays);
        audioManager.playDailyComplete();

        const newStreak = calculateStreak(nextDays, todayKey);
        setStreakNotification({ visible: true, days: newStreak });
        setTimeout(() => {
          setStreakNotification(null);
        }, 3000);
      }
    } else {
      if (completedDays.includes(todayKey)) {
        const nextDays = completedDays.filter((d) => d !== todayKey);
        setCompletedDays(nextDays);
      }
    }
  }, [progressPercent, totalCount, todayKey, completedDays]);

  // Persist state to localStorage whenever values update
  useEffect(() => {
    saveDailyQuestState({
      date: todayKey,
      completedIds,
      updatedAt: new Date().toISOString(),
    });

    saveUserProfile({
      userName,
      avatarInitial: userName.charAt(0).toUpperCase(),
      baseXP,
      totalXP: xp,
      streak,
      lastActiveDate: todayKey,
      completedDays,
      lastAcknowledgedLevel,
    });
  }, [userName, completedIds, todayKey, baseXP, xp, streak, completedDays, lastAcknowledgedLevel]);

  // Periodic check for day changes (e.g. midnight rollover)
  useEffect(() => {
    const checkDateChange = () => {
      const currentKey = getTodayDateKey();
      if (currentKey !== todayKey) {
        // Roll previous day's earned XP into baseXP
        const previousState = loadDailyQuestState(todayKey);
        const previousEarned = routineItems
          .filter((q) => previousState.completedIds.includes(q.id))
          .reduce((sum, q) => sum + q.xp, 0);

        setBaseXP((prev) => prev + previousEarned);
        setTodayKey(currentKey);
        setTodayFormatted(formatDisplayDate());

        const freshState = loadDailyQuestState(currentKey);
        setCompletedIds(freshState.completedIds);
        setDailyReward(loadDailyReward(currentKey));
        setTaskVerifications(loadTaskVerificationsForDate(currentKey));
      }
    };

    const interval = setInterval(checkDateChange, 15000);
    return () => clearInterval(interval);
  }, [todayKey, routineItems]);

  // Complete quest using either Manual or Capture verification
  const completeQuestWithVerification = useCallback(
    async (
      id: string,
      method: TaskCompletionMethod,
      details?: {
        capturedPhotoUrl?: string;
        captureTimestamp?: number;
        verificationStatus?: TaskVerificationStatus;
        targetTimeStr?: string;
        allowedWindowStr?: string;
      }
    ): Promise<{ success: boolean; isNew: boolean; xpAwarded: number }> => {
      const isAlreadyCompleted = completedIds.includes(id);
      const routineItem = routineItems.find((q) => q.id === id);
      const earnedXp = routineItem?.xp || 25;
      const txId = `quest_${todayKey}_${id}`;

      let actualXpAwarded = 0;
      if (!isAlreadyCompleted) {
        audioManager.playQuestComplete();
        actualXpAwarded = earnedXp;
        // Atomic ledger registration for duplicate XP prevention
        recordXpTransaction({
          id: txId,
          date: todayKey,
          source: 'quest',
          sourceId: id,
          amount: earnedXp,
          timestamp: new Date().toISOString(),
        });

        if (routineItem) {
          triggerXpGain(earnedXp, routineItem.title);
          const currentSettings = loadSettings();
          if (currentSettings.notifications?.questCompletion) {
            notifyQuestCompletion(id, routineItem.title, earnedXp).catch(() => {});
          }
        }
        setCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }

      const verifRecord: TaskVerificationRecord = {
        id: `verif_${todayKey}_${id}`,
        taskId: id,
        userId: 'local_hunter',
        date: todayKey,
        completionMethod: method,
        completedAt: new Date().toISOString(),
        captureTimestamp: details?.captureTimestamp ?? (method === 'capture' ? Date.now() : undefined),
        verificationStatus: details?.verificationStatus ?? (method === 'manual' ? 'manual' : 'verified'),
        xpAwarded: actualXpAwarded,
        targetTimeStr: details?.targetTimeStr,
        allowedWindowStr: details?.allowedWindowStr,
        capturedPhotoUrl: details?.capturedPhotoUrl,
      };

      await recordTaskVerification(verifRecord);
      setTaskVerifications((prev) => ({ ...prev, [id]: verifRecord }));

      return {
        success: true,
        isNew: !isAlreadyCompleted,
        xpAwarded: actualXpAwarded,
      };
    },
    [completedIds, routineItems, todayKey, triggerXpGain]
  );

  const getTaskVerification = useCallback(
    (id: string): TaskVerificationRecord | undefined => {
      return taskVerifications[id];
    },
    [taskVerifications]
  );

  // Toggle quest completion with XP transaction safety
  const toggleQuest = useCallback(
    (id: string) => {
      const routineItem = routineItems.find((q) => q.id === id);
      const isAlreadyCompleted = completedIds.includes(id);
      const txId = `quest_${todayKey}_${id}`;

      if (!isAlreadyCompleted) {
        audioManager.playQuestComplete();
        const earnedXp = routineItem?.xp || 25;
        // Atomic ledger registration for duplicate XP prevention
        recordXpTransaction({
          id: txId,
          date: todayKey,
          source: 'quest',
          sourceId: id,
          amount: earnedXp,
          timestamp: new Date().toISOString(),
        });

        if (routineItem) {
          triggerXpGain(earnedXp, routineItem.title);
          const currentSettings = loadSettings();
          if (currentSettings.notifications?.questCompletion) {
            notifyQuestCompletion(id, routineItem.title, earnedXp).catch(() => {});
          }
        }
        setCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

        // Record default manual verification
        const verifRecord: TaskVerificationRecord = {
          id: `verif_${todayKey}_${id}`,
          taskId: id,
          userId: 'local_hunter',
          date: todayKey,
          completionMethod: 'manual',
          completedAt: new Date().toISOString(),
          verificationStatus: 'manual',
          xpAwarded: earnedXp,
        };
        recordTaskVerification(verifRecord).catch(() => {});
        setTaskVerifications((prev) => ({ ...prev, [id]: verifRecord }));
      } else {
        audioManager.playQuestUncheck();
        // Safe reversal without allowing negative total XP
        reverseXpTransaction(txId);
        removeTaskVerification(todayKey, id).catch(() => {});
        setTaskVerifications((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setCompletedIds((prev) => prev.filter((item) => item !== id));
      }
    },
    [completedIds, routineItems, todayKey, triggerXpGain]
  );

  const completedIdsRef = useRef(completedIds);
  completedIdsRef.current = completedIds;

  const routineItemsRef = useRef(routineItems);
  routineItemsRef.current = routineItems;

  const todayKeyRef = useRef(todayKey);
  todayKeyRef.current = todayKey;

  // Explicitly set quest completion (used by Workout and Water sync)
  const setQuestCompleted = useCallback(
    (id: string, completed: boolean) => {
      const currentCompletedIds = completedIdsRef.current;
      const currentTodayKey = todayKeyRef.current;
      const exists = currentCompletedIds.includes(id);

      if (completed && !exists) {
        audioManager.playQuestComplete();
        const txId = `quest_${currentTodayKey}_${id}`;
        const routineItem = routineItemsRef.current.find((q) => q.id === id);
        const earnedXp = routineItem?.xp || 25;
        recordXpTransaction({
          id: txId,
          date: currentTodayKey,
          source: 'quest',
          sourceId: id,
          amount: earnedXp,
          timestamp: new Date().toISOString(),
        });
        if (routineItem) {
          triggerXpGain(earnedXp, routineItem.title);
        }
        const verifRecord: TaskVerificationRecord = {
          id: `verif_${currentTodayKey}_${id}`,
          taskId: id,
          userId: 'local_hunter',
          date: currentTodayKey,
          completionMethod: 'manual',
          completedAt: new Date().toISOString(),
          verificationStatus: 'manual',
          xpAwarded: earnedXp,
        };
        recordTaskVerification(verifRecord).catch(() => {});
        setTaskVerifications((prevVerif) => ({ ...prevVerif, [id]: verifRecord }));
        setCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      } else if (!completed && exists) {
        audioManager.playQuestUncheck();
        const txId = `quest_${currentTodayKey}_${id}`;
        reverseXpTransaction(txId);
        removeTaskVerification(currentTodayKey, id).catch(() => {});
        setTaskVerifications((prevVerif) => {
          const next = { ...prevVerif };
          delete next[id];
          return next;
        });
        setCompletedIds((prev) => prev.filter((item) => item !== id));
      }
    },
    [triggerXpGain]
  );


  const isQuestCompleted = useCallback(
    (id: string) => {
      return completedIds.includes(id);
    },
    [completedIds]
  );

  // Acknowledge level-up
  const acknowledgeLevelUp = useCallback(() => {
    setIsLevelUpModalOpen(false);
    setLastAcknowledgedLevel(levelInfo.level);
    saveUserProfile({
      userName,
      avatarInitial: userName.charAt(0).toUpperCase(),
      baseXP,
      totalXP: xp,
      streak,
      lastActiveDate: todayKey,
      completedDays,
      lastAcknowledgedLevel: levelInfo.level,
    });
  }, [userName, levelInfo.level, baseXP, xp, streak, todayKey, completedDays]);

  // Complete all daily quests (testing helper)
  const completeAllForTest = useCallback(() => {
    setCompletedIds(routineItems.filter((q) => q.enabled !== false).map((q) => q.id));
  }, [routineItems]);

  // Simulate advancing to the next day (+1 day)
  const advanceDayForTesting = useCallback(() => {
    // 1. Roll today's earned XP into baseXP so lifetime XP is preserved
    const todayEarned = quests
      .filter((q) => q.completed)
      .reduce((sum, q) => sum + q.xp, 0);
    const newBaseXP = baseXP + todayEarned;
    setBaseXP(newBaseXP);

    // 2. Advance simulated date
    const nextKey = advanceSimulatedDays(1);
    setTodayKey(nextKey);
    setTodayFormatted(formatDisplayDate());

    // 3. Load fresh state for the new day
    const nextDayState = loadDailyQuestState(nextKey);
    setCompletedIds(nextDayState.completedIds);
    setDailyReward(loadDailyReward(nextKey));
    setTaskVerifications(loadTaskVerificationsForDate(nextKey));
  }, [quests, baseXP]);

  // Reset simulated date to actual today
  const resetDayForTesting = useCallback(() => {
    const realKey = resetSimulatedDate();
    setTodayKey(realKey);
    setTodayFormatted(formatDisplayDate());
    const realState = loadDailyQuestState(realKey);
    setCompletedIds(realState.completedIds);
    setDailyReward(loadDailyReward(realKey));
    setTaskVerifications(loadTaskVerificationsForDate(realKey));
  }, []);

  // Reward actions & security enforcement
  const isRewardReady = progressPercent === 100 && !dailyReward.revealed;
  const isRewardRevealed = dailyReward.revealed;
  const isRewardClaimed = dailyReward.claimed;

  const revealDailyRewardAction = useCallback(async (): Promise<DailyRewardRecord | null> => {
    if (dailyReward.revealed) {
      return dailyReward;
    }
    if (progressPercent < 100) {
      return null;
    }
    const updated = revealDailyReward(todayKey);
    setDailyReward(updated);
    audioManager.playRewardReveal();
    return updated;
  }, [dailyReward, progressPercent, todayKey]);

  const claimDailyRewardAction = useCallback(() => {
    const updated = claimDailyReward(todayKey);
    setDailyReward(updated);
    audioManager.playRewardClaim();

    const txId = `reward_${todayKey}_${updated.rewardId || 'daily'}`;
    if (!hasXpTransaction(txId)) {
      recordXpTransaction({
        id: txId,
        date: todayKey,
        source: 'reward',
        sourceId: updated.rewardId,
        amount: 50,
        timestamp: new Date().toISOString(),
      });
      setLedgerVersion((v) => v + 1);
      triggerXpGain(50, 'MYSTERY REWARD BONUS');
    }
  }, [todayKey, triggerXpGain]);

  // Award custom workout XP exactly once per day with atomic ledger protection
  const awardCustomWorkoutXp = useCallback(
    (workoutId: string, amount: number, workoutName: string): boolean => {
      const txId = `custom_workout_${todayKey}_${workoutId}`;
      if (hasXpTransaction(txId)) {
        return false; // Already awarded today
      }
      const success = recordXpTransaction({
        id: txId,
        date: todayKey,
        source: 'workout',
        sourceId: workoutId,
        amount,
        timestamp: new Date().toISOString(),
      });
      if (success) {
        setLedgerVersion((v) => v + 1);
        triggerXpGain(amount, workoutName.toUpperCase());
        audioManager.playQuestComplete();
      }
      return success;
    },
    [todayKey, triggerXpGain]
  );

  // Reverse custom workout XP when workout is unmarked
  const reverseCustomWorkoutXp = useCallback(
    (workoutId: string): boolean => {
      const txId = `custom_workout_${todayKey}_${workoutId}`;
      const removed = reverseXpTransaction(txId);
      if (removed) {
        setLedgerVersion((v) => v + 1);
        audioManager.playQuestUncheck();
        return true;
      }
      return false;
    },
    [todayKey]
  );

  // Reset today's progress
  const resetTodayProgress = useCallback(() => {
    executeResetTodayProgress(todayKey);
    saveTaskVerificationsForDate(todayKey, {});
    setTaskVerifications({});
    setCompletedIds([]);
    setCompletedDays((prev) => prev.filter((d) => d !== todayKey));
    setDailyReward(loadDailyReward(todayKey));
  }, [todayKey]);

  // Reset all data
  const resetAllData = useCallback(() => {
    executeResetAllData();
    saveTaskVerificationsForDate(todayKey, {});
    setTaskVerifications({});
    const freshProfile = loadUserProfile(todayKey);
    setUserName(freshProfile.userName || '');
    setBaseXP(freshProfile.baseXP ?? 0);
    setCompletedDays(freshProfile.completedDays || []);
    setLastAcknowledgedLevel(freshProfile.lastAcknowledgedLevel ?? 0);
    setCompletedIds([]);
    setRoutineItems([]);
    setDailyReward(loadDailyReward(todayKey));
  }, [todayKey]);

  // Export all user data as JSON backup
  const exportUserDataJson = useCallback(() => {
    downloadUserDataBackup();
  }, []);

  // Restore backup data from validated JSON
  const restoreBackupData = useCallback(
    (backupJsonString: string): { success: boolean; error?: string } => {
      const validated = validateBackupFileContent(backupJsonString);
      if (!validated.success || !validated.data) {
        return {
          success: false,
          error: validated.error || 'Corrupted or unreadable backup file',
        };
      }

      try {
        applyRestoredBackup(validated.data);
        // Refresh component states immediately
        const freshProfile = loadUserProfile(todayKey);
        setUserName(freshProfile.userName || '');
        setBaseXP(freshProfile.baseXP || INITIAL_BASE_XP);
        setCompletedDays(freshProfile.completedDays || []);
        setLastAcknowledgedLevel(freshProfile.lastAcknowledgedLevel || 1);

        const currentDayState = loadDailyQuestState(todayKey);
        setCompletedIds(currentDayState.completedIds);
        setRoutineItems(loadRoutine());
        setDailyReward(loadDailyReward(todayKey));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to restore QuestLife backup' };
      }
    },
    [todayKey]
  );

  const value = useMemo<QuestContextType>(
    () => ({
      userName,
      updateUserName,
      routineItems,
      updateRoutineItem,
      toggleRoutineItemEnabled,
      addCustomRoutineItem,
      deleteCustomRoutineItem,
      resetRoutineToDefaults,
      quests,
      completedIds,
      completedCount,
      totalCount,
      progressPercent,
      xp,
      levelInfo,
      streak,
      longestStreak,
      totalCompletedDaysCount,
      completedDays,
      todayKey,
      todayFormatted,
      dailyReward,
      isRewardReady,
      isRewardRevealed,
      isRewardClaimed,
      revealDailyRewardAction,
      claimDailyRewardAction,
      awardCustomWorkoutXp,
      reverseCustomWorkoutXp,
      toggleQuest,
      setQuestCompleted,
      isQuestCompleted,
      taskVerifications,
      completeQuestWithVerification,
      getTaskVerification,
      completeAllForTest,
      acknowledgeLevelUp,
      advanceDayForTesting,
      resetDayForTesting,
      resetTodayProgress,
      resetAllData,
      exportUserDataJson,
      restoreBackupData,
    }),
    [
      userName,
      updateUserName,
      routineItems,
      updateRoutineItem,
      toggleRoutineItemEnabled,
      addCustomRoutineItem,
      deleteCustomRoutineItem,
      resetRoutineToDefaults,
      quests,
      completedIds,
      completedCount,
      totalCount,
      progressPercent,
      xp,
      levelInfo,
      streak,
      longestStreak,
      totalCompletedDaysCount,
      completedDays,
      todayKey,
      todayFormatted,
      dailyReward,
      isRewardReady,
      isRewardRevealed,
      isRewardClaimed,
      revealDailyRewardAction,
      claimDailyRewardAction,
      awardCustomWorkoutXp,
      reverseCustomWorkoutXp,
      toggleQuest,
      setQuestCompleted,
      isQuestCompleted,
      taskVerifications,
      completeQuestWithVerification,
      getTaskVerification,
      completeAllForTest,
      acknowledgeLevelUp,
      advanceDayForTesting,
      resetDayForTesting,
      resetTodayProgress,
      resetAllData,
      exportUserDataJson,
      restoreBackupData,
    ]
  );


  return (
    <QuestContext.Provider value={value}>
      {children}
      {/* Floating XP / Streak Feedback Toasts */}
      <XpFeedbackToast
        notifications={xpNotifications}
        streakNotification={streakNotification}
      />
      {/* Futuristic Level Up Modal */}
      <LevelUpModal
        isOpen={isLevelUpModalOpen}
        level={levelUpTarget.level}
        nextLevelXp={levelUpTarget.nextLevelXp}
        onClose={acknowledgeLevelUp}
      />
    </QuestContext.Provider>
  );
};

export function useQuestSystem(): QuestContextType {
  const context = useContext(QuestContext);
  if (!context) {
    throw new Error('useQuestSystem must be used within a QuestProvider');
  }
  return context;
}
