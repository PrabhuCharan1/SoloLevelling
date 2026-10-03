/**
 * QuestLife Tool Handler for Gemini Live Function Calling
 * Safely executes application state queries for Gemini Live tools.
 */

export interface QuestLifeContextPayload {
  userName?: string;
  responseLanguage?: string;
  level?: number;
  rank?: string;
  totalXP?: number;
  xpToNextLevel?: number;
  currentStreak?: number;
  longestStreak?: number;
  date?: string;
  currentTime?: string;
  todayProgress?: number;
  completedQuests?: string[];
  pendingQuests?: Array<{ title: string; category?: string; xp: number; timeSpan?: string }>;
  workoutTitle?: string;
  workoutProgress?: {
    completedCount: number;
    totalCount: number;
    isCompleted: boolean;
    exercises?: Array<{ name: string; completed: boolean; sets?: string }>;
  };
  waterConsumedMl?: number;
  waterTargetMl?: number;
  history?: Array<{ date: string; completedCount: number; streak: number }>;
}

export function executeQuestLifeTool(
  toolName: string,
  args: Record<string, any> = {},
  context: QuestLifeContextPayload = {}
): Record<string, any> {
  const userName = context.userName || 'Charan';
  const hunterName = userName.toUpperCase().startsWith('HUNTER') ? userName : `Hunter ${userName}`;

  switch (toolName) {
    case 'getCurrentUser':
      return {
        hunterName,
        userName,
        rank: context.rank || 'E-RANK',
        level: context.level || 1,
        totalXP: context.totalXP || 0,
        activeStreak: context.currentStreak || 0,
        systemStatus: 'ONLINE',
      };

    case 'getTasks': {
      const categoryFilter = args.category?.toUpperCase();
      let pending = context.pendingQuests || [];
      if (categoryFilter && categoryFilter !== 'ALL') {
        pending = pending.filter((q) => q.category?.toUpperCase() === categoryFilter);
      }
      return {
        completedCount: context.completedQuests?.length || 0,
        completedTasks: context.completedQuests || [],
        pendingCount: pending.length,
        pendingTasks: pending,
        todayProgressPercent: context.todayProgress || 0,
      };
    }

    case 'getCompletedTasks':
      return {
        count: context.completedQuests?.length || 0,
        completedTasks: context.completedQuests || [],
        allCompleted: (context.pendingQuests?.length || 0) === 0 && (context.completedQuests?.length || 0) > 0,
      };

    case 'getPendingTasks':
      return {
        pendingCount: context.pendingQuests?.length || 0,
        pendingTasks: context.pendingQuests || [],
        nextRecommendedTask: context.pendingQuests?.[0] || null,
      };

    case 'getWorkoutData':
      return {
        workoutTitle: context.workoutTitle || 'Daily Workout Routine',
        isCompleted: context.workoutProgress?.isCompleted || false,
        completedExercisesCount: context.workoutProgress?.completedCount || 0,
        totalExercisesCount: context.workoutProgress?.totalCount || 0,
        exercises: context.workoutProgress?.exercises || [],
      };

    case 'getXP':
      return {
        totalXP: context.totalXP || 0,
        xpToNextLevel: context.xpToNextLevel || 500,
        level: context.level || 1,
      };

    case 'getLevel':
      return {
        currentLevel: context.level || 1,
        rank: context.rank || 'E-RANK',
        totalXP: context.totalXP || 0,
        xpToNextLevel: context.xpToNextLevel || 500,
      };

    case 'getRank':
      return {
        currentRank: context.rank || 'E-RANK',
        level: context.level || 1,
        hunterTitle: `${hunterName} • ${context.rank || 'E-RANK'}`,
      };

    case 'getStreak':
      return {
        currentStreakDays: context.currentStreak || 0,
        longestStreakDays: context.longestStreak || context.currentStreak || 0,
        status: (context.currentStreak || 0) > 0 ? 'ACTIVE_STREAK' : 'START_TODAY',
      };

    case 'getProgress':
      return {
        todayCompletionPercent: context.todayProgress || 0,
        tasksCompleted: context.completedQuests?.length || 0,
        tasksTotal: (context.completedQuests?.length || 0) + (context.pendingQuests?.length || 0),
        workoutCompleted: context.workoutProgress?.isCompleted || false,
        waterConsumedMl: context.waterConsumedMl || 0,
        waterTargetMl: context.waterTargetMl || 3000,
      };

    case 'getHistory': {
      const days = typeof args.days === 'number' ? args.days : 7;
      const historyItems = context.history?.slice(-days) || [];
      return {
        daysQueried: days,
        records: historyItems,
        summary: historyItems.length > 0 ? `${historyItems.length} days of recorded activity available.` : 'No previous history recorded yet.',
      };
    }

    default:
      return {
        error: `Unknown tool "${toolName}". Available tools: getCurrentUser, getTasks, getCompletedTasks, getPendingTasks, getWorkoutData, getXP, getLevel, getRank, getStreak, getProgress, getHistory.`,
      };
  }
}
