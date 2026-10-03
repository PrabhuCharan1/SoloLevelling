/**
 * SCAR Data & Intelligence Service
 * Genuinely connects SCAR to QuestLife's real application state, calculation rules, and data layer.
 * Performs real-time calculations locally with zero hallucination and full authentic data access.
 */

import { AiContextPayload } from '../types.ts';
import { getHunterRank, getLevelInfo, HunterRank } from '../utils/levelSystem.ts';
import {
  getAllRecordedDates,
  calculateLongestStreak,
  getDaySummary,
  getWeeklyStats,
} from '../utils/historyManager.ts';
import { loadUserProfile, getPreviousDateKey } from '../utils/questStorage.ts';
import { loadDailyReward } from '../utils/rewardStorage.ts';

export interface NextRankDetails {
  currentRank: HunterRank;
  nextRank: HunterRank | 'MAX';
  targetLevel: number;
  targetXp: number;
  xpNeeded: number;
}

/**
 * Calculates XP required to achieve the next Hunter Rank tier
 * Strictly derived from QuestLife's progression rules.
 */
export function getNextRankProgress(level: number, xp: number): NextRankDetails {
  const currentRank = getHunterRank(level);

  if (currentRank === 'E-RANK') {
    // Target is D-RANK (Level 11 => 5,000 XP)
    const targetXp = 5000;
    return {
      currentRank,
      nextRank: 'D-RANK',
      targetLevel: 11,
      targetXp,
      xpNeeded: Math.max(0, targetXp - xp),
    };
  } else if (currentRank === 'D-RANK') {
    // Target is C-RANK (Level 21 => 10,000 XP)
    const targetXp = 10000;
    return {
      currentRank,
      nextRank: 'C-RANK',
      targetLevel: 21,
      targetXp,
      xpNeeded: Math.max(0, targetXp - xp),
    };
  } else if (currentRank === 'C-RANK') {
    // Target is B-RANK (Level 31 => 15,000 XP)
    const targetXp = 15000;
    return {
      currentRank,
      nextRank: 'B-RANK',
      targetLevel: 31,
      targetXp,
      xpNeeded: Math.max(0, targetXp - xp),
    };
  } else if (currentRank === 'B-RANK') {
    // Target is A-RANK (Level 50 => 24,500 XP)
    const targetXp = 24500;
    return {
      currentRank,
      nextRank: 'A-RANK',
      targetLevel: 50,
      targetXp,
      xpNeeded: Math.max(0, targetXp - xp),
    };
  } else if (currentRank === 'A-RANK') {
    // Target is S-RANK (Level 80 => 39,500 XP)
    const targetXp = 39500;
    return {
      currentRank,
      nextRank: 'S-RANK',
      targetLevel: 80,
      targetXp,
      xpNeeded: Math.max(0, targetXp - xp),
    };
  }

  // Already S-RANK (Supreme Hunter)
  return {
    currentRank: 'S-RANK',
    nextRank: 'MAX',
    targetLevel: 100,
    targetXp: 49500,
    xpNeeded: 0,
  };
}

/**
 * Gathers complete real telemetry from app storage and context
 */
