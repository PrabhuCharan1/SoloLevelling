import { DaySummary, WeeklyStats, MonthlyStats } from '../types.ts';
import { DEFAULT_DAILY_QUESTS } from '../data/defaultQuests.ts';
import { loadRoutine } from './routineStorage.ts';
import { WEEKLY_WORKOUT_SCHEDULE } from '../data/workoutSchedule.ts';
import {
  getTodayDateKey,
  loadDailyQuestState,
  loadUserProfile,
} from './questStorage.ts';
import { loadDailyWorkout } from './workoutStorage.ts';
import { loadDailyWater } from './waterStorage.ts';
import { loadDailyReward } from './rewardStorage.ts';
import { loadCustomWorkoutDaily, loadCustomWorkouts } from './customWorkoutStorage.ts';

/**
 * Calculates the longest streak of consecutive completed days from historical records.
 */
export function calculateLongestStreak(completedDays: string[]): number {
  if (!completedDays || completedDays.length === 0) return 0;

  // Deduplicate and sort dates ascending
  const uniqueDates = Array.from(new Set(completedDays)).sort();
  if (uniqueDates.length <= 1) return uniqueDates.length;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const [prevY, prevM, prevD] = uniqueDates[i - 1].split('-').map(Number);
    const [currY, currM, currD] = uniqueDates[i].split('-').map(Number);

    const prevDate = new Date(prevY, prevM - 1, prevD);
    const expectedNext = new Date(prevDate);
    expectedNext.setDate(prevDate.getDate() + 1);

    const expectedKey = getTodayDateKey(expectedNext);

    if (uniqueDates[i] === expectedKey) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Discovers all unique calendar dates present across localStorage records and user profile.
 */
export function getAllRecordedDates(todayKey: string = getTodayDateKey()): string[] {
  const datesSet = new Set<string>();
  datesSet.add(todayKey);

  // 1. Check user profile completedDays
  const profile = loadUserProfile(todayKey);
  if (profile.completedDays && Array.isArray(profile.completedDays)) {
    profile.completedDays.forEach((d) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        datesSet.add(d);
      }
    });
  }

  // 2. Scan localStorage keys for recorded dates
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const storage = window.localStorage;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;

        let matchedDate: string | null = null;
        if (key.startsWith('questlife_daily_quests_')) {
          matchedDate = key.replace('questlife_daily_quests_', '');
        } else if (key.startsWith('questlife_daily_')) {
          matchedDate = key.replace('questlife_daily_', '');
        } else if (key.startsWith('questlife_workout_')) {
          matchedDate = key.replace('questlife_workout_', '');
        } else if (key.startsWith('questlife_water_')) {
          matchedDate = key.replace('questlife_water_', '');
        } else if (key.startsWith('questlife_daily_reward_')) {
          matchedDate = key.replace('questlife_daily_reward_', '');
        } else if (key.startsWith('questlife_custom_workout_daily_')) {
          matchedDate = key.replace('questlife_custom_workout_daily_', '');
        }

        if (matchedDate && /^\d{4}-\d{2}-\d{2}$/.test(matchedDate)) {
          datesSet.add(matchedDate);
        }
      }
    } catch (err) {
      console.warn('Error scanning storage for dates:', err);
    }
  }

  return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
}

/**
 * Formats a date string into human-readable versions
 */
export function formatDayLabels(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);

  const dateFormatted = dateObj
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase();

  const displayMonthDay = dateObj
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase();

  return { dateObj, dateFormatted, displayMonthDay };
}

/**
 * Builds a complete DaySummary for a given date.
 * If liveTodayOverride is passed and dateKey matches todayKey, uses live values.
 */
