import React, { useState, useMemo } from 'react';
import {
  Shield,
  Zap,
  Flame,
  Target,
  TrendingUp,
  Sparkles,
  Calendar,
  ChevronRight,
  Dumbbell,
  Droplets,
  Trophy,
  Lock,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { SystemHeader } from '../components/SystemHeader.tsx';
import { StatCard } from '../components/StatCard.tsx';
import { SystemCard } from '../components/SystemCard.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { DailyHistoryCard } from '../components/DailyHistoryCard.tsx';
import { DateDetailModal } from '../components/DateDetailModal.tsx';
import { AppRoute, DaySummary } from '../types.ts';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';
import { useWaterSystem } from '../context/WaterContext.tsx';
import {
  getWeeklyStats,
  getMonthlyStats,
  getAllHistorySummaries,
  calculateLongestStreak,
} from '../utils/historyManager.ts';

interface StatsScreenProps {
  onNavigate: (route: AppRoute) => void;
}

type HistoryTab = 'all' | 'workout' | 'water' | 'rewards' | 'xp';

export const StatsScreen: React.FC<StatsScreenProps> = ({ onNavigate }) => {
  const {
    xp,
    levelInfo,
    streak,
    completedDays,
    progressPercent,
    completedCount,
    totalCount,
    todayKey,
    todayFormatted,
    dailyReward,
  } = useQuestSystem();

  const {
    todayPlan,
    totalTodayExercises,
    completedTodayExercises,
    isTodayWorkoutComplete,
  } = useWorkoutSystem();

  const { litersConsumed, litersTarget, isTargetReached } = useWaterSystem();

  // Active History Tab
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');

  // Modal inspection state
  const [selectedSummary, setSelectedSummary] = useState<DaySummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Live Today Override so today's metrics are 100% reactive in real-time
  const liveTodayOverride = useMemo(() => {
    return {
      todayKey,
      completedCount,
      totalCount,
      progressPercent,
      dailyReward,
      workout: {
        completedCount: completedTodayExercises,
        totalCount: totalTodayExercises,
        isComplete: isTodayWorkoutComplete,
        title: todayPlan?.title || 'DAILY WORKOUT',
        isRestDay: Boolean(todayPlan?.isRestDay),
      },
      water: {
        consumedMl: Math.round(litersConsumed * 1000),
        targetMl: Math.round(litersTarget * 1000),
        isTargetReached,
      },
    };
  }, [
    todayKey,
    completedCount,
    totalCount,
    progressPercent,
    dailyReward,
    completedTodayExercises,
    totalTodayExercises,
    isTodayWorkoutComplete,
    todayPlan,
    litersConsumed,
    litersTarget,
    isTargetReached,
  ]);

  // Dynamic Weekly Statistics (Requirement 1 & 3)
  const weeklyStats = useMemo(() => {
    return getWeeklyStats(todayKey, liveTodayOverride);
  }, [todayKey, liveTodayOverride]);

  // Dynamic Monthly Statistics (Requirement 1 & 4)
  const monthlyStats = useMemo(() => {
    const [y, m] = todayKey.split('-').map(Number);
    return getMonthlyStats(y, m, todayKey, liveTodayOverride);
  }, [todayKey, liveTodayOverride]);

  // All Historical Summaries (Requirement 2 & 7)
  const allHistory = useMemo(() => {
    return getAllHistorySummaries(todayKey, liveTodayOverride);
  }, [todayKey, liveTodayOverride]);

  // Longest streak from actual completedDays (Requirement 12)
  const longestStreak = useMemo(() => {
    return calculateLongestStreak(completedDays);
  }, [completedDays]);

  return (
    <div id="stats-screen" className="relative min-h-screen pb-24 select-none">
      {/* Background ambient glow */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-72 rounded-full bg-cyan-600/10 blur-[90px] pointer-events-none" />
      <div className="absolute top-80 right-0 w-64 h-64 rounded-full bg-purple-600/15 blur-[80px] pointer-events-none" />

      {/* Screen Header */}
      <SystemHeader
        variant="subscreen"
        title="STATS"
        subtitle="HUNTER METRICS // ARCHIVE"
        onNavigate={onNavigate}
      />

      <div className="p-4 space-y-4">
        {/* 1. TOP SECTION: PLAYER STATS HERO (Requirement 1) */}
        <SystemCard
          id="player-stats-hero"
          glow="blue"
          className="bg-gradient-to-b from-[#0e1630]/95 via-[#0a0f22]/90 to-[#070b18] border-cyan-500/40 p-4"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="font-hud text-xs font-black tracking-widest text-cyan-300 uppercase">
                PLAYER STATS // {levelInfo.rank} (LEVEL {levelInfo.level})
              </span>
            </div>
            <span className="font-hud text-[11px] text-slate-400">
              ACTIVE: {todayFormatted}
            </span>
          </div>

          {/* 4-Stat Core Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-[#060814]/80 border border-slate-800 font-hud">
              <span className="text-[10px] text-slate-400 block tracking-widest uppercase">
                LEVEL
              </span>
              <span className="font-display text-xl font-black text-white system-text-glow">
                LV. {levelInfo.level}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060814]/80 border border-slate-800 font-hud">
              <span className="text-[10px] text-slate-400 block tracking-widest uppercase">
                TOTAL XP
              </span>
              <span className="font-display text-xl font-black text-cyan-300">
                {xp.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060814]/80 border border-slate-800 font-hud">
              <span className="text-[10px] text-slate-400 block tracking-widest uppercase">
                CURRENT STREAK
              </span>
              <span className="font-display text-xl font-black text-amber-400">
                {streak} DAYS
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060814]/80 border border-slate-800 font-hud">
              <span className="text-[10px] text-slate-400 block tracking-widest uppercase">
                LONGEST STREAK
              </span>
              <span className="font-display text-xl font-black text-purple-300">
                {longestStreak} DAYS
              </span>
            </div>
          </div>

          {/* Rank Advancement Level Progress Bar */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-xs font-hud">
              <span className="text-slate-400">
                LEVEL {levelInfo.level} PROGRESS ({levelInfo.progressPercent}%)
              </span>
              <span className="text-cyan-300 font-bold">
                {levelInfo.xpToNext} XP TO LEVEL {levelInfo.nextLevel}
              </span>
            </div>
            <ProgressBar progress={levelInfo.progressPercent} size="sm" glowColor="cyan" />
          </div>

          {/* DYNAMIC COMPLETION HORIZONS (Requirement 1) */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-hud">
            <div className="p-2 rounded-lg bg-[#060813] border border-cyan-500/20">
              <span className="text-[10px] text-slate-400 block tracking-wider uppercase">
                TODAY
              </span>
              <span id="stats-today-percent" className="text-base font-black text-cyan-300">
                {progressPercent}%
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#060813] border border-purple-500/20">
              <span className="text-[10px] text-slate-400 block tracking-wider uppercase">
                THIS WEEK
              </span>
              <span id="stats-week-percent" className="text-base font-black text-purple-300">
                {weeklyStats.averageCompletion}%
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#060813] border border-blue-500/20">
              <span className="text-[10px] text-slate-400 block tracking-wider uppercase">
                THIS MONTH
              </span>
              <span id="stats-month-percent" className="text-base font-black text-blue-300">
                {monthlyStats.averageCompletion}%
              </span>
            </div>
          </div>
        </SystemCard>

        {/* 2. CALENDAR & HISTORY NAVIGATION BANNER (Requirement 16) */}
        <SystemCard
          id="access-calendar-history-btn"
          glow="cyan"
          clickable
          onClick={() => onNavigate('/history')}
          className="p-3.5 bg-gradient-to-r from-cyan-950/60 via-purple-950/50 to-slate-950/80 border-cyan-400/50 hover:border-cyan-300 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                <Calendar className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="font-hud text-[10px] font-bold text-cyan-400 tracking-widest uppercase block">
                  TEMPORAL LOGS
                </span>
                <h3 className="font-display text-sm font-black text-white tracking-wider uppercase group-hover:text-cyan-200 transition-colors">
                  CALENDAR & HISTORY ARCHIVE
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1 font-hud text-xs font-bold text-cyan-400">
              <span>OPEN</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </SystemCard>

        {/* 3. WEEKLY PROGRESS SECTION (Requirement 3) */}
        <SystemCard
          id="weekly-progress-card"
          glow="purple"
          className="bg-[#090d1e]/90 border-purple-500/30 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#a855f7]" />
              <h2 className="font-display text-sm font-black text-white tracking-widest uppercase">
                WEEKLY PROGRESS
              </h2>
            </div>
            <span className="font-hud text-[11px] text-cyan-300 font-bold tracking-wider">
              AVG {weeklyStats.averageCompletion}%
            </span>
          </div>

          {/* Weekly Summary Row */}
          <div className="grid grid-cols-4 gap-1.5 text-center font-hud text-xs">
            <div className="p-1.5 rounded-lg bg-[#060814] border border-slate-800">
              <span className="text-[9px] text-slate-400 block">CLEARED</span>
              <span className="font-black text-cyan-300">
                {weeklyStats.completedDaysCount} / 7
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#060814] border border-slate-800">
              <span className="text-[9px] text-slate-400 block">WEEK XP</span>
              <span className="font-black text-purple-300">
                +{weeklyStats.totalXpEarned}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#060814] border border-slate-800">
              <span className="text-[9px] text-slate-400 block">WORKOUTS</span>
              <span className="font-black text-cyan-300">
                {weeklyStats.workoutsCompleted}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#060814] border border-slate-800">
              <span className="text-[9px] text-slate-400 block">WATER TARGETS</span>
              <span className="font-black text-blue-300">
                {weeklyStats.waterTargetDays}
              </span>
            </div>
          </div>

          {/* Clean Weekly Progress Bar Chart (Requirement 3) */}
          <div className="space-y-2 pt-1 font-hud">
            {weeklyStats.days.map((d) => (
              <div
                key={d.date}
                className={`p-2 rounded-lg border transition-colors flex items-center gap-2 text-xs ${
                  d.isToday
                    ? 'bg-cyan-950/30 border-cyan-400/60'
                    : 'bg-[#060813] border-slate-800/80'
                }`}
              >
                <div className="w-10 font-bold flex items-center gap-1">
                  <span
                    className={
                      d.isToday
                        ? 'text-cyan-300'
                        : d.completionPercent === 100
                        ? 'text-emerald-300'
                        : 'text-slate-400'
                    }
                  >
                    {d.dayName}
                  </span>
                  {d.isToday && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </div>

                <div className="flex-1">
                  <ProgressBar
                    progress={d.completionPercent}
                    size="sm"
                    glowColor={d.isToday ? 'cyan' : d.completionPercent === 100 ? 'cyan' : 'purple'}
                  />
                </div>

                <div className="w-16 text-right font-black">
                  {d.isFuture ? (
                    <span className="text-slate-600 font-normal text-[10px]">PENDING</span>
                  ) : d.isRestDay && d.completionPercent === 0 ? (
                    <span className="text-slate-500 font-normal text-[10px]">— REST</span>
                  ) : (
                    <span
                      className={
                        d.completionPercent === 100
                          ? 'text-emerald-300'
                          : d.completionPercent > 0
                          ? 'text-purple-300'
                          : 'text-slate-500'
                      }
                    >
                      {d.completionPercent}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SystemCard>

        {/* 4. MONTHLY STATISTICS OVERVIEW (Requirement 4) */}
        <SystemCard
          id="monthly-stats-card"
          glow="cyan"
          className="bg-[#090e22]/90 border-cyan-500/30 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
              <h2 className="font-display text-sm font-black text-white tracking-widest uppercase">
                MONTHLY PROGRESS // {monthlyStats.monthName}
              </h2>
            </div>
            <span className="font-hud text-[11px] text-cyan-400 font-bold">
              {monthlyStats.averageCompletion}% AVERAGE
            </span>
          </div>

          {/* Visual Progression Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-hud text-xs">
            <div className="p-2.5 rounded-xl bg-[#060814] border border-slate-800">
              <span className="text-[10px] text-slate-400 block">COMPLETED DAYS</span>
              <span className="text-lg font-black text-emerald-300">
                {monthlyStats.completedDaysCount} DAYS
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060814] border border-slate-800">
              <span className="text-[10px] text-slate-400 block">TOTAL XP</span>
              <span className="text-lg font-black text-purple-300">
                +{monthlyStats.totalXpEarned.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060814] border border-slate-800">
              <span className="text-[10px] text-slate-400 block">WORKOUT SESSIONS</span>
              <span className="text-lg font-black text-cyan-300">
                {monthlyStats.workoutSessionsCount}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060814] border border-slate-800">
              <span className="text-[10px] text-slate-400 block">WATER TARGETS</span>
              <span className="text-lg font-black text-blue-300">
                {monthlyStats.waterTargetDaysCount}
              </span>
            </div>
          </div>
        </SystemCard>

        {/* 5. HISTORY SECTIONS (Requirements 7, 8, 9, 10, 11) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-black text-white tracking-widest uppercase">
              HISTORICAL PROTOCOL ARCHIVE
            </h2>
            <span className="font-hud text-[10px] text-slate-500">
              {allHistory.length} RECORDS LOGGED
            </span>
          </div>

          {/* History Category Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-hud text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              DAILY LOGS
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workout')}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'workout'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              WORKOUTS
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('water')}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'water'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              WATER
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rewards')}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'rewards'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              REWARDS
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('xp')}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'xp'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              XP STREAM
            </button>
          </div>

          {/* TAB 1: ALL DAILY LOGS (Using reusable DailyHistoryCard) */}
          {activeTab === 'all' && (
            <div className="space-y-2.5">
              {allHistory.length === 0 ? (
                /* Empty state (Requirement 18) */
                <div className="p-6 rounded-2xl bg-[#060814]/70 border border-slate-800 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                  <h4 className="font-display text-sm font-bold text-slate-300 tracking-wider uppercase">
                    NO HISTORY YET
                  </h4>
                  <p className="font-sans text-xs text-slate-400 max-w-xs mx-auto">
                    Complete today's quests to start building your history.
                  </p>
                </div>
              ) : (
                allHistory.map((summary) => (
                  <DailyHistoryCard
                    key={summary.date}
                    summary={summary}
                    onClick={() => {
                      setSelectedSummary(summary);
                      setIsModalOpen(true);
                    }}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB 2: WORKOUT HISTORY (Requirement 8) */}
          {activeTab === 'workout' && (
            <div className="space-y-2.5">
              {allHistory.map((summary) => (
                <SystemCard
                  key={`workout-${summary.date}`}
                  glow={summary.workout.completed ? 'cyan' : undefined}
                  className="p-3.5 bg-[#070b18] border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-black text-white tracking-wider">
                        {summary.displayMonthDay}
                      </span>
                      <span className="font-hud text-xs text-cyan-300 font-bold">
                        {summary.workout.title}
                      </span>
                    </div>
                    <div className="font-hud text-xs text-slate-400 flex items-center gap-3">
                      <span>
                        {summary.workout.completedCount} / {summary.workout.totalCount} EXERCISES
                      </span>
                      <span>•</span>
                      <span
                        className={
                          summary.workout.completed
                            ? 'text-cyan-300 font-bold'
                            : summary.workout.isRestDay
                            ? 'text-slate-400'
                            : 'text-amber-400'
                        }
                      >
                        {summary.workout.isRestDay
                          ? 'REST DAY'
                          : `${summary.workout.progressPercent}%`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        summary.workout.completed
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                          : summary.workout.isRestDay
                          ? 'bg-slate-900 border-slate-700 text-slate-400'
                          : 'bg-[#0d1020] border-slate-800 text-slate-500'
                      }`}
                    >
                      <Dumbbell className="w-4 h-4" />
                    </div>
                  </div>
                </SystemCard>
              ))}
            </div>
          )}

          {/* TAB 3: WATER HISTORY (Requirement 9) */}
          {activeTab === 'water' && (
            <div className="space-y-2.5">
              {allHistory.map((summary) => (
                <SystemCard
                  key={`water-${summary.date}`}
                  glow={summary.water.isTargetReached ? 'cyan' : undefined}
                  className="p-3.5 bg-[#070b18] border-slate-800 flex items-center justify-between font-hud"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        summary.water.isTargetReached
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                          : 'bg-[#0d1020] border-slate-800 text-slate-500'
                      }`}
                    >
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-display text-sm font-black text-white tracking-wider block">
                        {summary.displayMonthDay}
                      </span>
                      <span className="text-xs text-slate-400">
                        DAILY HYDRATION QUEST
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-white">
                      {summary.water.consumedLiters} / {summary.water.targetLiters} L
                      {summary.water.isTargetReached && (
                        <span className="ml-1.5 text-cyan-400">✓</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        summary.water.isTargetReached ? 'text-cyan-300' : 'text-slate-500'
                      }`}
                    >
                      {summary.water.isTargetReached ? 'TARGET REACHED' : 'IN PROGRESS'}
                    </span>
                  </div>
                </SystemCard>
              ))}
            </div>
          )}

          {/* TAB 4: REWARD HISTORY (Requirement 10) */}
          {activeTab === 'rewards' && (
            <div className="space-y-2.5">
              {allHistory.map((summary) => (
                <SystemCard
                  key={`reward-${summary.date}`}
                  glow={summary.reward.revealed ? 'cyan' : undefined}
                  className="p-3.5 bg-[#070b18] border-slate-800 flex items-center justify-between font-hud"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        summary.reward.revealed
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                          : 'bg-[#0d1020] border-slate-800 text-slate-600'
                      }`}
                    >
                      {summary.reward.revealed ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <span className="font-display text-sm font-black text-white tracking-wider block">
                        {summary.displayMonthDay}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          summary.reward.revealed
                            ? 'text-cyan-300'
                            : summary.is100Percent
                            ? 'text-purple-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {summary.reward.revealed ? (
                          summary.reward.name
                        ) : summary.is100Percent ? (
                          'READY TO REVEAL'
                        ) : (
                          'REWARD LOCKED'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border uppercase ${
                        summary.reward.revealed
                          ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300'
                          : summary.is100Percent
                          ? 'bg-purple-950/70 border-purple-400 text-purple-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {summary.reward.statusText}
                    </span>
                  </div>
                </SystemCard>
              ))}
            </div>
          )}

          {/* TAB 5: XP HISTORY STREAM (Requirement 11) */}
          {activeTab === 'xp' && (
            <div className="space-y-2.5">
              {allHistory.map((summary) => (
                <SystemCard
                  key={`xp-${summary.date}`}
                  glow="cyan"
                  className="p-3.5 bg-[#070b18] border-slate-800 flex items-center justify-between font-hud"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-950/70 border border-cyan-400/50 text-cyan-300">
                      <Zap className="w-4 h-4 fill-cyan-400" />
                    </div>
                    <div>
                      <span className="font-display text-sm font-black text-white tracking-wider block">
                        {summary.displayMonthDay}
                      </span>
                      <span className="text-xs text-slate-400">
                        {summary.completedCount} QUESTS CLEARED
                        {summary.workout.completed && !summary.workout.isRestDay
                          ? ' + WORKOUT'
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-cyan-300 system-text-glow">
                      +{summary.xpEarned} XP
                    </span>
                  </div>
                </SystemCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Inspection Modal */}
      <DateDetailModal
        summary={selectedSummary}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
