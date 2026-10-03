export type AppRoute =
  | '/splash'
  | '/onboarding'
  | '/login'
  | '/signup'
  | '/setup'
  | '/home'
  | '/quests'
  | '/workout'
  | '/workout/chest'
  | '/workout/triceps'
  | '/workout/back'
  | '/workout/biceps'
  | '/workout/shoulders'
  | '/workout/legs'
  | '/workout/core'
  | '/workout/fullbody'
  | '/workout/body-scan'
  | '/water'
  | '/stats'
  | '/history'
  | '/rewards'
  | '/settings'
  | '/settings/routine'
  | '/settings/tasks'
  | '/ai';

export type TaskVerificationMethod = 'MANUAL' | 'CAPTURE' | 'MANUAL + CAPTURE';

export type QuestCategory = 'Morning' | 'College' | 'Evening' | 'Night';

export interface QuestItem {
  id: string;
  title: string;
  category: QuestCategory;
  xp: number;
  completed: boolean;
  timeSpan?: string;
  duration?: string;
  iconName?: string;
  enabled?: boolean;
  isCustom?: boolean;
  startTime?: string;
  endTime?: string;
  verificationMethod?: TaskVerificationMethod;
  recurring?: boolean;
  daysOfWeek?: number[];
}

export interface RoutineItemConfig {
  id: string;
  title: string;
  category: QuestCategory;
  startTime: string;
  endTime?: string;
  duration?: string;
  timeSpan: string;
  xp: number;
  enabled: boolean;
  isCustom?: boolean;
  iconName?: string;
  verificationMethod?: TaskVerificationMethod;
  recurring?: boolean;
  daysOfWeek?: number[];
}

export type AppThemeMode = 'dark' | 'light';

export interface NotificationPreferences {
  dailyReminder: boolean;
  workoutReminder: boolean;
  waterReminder: boolean;
  questCompletion: boolean;
  rewardReady: boolean;
}

export interface GamificationPreferences {
  floatingXp: boolean;
  levelUpModal: boolean;
  soundEffects: boolean;
}

export interface AppSettings {
  theme: AppThemeMode;
  accentColor: 'blue' | 'purple' | 'red' | 'gold';
  compactMode: boolean;
  waterTargetMl: number;
  notifications: NotificationPreferences;
  gamification: GamificationPreferences;
}

export interface DailyQuestStorage {
  date: string; // YYYY-MM-DD
  completedIds: string[];
  updatedAt: string;
}

export interface UserProfileStorage {
  userName?: string;
  avatarInitial?: string;
  hunterTitle?: string;
  baseXP: number;
  totalXP: number;
  streak: number;
  lastActiveDate: string;
  completedDays?: string[];
  lastAcknowledgedLevel?: number;
}

export interface ExerciseDetail {
  id: string;
  name: string;
  setsReps: string;
  defaultWeight: number;
  defaultReps: number;
  weightStep?: number;
}

export interface MuscleGroup {
  id: string;
  name: string;
  badge?: string;
  color?: 'cyan' | 'purple';
  exercises: ExerciseDetail[];
}

export interface DayWorkout {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  dayName: string;
  title: string;
  isRestDay?: boolean;
  groups: MuscleGroup[];
}

export interface ExerciseState {
  completed: boolean;
  weight: number;
  reps: number;
}

export type CustomWorkoutCategory =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Abs/Core'
  | 'Cardio'
  | 'Full Body'
  | 'Other';

export interface CustomExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  duration?: string;
  notes?: string;
}