export function getDaySummary(
  dateKey: string,
  liveTodayOverride?: {
    todayKey: string;
    completedCount: number;
    totalCount: number;
    progressPercent: number;
    dailyReward: { revealed: boolean; claimed: boolean; rewardName: string; category: string };
    workout?: { completedCount: number; totalCount: number; isComplete: boolean; title: string; isRestDay: boolean };
    water?: { consumedMl: number; targetMl: number; isTargetReached: boolean };
  }
): DaySummary {
  const { dateObj, dateFormatted, displayMonthDay } = formatDayLabels(dateKey);
  const profile = loadUserProfile(dateKey);
  const isHistoricalCompletedDay = Boolean(profile.completedDays?.includes(dateKey));

  // Check if this date is today and has live in-memory override
  if (liveTodayOverride && liveTodayOverride.todayKey === dateKey) {
    const { completedCount, totalCount, progressPercent, dailyReward, workout, water } = liveTodayOverride;

    const questXp = DEFAULT_DAILY_QUESTS.slice(0, completedCount).reduce((sum, q) => sum + q.xp, 0);
    const customDailyToday = loadCustomWorkoutDaily(dateKey);
    const customListToday = loadCustomWorkouts();
    const completedCustomToday = customListToday.filter((w) =>
      customDailyToday.completedWorkoutIds.includes(w.id)
    );
    const customXpToday = completedCustomToday.reduce((sum, w) => sum + w.xpReward, 0);
    const workoutCompleted = (workout ? workout.isComplete : false) || completedCustomToday.length > 0;
    const workoutXp = (workout?.isComplete && !workout?.isRestDay ? 150 : 0) + customXpToday;
    const totalXp = questXp + workoutXp;

    const consumedLiters = water ? (water.consumedMl / 1000).toFixed(2) : '0.00';
    const targetLiters = water ? (water.targetMl / 1000).toFixed(2) : '3.00';

    return {
      date: dateKey,
      dateFormatted,
      displayMonthDay,
      completedCount,
      totalCount,
      progressPercent,
      xpEarned: totalXp,
      workout: {
        hasWorkout: !workout?.isRestDay,
        isRestDay: Boolean(workout?.isRestDay),
        title: workout?.title || 'DAILY WORKOUT',
        completedCount: workout?.completedCount || 0,
        totalCount: workout?.totalCount || 0,
        progressPercent:
          workout && workout.totalCount > 0
            ? Math.round((workout.completedCount / workout.totalCount) * 100)
            : 0,
        completed: workoutCompleted,
      },
      water: {
        consumedMl: water?.consumedMl || 0,
        targetMl: water?.targetMl || 3000,
        consumedLiters,
        targetLiters,
        isTargetReached: Boolean(water?.isTargetReached),
      },
      reward: {
        revealed: dailyReward.revealed,
        claimed: dailyReward.claimed,
        name: dailyReward.revealed ? dailyReward.rewardName : null,
        category: dailyReward.revealed ? dailyReward.category : null,
        statusText: dailyReward.revealed
          ? 'REWARD CLAIMED ✓'
          : progressPercent === 100
          ? 'READY TO REVEAL'
          : 'REWARD LOCKED',
      },
      is100Percent: progressPercent === 100,
      hasActivity: completedCount > 0 || (workout && workout.completedCount > 0) || (water && water.consumedMl > 0) || progressPercent === 100,
    };
  }

  // 1. Quests for historical date
  const questState = loadDailyQuestState(dateKey);
  const rawCompleted = questState.completedIds || [];
  let completedCount = rawCompleted.length;
  const userRoutine = loadRoutine();
  const totalCount = userRoutine.length;

  if (completedCount === 0 && isHistoricalCompletedDay) {
    completedCount = totalCount;
  }

  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
  const questXp = userRoutine.filter((q) => rawCompleted.includes(q.id)).reduce((sum, q) => sum + q.xp, 0);

  // 2. Workout
  const dayOfWeek = dateObj.getDay();
  const dayPlan = WEEKLY_WORKOUT_SCHEDULE[dayOfWeek];
  const isRestDay = dayPlan ? dayPlan.isRestDay : false;
  const workoutTitle = dayPlan ? dayPlan.title : 'DAILY WORKOUT';

  const workoutState = loadDailyWorkout(dateKey, dayOfWeek);
  let workoutCompletedCount = 0;
  let workoutTotalCount = 0;

  if (dayPlan && !dayPlan.isRestDay) {
    dayPlan.groups.forEach((g) => {
      workoutTotalCount += g.exercises.length;
      g.exercises.forEach((ex) => {
        if (workoutState.exercises?.[ex.id]?.completed) {
          workoutCompletedCount++;
        }
      });
    });
  }

  let workoutCompleted = !isRestDay && workoutTotalCount > 0 && workoutCompletedCount === workoutTotalCount;
  if (!workoutCompleted && isHistoricalCompletedDay && !isRestDay) {
    workoutCompleted = true;
    workoutCompletedCount = workoutTotalCount;
  }

  const workoutXp = workoutCompleted && !isRestDay ? 150 : 0;
  const workoutProgress = workoutTotalCount > 0 ? Math.round((workoutCompletedCount / workoutTotalCount) * 100) : 0;

  // 3. Water
  const waterState = loadDailyWater(dateKey);
  let consumedMl = waterState.totalMl || 0;
  const targetMl = 3000;

  if (consumedMl === 0 && isHistoricalCompletedDay) {
    consumedMl = 3000;
  }
  const isWaterReached = consumedMl >= targetMl;

  // 4. Reward
  const rewardState = loadDailyReward(dateKey);
  const isRewardRevealed = rewardState.revealed;
  const isRewardClaimed = rewardState.claimed;

  let rewardStatusText = 'REWARD LOCKED';
  if (isRewardRevealed) {
    rewardStatusText = 'REWARD CLAIMED ✓';
  } else if (progressPercent === 100) {
    rewardStatusText = 'READY TO REVEAL';
  }

  // 4.5 Custom Workouts for historical date
  const customDaily = loadCustomWorkoutDaily(dateKey);
  const customList = loadCustomWorkouts();
  const completedCustomWorkouts = customList.filter((w) =>
    customDaily.completedWorkoutIds.includes(w.id)
  );
  const customWorkoutXp = completedCustomWorkouts.reduce((sum, w) => sum + w.xpReward, 0);
  const hasCustomWorkoutActivity =
    customDaily.completedWorkoutIds.length > 0 ||
    Object.values(customDaily.exerciseStates || {}).some((s) => s.completed);

  const overallWorkoutCompleted = workoutCompleted || customDaily.completedWorkoutIds.length > 0;
  const totalXp = questXp + workoutXp + customWorkoutXp;
  const hasActivity =
    completedCount > 0 ||
    workoutCompletedCount > 0 ||
    hasCustomWorkoutActivity ||
    consumedMl > 0 ||
    isHistoricalCompletedDay;

  return {
    date: dateKey,
    dateFormatted,
    displayMonthDay,
    completedCount,
    totalCount,
    progressPercent,
    xpEarned: totalXp,
    workout: {
      hasWorkout: !isRestDay || customList.length > 0,
      isRestDay: isRestDay && customList.length === 0,
      title: workoutTitle,
      completedCount: workoutCompletedCount + customDaily.completedWorkoutIds.length,
      totalCount: workoutTotalCount + (customList.length > 0 ? customList.length : 0),
      progressPercent: workoutProgress,
      completed: overallWorkoutCompleted,
    },
    water: {
      consumedMl,
      targetMl,
      consumedLiters: (consumedMl / 1000).toFixed(2),
      targetLiters: (targetMl / 1000).toFixed(2),
      isTargetReached: isWaterReached,
    },
    reward: {
      revealed: isRewardRevealed,
      claimed: isRewardClaimed,
      name: isRewardRevealed ? rewardState.rewardName : null,
      category: isRewardRevealed ? rewardState.category : null,
      statusText: rewardStatusText,
    },
    is100Percent: progressPercent === 100,
    hasActivity,
  };
}