export function getRealAppTelemetry(context: AiContextPayload) {
  const safeDate = context.date || new Date().toISOString().split('T')[0];
  const safeXp = typeof context.totalXP === 'number' ? context.totalXP : 0;
  const levelData = getLevelInfo(safeXp);
  const rankProgress = getNextRankProgress(levelData.level, safeXp);

  // Profile history
  const profile = loadUserProfile(safeDate);
  const recordedDates = getAllRecordedDates(safeDate);
  const longestStreak = calculateLongestStreak(profile.completedDays || []);

  const pendingQuests = context.pendingQuests || [];
  const completedQuests = context.completedQuests || [];
  const totalQuests = pendingQuests.length + completedQuests.length;

  const waterConsumed = context.waterConsumedMl || 0;
  const waterTarget = context.waterTargetMl || 3000;
  const waterRemaining = Math.max(0, waterTarget - waterConsumed);
  const waterPercent = Math.min(100, Math.round((waterConsumed / waterTarget) * 100));

  const workout = context.workoutProgress || { completedCount: 0, totalCount: 0, isCompleted: false };
  const workoutTitle = context.workoutTitle || 'Daily Workout';

  // Rich real telemetry objects
  const completedTasksDetails = context.completedTasksDetails || [];
  const workoutDetails = context.workoutDetails;
  const prevDateKey = getPreviousDateKey(safeDate);
  const yesterdaySummary = (context.historyDetails?.yesterday !== undefined ? context.historyDetails.yesterday : getDaySummary(prevDateKey)) || null;
  const weeklyStats = (context.weeklyStats && 'averageCompletion' in context.weeklyStats ? context.weeklyStats : getWeeklyStats(safeDate));
  const rawReward = loadDailyReward(safeDate);
  const rewardStatus = context.rewardStatus || {
    revealed: rawReward.revealed,
    claimed: rawReward.claimed,
    rewardName: rawReward.rewardName,
    category: rawReward.category,
    statusText: rawReward.claimed
      ? 'CLAIMED'
      : rawReward.revealed
      ? 'UNLOCKED'
      : 'LOCKED',
  };

  return {
    hunterName: 'Hunter Charan', // Standardized hunter identity
    userName: context.userName || 'Charan',
    level: levelData.level,
    rank: levelData.rank,
    totalXp: safeXp,
    xpToNextLevel: levelData.xpToNext,
    nextLevel: levelData.nextLevel,
    nextLevelXp: levelData.nextLevelXp,
    rankProgress,
    currentStreak: typeof context.currentStreak === 'number' ? context.currentStreak : 0,
    longestStreak: Math.max(longestStreak, typeof context.currentStreak === 'number' ? context.currentStreak : 0),
    recordedDaysCount: recordedDates.length,
    completedDaysCount: (profile.completedDays || []).length,
    completedDays: profile.completedDays || [],
    totalQuests,
    completedQuestsCount: completedQuests.length,
    pendingQuestsCount: pendingQuests.length,
    todayProgress: typeof context.todayProgress === 'number' ? context.todayProgress : (totalQuests > 0 ? Math.round((completedQuests.length / totalQuests) * 100) : 0),
    completedQuestTitles: completedQuests,
    completedTasksDetails,
    pendingQuests,
    workoutTitle,
    workoutCompleted: workout.isCompleted,
    workoutExercisesCompleted: workout.completedCount,
    workoutExercisesTotal: workout.totalCount,
    workoutDetails,
    waterConsumed,
    waterTarget,
    waterRemaining,
    waterPercent,
    currentTime: context.currentTime,
    todayDate: context.date,
    yesterdaySummary,
    weeklyStats,
    rewardStatus,
  };
}

export type QueryLanguage = 'en' | 'te' | 'mixed';

/**
 * Detect language style of query: pure Telugu, Telugu-English mix (Telugish), or English
 */
export function detectQueryLanguage(text: string): QueryLanguage {
  // Telugu unicode range \u0C00-\u0C7F
  const teluguUnicodeRegex = /[\u0C00-\u0C7F]/;
  if (teluguUnicodeRegex.test(text)) {
    return 'te';
  }

  const lower = text.toLowerCase();
  const teluguPhoneticWords = [
    'enti',
    'ela',
    'em',
    'emi',
    'cheppandi',
    'cheppu',
    'kavali',
    'unnay',
    'unai',
    'ainda',
    'ayinda',
    'naa',
    'naaku',
    'naku',
    'enta',
    'entha',
    'cheyali',
    'cheyala',
    'leka',
    'ledu',
    'undi',
    'unnanu',
    'ivvu',
    'opika',
    'kastam',
    'neellu',
    'neelu',
    'thaaganu',
    'taganu',
    'bro',
    'garu',
    'ninna',
    'repu',
  ];

  const hasTeluguPhonetic = teluguPhoneticWords.some((word) =>
    new RegExp(`\\b${word}\\b`, 'i').test(lower)
  );

  if (hasTeluguPhonetic) {
    return 'mixed';
  }

  return 'en';
}

export interface LocalQueryResult {
  handled: boolean;
  text: string;
  language: QueryLanguage;
  intent?: string;
}

/**
 * Process queries locally against genuine QuestLife data.
 * Answers accurately, concisely, and calmly in English, Telugu, or Telugu-English mix.
 */