export interface CustomWorkout {
  id: string;
  name: string;
  category: CustomWorkoutCategory;
  exercises: CustomExercise[];
  schedule: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  xpReward: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomWorkoutDailyState {
  date: string; // YYYY-MM-DD
  completedWorkoutIds: string[];
  exerciseStates: Record<string, { completed: boolean; weight?: number; reps?: number }>;
  updatedAt: string;
}

export interface DailyWorkoutStorage {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  exercises: Record<string, ExerciseState>;
  updatedAt: string;
}

export interface RoutineItem {
  label: string;
  value: string;
  detail?: string;
}

export interface WaterEntry {
  id: string;
  amountMl: number;
  timestamp: string; // ISO format
  timeFormatted: string; // e.g. "08:10 AM"
}

export interface DailyWaterStorage {
  date: string; // YYYY-MM-DD
  totalMl: number;
  entries: WaterEntry[];
  updatedAt: string;
}

export interface MysteryReward {
  id: string;
  name: string;
  category: 'Leisure' | 'Wellness' | 'Entertainment' | 'Achievement' | 'Mindset';
  description: string;
  iconName: string;
  lore: string;
  tagline: string;
}

export interface DailyRewardRecord {
  date: string; // YYYY-MM-DD
  rewardId: string;
  rewardName: string;
  category: string;
  description: string;
  iconName: string;
  lore: string;
  tagline: string;
  revealed: boolean;
  claimed: boolean;
  revealedAt?: string;
  claimedAt?: string;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  dateFormatted: string; // e.g. "WEDNESDAY, SEP 16"
  displayMonthDay: string; // e.g. "SEP 16"
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  xpEarned: number;
  workout: {
    hasWorkout: boolean;
    isRestDay: boolean;
    title: string;
    completedCount: number;
    totalCount: number;
    progressPercent: number;
    completed: boolean;
  };
  water: {
    consumedMl: number;
    targetMl: number;
    consumedLiters: string;
    targetLiters: string;
    isTargetReached: boolean;
  };
  reward: {
    revealed: boolean;
    claimed: boolean;
    name: string | null;
    category: string | null;
    statusText: string;
  };
  is100Percent: boolean;
  hasActivity: boolean;
}

export interface WeeklyStats {
  averageCompletion: number;
  completedDaysCount: number;
  totalXpEarned: number;
  workoutsCompleted: number;
  waterTargetDays: number;
  days: {
    date: string;
    dayName: string; // 'MON', 'TUE', etc.
    dayNumber: number;
    completionPercent: number;
    isToday: boolean;
    isFuture: boolean;
    isRestDay: boolean;
    hasData: boolean;
  }[];
}

export interface MonthlyStats {
  year: number;
  month: number; // 1-12
  monthName: string; // e.g. "SEPTEMBER 2026"
  averageCompletion: number;
  completedDaysCount: number;
  totalXpEarned: number;
  workoutSessionsCount: number;
  waterTargetDaysCount: number;
  dailyRecords: DaySummary[];
}

export interface XpTransaction {
  id: string; // Unique event key e.g. 'xp_quest_2026-09-18_quest-morning-wake'
  date: string; // YYYY-MM-DD local calendar date
  source: 'quest' | 'workout' | 'water' | 'bonus' | 'reward';
  sourceId: string; // e.g. quest ID, water target key, or workout ID
  amount: number; // Positive XP earned
  timestamp: string; // ISO 8601 string
}


export interface QuestLifeBackupPayload {
  schemaVersion: number;
  exportedAt: string;
  profile: UserProfileStorage;
  settings: AppSettings;
  routine: RoutineItemConfig[];
  dailyData: Record<string, DailyQuestStorage>;
  xpData: {
    totalXp: number;
    baseXp: number;
    ledger: XpTransaction[];
  };
  streakData: {
    currentStreak: number;
    longestStreak: number;
    completedDays: string[];
  };
  workoutData: Record<string, DailyWorkoutStorage>;
  waterData: {
    targetMl: number;
    history: Record<string, DailyWaterStorage>;
  };
  rewardData: {
    history: DailyRewardRecord[];
    daily: Record<string, DailyRewardRecord>;
  };
  history?: Record<string, unknown>;
}

export type AiSender = 'system' | 'user';

export interface AiMessage {
  id: string;
  sender: AiSender;
  text: string;
  timestamp: string; // ISO string
  mode?: AiQuickPromptMode;
  isOfflineFallback?: boolean;
}

export type AiQuickPromptMode =
  | 'chat'
  | 'daily_analysis'
  | 'whats_next'
  | 'routine_analysis'
  | 'session_plan'
  | 'weekly_analysis'
  | 'workout_assistance'
  | 'water_insight';

export interface AiContextPayload {
  date: string;
  currentTime: string;
  userName: string;
  level: number;
  totalXP: number;
  currentStreak: number;
  todayProgress: number;
  completedQuests: string[];
  pendingQuests: Array<{ title: string; timeSpan?: string; xp: number; category: string }>;
  routine: Array<{ title: string; timeSpan: string; category: string; enabled: boolean }>;
  workoutTitle?: string;
  workoutProgress?: { completedCount: number; totalCount: number; isCompleted: boolean };
  waterTargetMl: number;
  waterConsumedMl: number;
  weeklyStats?: WeeklyStats | {
    completedRate: number;
    streak: number;
    totalQuestsFinished: number;
  };
  sessionTopic?: string;
  responseLanguage?: 'en' | 'te';
  // Enhanced real telemetry connections:
  completedTasksDetails?: Array<{
    id: string;
    title: string;
    category: string;
    timeSpan?: string;
    xp: number;
    completedAt?: string;
    verificationMethod?: string;
    verified?: boolean;
    notes?: string;
  }>;
  workoutDetails?: {
    splitTitle: string;
    isRestDay: boolean;
    isCompleted: boolean;
    completedCount: number;
    totalCount: number;
    progressPercent: number;
    exercises: Array<{
      id: string;
      name: string;
      muscleGroup: string;
      targetSets: number;
      targetReps: string;
      completed: boolean;
      loggedWeight?: number;
      loggedReps?: number;
    }>;
  };
  historyDetails?: {
    currentStreak: number;
    longestStreak: number;
    completedDaysCount: number;
    recordedDaysCount: number;
    completedDays: string[];
    yesterday?: DaySummary | null;
    pastDaysSummary?: Array<{
      date: string;
      displayMonthDay: string;
      progressPercent: number;
      completedCount: number;
      totalCount: number;
      workoutCompleted: boolean;
    }>;
  };
  rewardStatus?: {
    revealed: boolean;
    claimed: boolean;
    rewardName: string | null;
    category: string | null;
    statusText: string;
  };
  levelDetails?: {
    level: number;
    rank: string;
    totalXp: number;
    nextLevel: number;
    nextLevelXp: number;
    xpToNextLevel: number;
    levelProgressPercent: number;
    nextRank: string;
    targetRankLevel: number;
    targetRankXp: number;
    xpToNextRank: number;
  };
}

// ─────────────────────────────────────────────────────────────
// BODY PROGRESS SCAN TYPES (Biometric Visual Tracking)
// ─────────────────────────────────────────────────────────────
export type VisualChangeStatus = 'visible change' | 'no clear change';
export type OverallChangeStatus = 'visible changes detected' | 'no clear changes detected';

export interface ScanComparisonResult {
  chest: VisualChangeStatus;
  arms: VisualChangeStatus;
  shoulders: VisualChangeStatus;
  abdomen: VisualChangeStatus;
  overall: OverallChangeStatus;
  confidenceReliable: boolean;
  unreliableReason?: string; // "System could not confidently determine visual changes because the photos differ in lighting/pose/position."
  summary?: string;
}

export interface BodyProgressScan {
  id: string;
  timestamp: number; // Unix epoch ms
  dateKey: string; // YYYY-MM-DD
  scanNumber: number; // 1 for Baseline, 2, 3...
  label: string; // "BASELINE", "WEEK 4", "WEEK 8", "CURRENT"
  isBaseline: boolean;
  imageDataUrl: string; // Base64 data URL
  cloudStoragePath?: string;
  comparisonWithPrevious?: ScanComparisonResult;
  comparisonWithBaseline?: ScanComparisonResult;
}

// ─────────────────────────────────────────────────────────────
// SYSTEM TASK VERIFICATION TYPES
// ─────────────────────────────────────────────────────────────
export type TaskCompletionMethod = 'manual' | 'capture';
export type TaskVerificationStatus = 'verified' | 'window_missed' | 'manual';

export interface TaskVerificationRecord {
  id: string;
  taskId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completionMethod: TaskCompletionMethod;
  completedAt: string; // ISO 8601 string
  captureTimestamp?: number; // epoch ms
  verificationStatus: TaskVerificationStatus;
  xpAwarded: number;
  targetTimeStr?: string;
  allowedWindowStr?: string;
  capturedPhotoUrl?: string;
}

export interface TaskVerificationConfig {
  allowCapture: boolean;
  targetTimeStr: string;
  windowStartMinute: number;
  windowEndMinute: number;
  windowDisplayStr: string;
  capturePrompt?: string;
  privacyNotice?: string;
}