/**
 * Calculates current week's statistics (Monday through Sunday)
 */
export function getWeeklyStats(
  todayKey: string = getTodayDateKey(),
  liveTodayOverride?: Parameters<typeof getDaySummary>[1]
): WeeklyStats {
  const [y, m, d] = todayKey.split('-').map(Number);
  const current = new Date(y, m - 1, d);

  // Find Monday of the current week (ISO week: Monday is index 0)
  const currentDayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon ...
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const days: WeeklyStats['days'] = [];
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  let totalPercentSum = 0;
  let activeDaysCount = 0;
  let completedDaysCount = 0;
  let totalXpEarned = 0;
  let workoutsCompleted = 0;
  let waterTargetDays = 0;

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dayKey = getTodayDateKey(dayDate);
    const isToday = dayKey === todayKey;
    const isFuture = dayKey > todayKey;

    const summary = getDaySummary(dayKey, isToday ? liveTodayOverride : undefined);
    const plan = WEEKLY_WORKOUT_SCHEDULE[dayDate.getDay()];
    const isRestDay = plan ? plan.isRestDay : false;

    if (!isFuture) {
      activeDaysCount++;
      totalPercentSum += summary.progressPercent;
      totalXpEarned += summary.xpEarned;

      if (summary.progressPercent === 100) {
        completedDaysCount++;
      }
      if (summary.workout.completed && !isRestDay) {
        workoutsCompleted++;
      }
      if (summary.water.isTargetReached) {
        waterTargetDays++;
      }
    }

    days.push({
      date: dayKey,
      dayName: dayNames[i],
      dayNumber: dayDate.getDate(),
      completionPercent: isFuture ? 0 : summary.progressPercent,
      isToday,
      isFuture,
      isRestDay,
      hasData: summary.hasActivity,
    });
  }

  const averageCompletion =
    activeDaysCount > 0 ? Math.round(totalPercentSum / activeDaysCount) : 0;

  return {
    averageCompletion,
    completedDaysCount,
    totalXpEarned,
    workoutsCompleted,
    waterTargetDays,
    days,
  };
}