export function processLocalScarQuery(query: string, context: AiContextPayload): LocalQueryResult {
  const clean = query.trim().toLowerCase();
  const lang = detectQueryLanguage(query);
  const data = getRealAppTelemetry(context);

  // 1. WAKE PHRASE "Scar" or "స్కార్"
  const isJustScar =
    clean === 'scar' ||
    clean === 'hey scar' ||
    clean === 'hi scar' ||
    clean === 'hello scar' ||
    clean === 'స్కార్' ||
    clean === 'హే స్కార్' ||
    clean === 'ok scar';

  if (isJustScar) {
    return {
      handled: true,
      text: 'Yes, Hunter Charan?',
      language: 'en',
      intent: 'wake_word',
    };
  }

  // 2. UNAVAILABLE DATA DETECTION (Explicitly notify when information is not tracked in QuestLife)
  const isUnavailableQuery =
    clean.includes('calorie') ||
    clean.includes('nutrition') ||
    clean.includes('diet') ||
    clean.includes('food') ||
    clean.includes('meal') ||
    clean.includes('what did i eat') ||
    clean.includes('heart rate') ||
    clean.includes('pulse') ||
    clean.includes('blood pressure') ||
    clean.includes('sleep') ||
    clean.includes('rem') ||
    clean.includes('step count') ||
    clean.includes('steps') ||
    clean.includes('gps') ||
    clean.includes('running distance') ||
    clean.includes('mileage') ||
    clean.includes('friend') ||
    clean.includes('leaderboard') ||
    clean.includes('bank') ||
    clean.includes('email') ||
    clean.includes('spotify') ||
    clean.includes('ఆహారం') ||
    clean.includes('నిద్ర');

  if (isUnavailableQuery) {
    let unavailSubject = 'this metric';
    if (clean.includes('calorie') || clean.includes('nutrition') || clean.includes('diet') || clean.includes('food') || clean.includes('meal') || clean.includes('ఆహారం')) {
      unavailSubject = 'nutrition, meals, and calorie consumption';
    } else if (clean.includes('sleep') || clean.includes('rem') || clean.includes('నిద్ర')) {
      unavailSubject = 'sleep cycles, sleep duration, and biometric recovery scores';
    } else if (clean.includes('heart rate') || clean.includes('pulse') || clean.includes('blood pressure')) {
      unavailSubject = 'heart rate and physiological vital signs';
    } else if (clean.includes('step') || clean.includes('gps') || clean.includes('mileage')) {
      unavailSubject = 'step counting, GPS routing, and running mileage';
    }

    if (lang === 'te') {
      return {
        handled: true,
        text: `QuestLife లో ${unavailSubject} ట్రాకింగ్ లేదు చరణ్. మీ రోజువారీ టాస్క్‌లు, వర్కౌట్, నీటి వినియోగం, లెవెల్ మరియు స్ట్రీక్ వివరాలు నేను అందించగలను.`,
        language: 'te',
        intent: 'unavailable_info',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `QuestLife lo ${unavailSubject} track avvadu Charan. Mee daily tasks, workout split, water intake, level and streaks gurinchi adagandi, cheptanu.`,
        language: 'mixed',
        intent: 'unavailable_info',
      };
    }

    return {
      handled: true,
      text: `QuestLife does not track ${unavailSubject}, Charan. I can give you real telemetry on your daily quests, workout exercises, hydration, level, rank, and streaks.`,
      language: 'en',
      intent: 'unavailable_info',
    };
  }

  // 3. LEVEL CALCULATION / FORMULA EXPLANATION
  const isLevelFormulaQuery =
    (clean.includes('how') && clean.includes('level') && (clean.includes('calculated') || clean.includes('formula') || clean.includes('work') || clean.includes('rules'))) ||
    clean.includes('level system') ||
    clean.includes('level formula') ||
    clean.includes('xp rules');

  if (isLevelFormulaQuery) {
    if (lang === 'te') {
      return {
        handled: true,
        text: `ప్రతి 500 XP కి ఒక లెవెల్ పెరుగుతుంది చరణ్. ప్రస్తుతం మీరు ${data.totalXp} XP తో లెవెల్ ${data.level}, ${data.rank} లో ఉన్నారు.`,
        language: 'te',
        intent: 'level_formula',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `Prati 500 XP ki okka level perugutundi Charan. Meeru currently Level ${data.level} in ${data.rank} lo unnaru with ${data.totalXp} XP.`,
        language: 'mixed',
        intent: 'level_formula',
      };
    }

    return {
      handled: true,
      text: `QuestLife calculates your level as your total XP divided by 500 plus one. Every 500 XP advances you one level. Right now you're at Level ${data.level} in ${data.rank} with ${data.totalXp} XP.`,
      language: 'en',
      intent: 'level_formula',
    };
  }

  // 4. LEVEL, XP & RANK QUERIES
  const isLevelOrRank =
    clean.includes('rank') ||
    clean.includes('level') ||
    clean.includes('xp') ||
    clean.includes('ఎంత xp') ||
    clean.includes('ర్యాంక్') ||
    clean.includes('లెవెల్') ||
    (clean.includes('naa') && (clean.includes('level') || clean.includes('rank')));

  if (isLevelOrRank) {
    if (lang === 'te') {
      return {
        handled: true,
        text: `మీరు ప్రస్తుతం లెవెల్ ${data.level}, ${data.rank} లో ఉన్నారు చరణ్. మొత్తం ${data.totalXp} XP సాధించారు. తదుపరి లెవెల్ కి ఇంకా ${data.xpToNextLevel} XP కావాలి.`,
        language: 'te',
        intent: 'level_rank',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `Meeru currently Level ${data.level} in ${data.rank} lo unnaru Charan, with ${data.totalXp} XP. Next level ki inka ${data.xpToNextLevel} XP kavali.`,
        language: 'mixed',
        intent: 'level_rank',
      };
    }

    return {
      handled: true,
      text: `You are currently at Level ${data.level} in ${data.rank} with a total of ${data.totalXp} XP. You need ${data.xpToNextLevel} more XP to reach Level ${data.nextLevel}.`,
      language: 'en',
      intent: 'level_rank',
    };
  }

  // 5. SPECIFIC TASK LOOKUP (e.g. "Did I complete Morning Water?", "Did I do workout?", "Is coding finished?")
  const isSpecificTaskQuery =
    (clean.includes('did i') || clean.includes('have i') || clean.includes('is') || clean.includes('check')) &&
    (clean.includes('complete') || clean.includes('done') || clean.includes('finish'));

  if (isSpecificTaskQuery) {
    // Search within today's completed and pending tasks
    const allKnownQuests = [
      ...data.completedTasksDetails.map((q) => ({ ...q, status: 'COMPLETED' as const })),
      ...data.pendingQuests.map((q) => ({ ...q, status: 'PENDING' as const })),
    ];

    const matchedQuest = allKnownQuests.find((q) => clean.includes(q.title.toLowerCase()));

    if (matchedQuest) {
      if (matchedQuest.status === 'COMPLETED') {
        return {
          handled: true,
          text: `Yes, ${matchedQuest.title} is completed and verified for +${matchedQuest.xp} XP.`,
          language: lang,
          intent: 'task_specific',
        };
      } else {
        return {
          handled: true,
          text: `Not yet Charan, ${matchedQuest.title} is still pending on your schedule for today.`,
          language: lang,
          intent: 'task_specific',
        };
      }
    }
  }

  // 6. COMPLETED TASKS ONLY
  const isCompletedTasksQuery =
    (clean.includes('completed') || clean.includes('finished') || clean.includes('పూర్తయిన')) &&
    (clean.includes('task') || clean.includes('quest') || clean.includes('ఏవి'));

  if (isCompletedTasksQuery) {
    if (data.completedQuestTitles.length === 0) {
      return {
        handled: true,
        text: 'You have not completed any tasks yet today.',
        language: lang,
        intent: 'completed_tasks',
      };
    }

    if (lang === 'te') {
      return {
        handled: true,
        text: `ఈరోజు మీరు ${data.completedQuestsCount} టాస్క్‌లు పూర్తి చేశారు: ${data.completedQuestTitles.join(', ')}. మీ రోజువారీ ప్రోగ్రెస్ ${data.todayProgress}%.`,
        language: 'te',
        intent: 'completed_tasks',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `Ee roju ${data.completedQuestsCount} tasks complete chesaru Charan: ${data.completedQuestTitles.join(', ')}. Daily progress ${data.todayProgress}% undi.`,
        language: 'mixed',
        intent: 'completed_tasks',
      };
    }

    return {
      handled: true,
      text: `You have cleared ${data.completedQuestsCount} tasks today: ${data.completedQuestTitles.join(', ')}. That brings your daily progress to ${data.todayProgress}%.`,
      language: 'en',
      intent: 'completed_tasks',
    };
  }

  // 7. PENDING TASKS ONLY
  const isPendingTasksQuery =
    (clean.includes('pending') || clean.includes('left') || clean.includes('remaining') || clean.includes('మిగిలాయి')) &&
    (clean.includes('task') || clean.includes('quest'));

  if (isPendingTasksQuery) {
    if (data.pendingQuests.length === 0) {
      return {
        handled: true,
        text: 'All your scheduled daily tasks for today are 100% completed!',
        language: lang,
        intent: 'pending_tasks',
      };
    }

    const taskTitles = data.pendingQuests.map((q) => q.title).join(', ');

    if (lang === 'te') {
      return {
        handled: true,
        text: `మీకు ఇంకా ${data.pendingQuestsCount} టాస్క్‌లు మిగిలి ఉన్నాయి: ${taskTitles}.`,
        language: 'te',
        intent: 'pending_tasks',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `Inka ${data.pendingQuestsCount} tasks pending unnay Charan: ${taskTitles}.`,
        language: 'mixed',
        intent: 'pending_tasks',
      };
    }

    return {
      handled: true,
      text: `You have ${data.pendingQuestsCount} tasks remaining: ${taskTitles}.`,
      language: 'en',
      intent: 'pending_tasks',
    };
  }

  // 8. GENERAL TASKS / OBJECTIVES QUERY
  const isTasksQuery =
    clean.includes('task') ||
    clean.includes('quest') ||
    clean.includes('schedule') ||
    clean.includes('టాస్క్') ||
    clean.includes('టాస్కులు') ||
    (clean.includes('today') && clean.includes('enti')) ||
    clean.includes('em unnay');

  if (isTasksQuery) {
    const pendingNames = data.pendingQuests.map((q) => q.title).join(', ');

    if (lang === 'te') {
      return {
        handled: true,
        text: `ఈరోజు మీ ప్రోగ్రెస్ ${data.todayProgress}%. ${data.completedQuestsCount} టాస్క్‌లు పూర్తయ్యాయి. ఇంకా ${pendingNames || 'ఏమీ లేవు'} పెండింగ్‌లో ఉన్నాయి.`,
        language: 'te',
        intent: 'tasks',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `Today mee progress ${data.todayProgress}% undi Charan. ${data.completedQuestsCount} tasks complete chesaru. Pending unnavi: ${pendingNames || 'anni aypoyay'}.`,
        language: 'mixed',
        intent: 'tasks',
      };
    }

    return {
      handled: true,
      text: `Today you are at ${data.todayProgress}% progress with ${data.completedQuestsCount} of ${data.totalQuests} tasks cleared. ${data.pendingQuests.length > 0 ? `Your pending tasks are: ${pendingNames}.` : 'All tasks are cleared for today!'}`,
      language: 'en',
      intent: 'tasks',
    };
  }

  // 9. WORKOUT WEIGHTS / EXERCISES / RECORDS
  const isWorkoutRecordsQuery =
    clean.includes('weight') ||
    clean.includes('record') ||
    clean.includes('lift') ||
    clean.includes('sets') ||
    clean.includes('reps') ||
    clean.includes('బరువు') ||
    (clean.includes('what') && clean.includes('exercise'));

  if (isWorkoutRecordsQuery && (clean.includes('workout') || clean.includes('gym') || clean.includes('exercise') || clean.includes('lift') || clean.includes('weight'))) {
    if (data.workoutDetails && data.workoutDetails.exercises.length > 0) {
      const exerciseLines = data.workoutDetails.exercises.map((ex) => {
        const weightText = ex.loggedWeight !== undefined ? `${ex.loggedWeight} kg` : 'No weight logged';
        const repsText = ex.loggedReps !== undefined ? `${ex.loggedReps} reps` : (ex.targetReps || 'target reps');
        const status = ex.completed ? 'COMPLETED ✓' : 'PENDING';
        return `• ${ex.name}: ${ex.targetSets} sets x ${repsText} | Weight: ${weightText} [${status}]`;
      });

      return {
        handled: true,
        text: `WORKOUT EXERCISE RECORDS: ${data.workoutDetails.splitTitle}
${exerciseLines.join('\n')}
• Exercises Cleared: ${data.workoutDetails.completedCount} / ${data.workoutDetails.totalCount} (${data.workoutDetails.progressPercent}%)`,
        language: lang,
        intent: 'workout_records',
      };
    }
  }

  // 10. GENERAL WORKOUT QUERIES
  const isWorkoutQuery =
    clean.includes('workout') ||
    clean.includes('exercise') ||
    clean.includes('gym') ||
    clean.includes('training') ||
    clean.includes('వర్కౌట్');

  if (isWorkoutQuery) {
    if (lang === 'te') {
      return {
        handled: true,
        text: data.workoutCompleted
          ? `ఈరోజు మీ వర్కౌట్, ${data.workoutTitle}, పూర్తిగా పూర్తయింది చరణ్. మంచి నీరు తాగి శరీరానికి తగినంత విశ్రాంతి ఇవ్వండి.`
          : `ఈరోజు వర్కౌట్ షెడ్యూల్: ${data.workoutTitle}. మీరు ఇప్పటివరకు ${data.workoutExercisesCompleted} లో ${data.workoutExercisesTotal} వ్యాయామాలు పూర్తి చేశారు.`,
        language: 'te',
        intent: 'workout',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: data.workoutCompleted
          ? `Mee ${data.workoutTitle} workout ee roju complete aindi Charan! Great discipline. Hydration and rest meeda focus cheyandi.`
          : `Today's split ${data.workoutTitle}. Meeru ${data.workoutExercisesCompleted} of ${data.workoutExercisesTotal} exercises log chesaru.`,
        language: 'mixed',
        intent: 'workout',
      };
    }

    return {
      handled: true,
      text: data.workoutCompleted
        ? `Your workout for today, ${data.workoutTitle}, is 100% completed. Great discipline! Make sure to hydrate and recover.`
        : `Today's workout is ${data.workoutTitle}. You have logged ${data.workoutExercisesCompleted} of ${data.workoutExercisesTotal} exercises so far.`,
      language: 'en',
      intent: 'workout',
    };
  }

  // 11. YESTERDAY'S PERFORMANCE & HISTORY
  const isYesterdayQuery =
    clean.includes('yesterday') ||
    clean.includes('ninna') ||
    clean.includes('నిన్న');

  if (isYesterdayQuery) {
    const y = data.yesterdaySummary;
    if (y && y.hasActivity) {
      return {
        handled: true,
        text: `Yesterday you cleared ${y.completedCount} of ${y.totalCount} quests, completed ${y.workout?.title || 'your workout'}, drank ${((y.water?.consumedMl || 0) / 1000).toFixed(1)} liters of water, and gained ${y.xpEarned || 0} XP.`,
        language: lang,
        intent: 'yesterday_report',
      };
    } else {
      return {
        handled: true,
        text: `There are no recorded logs for yesterday. Focus today's discipline on continuing your active ${data.currentStreak} day streak.`,
        language: lang,
        intent: 'yesterday_report',
      };
    }
  }

  // 12. WEEKLY STATS / HISTORY
  const isWeeklyQuery =
    clean.includes('weekly') ||
    clean.includes('week') ||
    clean.includes('వారం');

  if (isWeeklyQuery && (clean.includes('stats') || clean.includes('history') || clean.includes('how was') || clean.includes('report') || clean.includes('వారం'))) {
    const w = data.weeklyStats;
    if (w) {
      return {
        handled: true,
        text: `Over the past week, you averaged ${w.averageCompletion}% task completion, finished ${w.workoutsCompleted} workout sessions, and earned ${w.totalXpEarned.toLocaleString()} total XP while maintaining your ${data.currentStreak} day streak.`,
        language: lang,
        intent: 'weekly_report',
      };
    }
  }

  // 13. STREAK & RECORD QUERIES
  const isStreakQuery =
    clean.includes('streak') ||
    clean.includes('history') ||
    clean.includes('days') ||
    clean.includes('రోజులు') ||
    clean.includes('స్ట్రీక్');

  if (isStreakQuery) {
    if (lang === 'te') {
      return {
        handled: true,
        text: `మీరు ప్రస్తుతం ${data.currentStreak} రోజుల స్ట్రీక్ లో ఉన్నారు చరణ్. మీ అత్యధిక రికార్డు ${data.longestStreak} రోజులు.`,
        language: 'te',
        intent: 'streak',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `Meeru currently ${data.currentStreak} days streak lo unnaru Charan. Mee best record ${data.longestStreak} days.`,
        language: 'mixed',
        intent: 'streak',
      };
    }

    return {
      handled: true,
      text: `You are currently on an active ${data.currentStreak} day streak. Your all-time best record is ${data.longestStreak} days.`,
      language: 'en',
      intent: 'streak',
    };
  }

  // 14. DAILY REWARD STATUS
  const isRewardQuery =
    clean.includes('reward') ||
    clean.includes('loot') ||
    clean.includes('రివార్డ్');

  if (isRewardQuery) {
    const r = data.rewardStatus;
    return {
      handled: true,
      text: r.claimed
        ? `You already claimed today's reward: ${r.rewardName || 'Daily Loot'}.`
        : r.revealed
        ? `Today's reward is unlocked: ${r.rewardName || 'Special Reward'}. You can claim it now.`
        : 'Your daily reward unlocks as soon as you clear 100% of your scheduled tasks today.',
      language: lang,
      intent: 'daily_reward',
    };
  }

  // 15. HYDRATION / WATER QUERIES
  const isWaterQuery =
    clean.includes('water') ||
    clean.includes('hydration') ||
    clean.includes('neellu') ||
    clean.includes('neelu') ||
    clean.includes('తాగాను') ||
    clean.includes('నీళ్ళు');

  if (isWaterQuery) {
    if (lang === 'te') {
      return {
        handled: true,
        text: `ఈరోజు మీరు ${data.waterConsumed} ml నీరు తాగారు, ఇది మీ లక్ష్యంలో ${data.waterPercent}%. ${data.waterRemaining > 0 ? `ఇంకా ${data.waterRemaining} ml తాగాలి.` : 'హైడ్రేషన్ లక్ష్యం పూర్తయింది!'}`,
        language: 'te',
        intent: 'water',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `Ee roju ${data.waterConsumed}ml water tagaru Charan, target lo ${data.waterPercent}%. ${data.waterRemaining > 0 ? `Inka ${data.waterRemaining}ml tagali.` : 'Hydration goal complete aindi!'}`,
        language: 'mixed',
        intent: 'water',
      };
    }

    return {
      handled: true,
      text: `You have consumed ${data.waterConsumed} milliliters of water today, which is ${data.waterPercent}% of your ${(data.waterTarget / 1000).toFixed(1)} liter goal. ${data.waterRemaining > 0 ? `You have ${data.waterRemaining} milliliters remaining.` : 'Your hydration target is complete!'}`,
      language: 'en',
      intent: 'water',
    };
  }

  // 16. WHAT SHOULD I DO NEXT / RECOMMENDATIONS
  const isNextActionQuery =
    clean.includes('next') ||
    clean.includes('em cheyali') ||
    clean.includes('what should i do') ||
    clean.includes('next action') ||
    clean.includes('ఏమి చేయాలి') ||
    clean.includes('తదుపరి');

  if (isNextActionQuery) {
    const nextTask = data.pendingQuests[0];

    if (lang === 'te') {
      if (nextTask) {
        return {
          handled: true,
          text: `మీ తదుపరి ప్రాధాన్యత: ${nextTask.title}. ఇది పూర్తి చేస్తే ${nextTask.xp} XP లభిస్తుంది.${!data.workoutCompleted ? ' అలాగే మీ వర్కౌట్ కూడా ఇంకా పెండింగ్‌లో ఉంది.' : ''}`,
          language: 'te',
          intent: 'next_action',
        };
      }
      return {
        handled: true,
        text: `ఈరోజు మీ అన్ని టాస్క్‌లు పూర్తయ్యాయి చరణ్! ప్రశాంతంగా విశ్రాంతి తీసుకోండి.`,
        language: 'te',
        intent: 'next_action',
      };
    }

    if (lang === 'mixed') {
      if (nextTask) {
        return {
          handled: true,
          text: `Mee next priority ${nextTask.title} Charan, +${nextTask.xp} XP vastundi.${!data.workoutCompleted ? ' Workout kuda pending undi, ready unnapudu cheyandi.' : ''}`,
          language: 'mixed',
          intent: 'next_action',
        };
      }
      return {
        handled: true,
        text: `Today scheduled tasks anni complete ayyayi Charan! Take proper rest.`,
        language: 'mixed',
        intent: 'next_action',
      };
    }

    if (nextTask) {
      return {
        handled: true,
        text: `Your next priority is "${nextTask.title}", which will award you ${nextTask.xp} XP upon completion.${!data.workoutCompleted ? ' Your workout session is also pending today.' : ''}`,
        language: 'en',
        intent: 'next_action',
      };
    }

    return {
      handled: true,
      text: 'All your scheduled daily tasks for today are 100% completed. Rest, review your progress, and recover for tomorrow.',
      language: 'en',
      intent: 'next_action',
    };
  }

  // 17. EMPATHETIC / TIRED / DISCOURAGED RESPONSES
  const isDiscouraged =
    clean.includes('tired') ||
    clean.includes('exhausted') ||
    clean.includes('discouraged') ||
    clean.includes('give up') ||
    clean.includes('sad') ||
    clean.includes('depressed') ||
    clean.includes('opika ledu') ||
    clean.includes('kastam') ||
    clean.includes('alaasi') ||
    clean.includes('boring') ||
    clean.includes('stress');

  if (isDiscouraged) {
    if (lang === 'te') {
      return {
        handled: true,
        text: `నేను అర్థం చేసుకోగలను చరణ్. అలసట రావడం సహజం. ఒక నిజమైన హంటర్ విశ్రాంతి తీసుకోవడం కూడా క్రమశిక్షణలో భాగమే. ఒత్తిడి లేకుండా కొద్దిగా నీరు తాగి రెస్ట్ తీసుకోండి.`,
        language: 'te',
        intent: 'empathy',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `I understand Charan. It is completely normal to feel tired. Rest and recovery are crucial parts of leveling up. Take a break and drink some water.`,
        language: 'mixed',
        intent: 'empathy',
      };
    }

    return {
      handled: true,
      text: `I understand, Charan. Fatigue and resistance are natural parts of any leveling journey. True discipline includes knowing when to recover without guilt. Drink some water and get some rest.`,
      language: 'en',
      intent: 'empathy',
    };
  }

  // 18. GREETING / CASUAL
  const isGreeting =
    clean.includes('hi') ||
    clean.includes('hello') ||
    clean.includes('hey') ||
    clean.includes('cheppandi') ||
    clean.includes('నమస్తే') ||
    clean.includes('హలో') ||
    clean.includes('how are you');

  if (isGreeting) {
    if (lang === 'te') {
      return {
        handled: true,
        text: `నమస్కారం చరణ్, SCAR సిద్ధంగా ఉంది. ఈరోజు మీ టాస్క్‌లు, వర్కౌట్ లేదా లెవెల్ గురించి ఏదైనా అడగవచ్చు.`,
        language: 'te',
        intent: 'greeting',
      };
    }

    if (lang === 'mixed') {
      return {
        handled: true,
        text: `Hello Charan! SCAR online lo undi. Mee progress ${data.todayProgress}% undi. Em check cheddam?`,
        language: 'mixed',
        intent: 'greeting',
      };
    }

    return {
      handled: true,
      text: `Hey Charan, SCAR is online and ready. You are at Level ${data.level} with ${data.todayProgress}% daily progress. What would you like to check?`,
      language: 'en',
      intent: 'greeting',
    };
  }

  // 19. Default General Status Summary
  if (lang === 'te') {
    return {
      handled: true,
      text: `చరణ్, మీరు లెవెల్ ${data.level} లో ఉన్నారు. ఈరోజు ${data.completedQuestsCount} టాస్క్‌లు పూర్తి చేసి ${data.todayProgress}% ప్రోగ్రెస్ సాధించారు. మీ స్ట్రీక్ ${data.currentStreak} రోజులు.`,
      language: 'te',
      intent: 'summary',
    };
  }

  if (lang === 'mixed') {
    return {
      handled: true,
      text: `Charan, meeru Level ${data.level} (${data.rank}) lo unnaru. Today ${data.completedQuestsCount} of ${data.totalQuests} tasks done, ${data.todayProgress}% progress. Active streak ${data.currentStreak} days.`,
      language: 'mixed',
      intent: 'summary',
    };
  }

  return {
    handled: true,
    text: `You are currently Level ${data.level} in ${data.rank} with ${data.totalXp} XP and an active ${data.currentStreak} day streak. Today you have cleared ${data.completedQuestsCount} of ${data.totalQuests} tasks for ${data.todayProgress}% progress.`,
    language: 'en',
    intent: 'summary',
  };
}