/**
 * Calculates current month's statistics
 */
export function getMonthlyStats(
  year: number,
  month: number, // 1 to 12
  todayKey: string = getTodayDateKey(),
  liveTodayOverride?: Parameters<typeof getDaySummary>[1]
): MonthlyStats {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthNames = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  const monthName = `${monthNames[month - 1]} ${year}`;

  const dailyRecords: DaySummary[] = [];
  let totalPercentSum = 0;
  let activeDaysCount = 0;
  let completedDaysCount = 0;
  let totalXpEarned = 0;
  let workoutSessionsCount = 0;
  let waterTargetDaysCount = 0;

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dayStr = String(dayNum).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const dayKey = `${year}-${monthStr}-${dayStr}`;

    const isToday = dayKey === todayKey;
    const isFuture = dayKey > todayKey;

    const summary = getDaySummary(dayKey, isToday ? liveTodayOverride : undefined);

    if (summary.hasActivity || isToday) {
      dailyRecords.push(summary);
    }

    if (!isFuture && (summary.hasActivity || isToday)) {
      activeDaysCount++;
      totalPercentSum += summary.progressPercent;
      totalXpEarned += summary.xpEarned;

      if (summary.progressPercent === 100) {
        completedDaysCount++;
      }
      if (summary.workout.completed && !summary.workout.isRestDay) {
        workoutSessionsCount++;
      }
      if (summary.water.isTargetReached) {
        waterTargetDaysCount++;
      }
    }
  }

  // Sort records newest first
  dailyRecords.sort((a, b) => b.date.localeCompare(a.date));

  const averageCompletion =
    activeDaysCount > 0 ? Math.round(totalPercentSum / activeDaysCount) : 0;

  return {
    year,
    month,
    monthName,
    averageCompletion,
    completedDaysCount,
    totalXpEarned,
    workoutSessionsCount,
    waterTargetDaysCount,
    dailyRecords,
  };
}

/**
 * Returns all historical days that have saved data or completed activities
 */
export function getAllHistorySummaries(
  todayKey: string = getTodayDateKey(),
  liveTodayOverride?: Parameters<typeof getDaySummary>[1]
): DaySummary[] {
  const allDates = getAllRecordedDates(todayKey);
  return allDates.map((dateKey) => getDaySummary(dateKey, liveTodayOverride));
}
