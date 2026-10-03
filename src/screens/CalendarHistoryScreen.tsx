import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Zap,
  Dumbbell,
  Droplets,
  Trophy,
} from 'lucide-react';
import { AppRoute, DaySummary } from '../types.ts';
import { SystemHeader } from '../components/SystemHeader.tsx';
import { SystemCard } from '../components/SystemCard.tsx';
import { DailyHistoryCard } from '../components/DailyHistoryCard.tsx';
import { DateDetailModal } from '../components/DateDetailModal.tsx';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';
import { useWaterSystem } from '../context/WaterContext.tsx';
import {
  getDaySummary,
  getMonthlyStats,
  formatDayLabels,
} from '../utils/historyManager.ts';
import { getTodayDateKey } from '../utils/questStorage.ts';

interface CalendarHistoryScreenProps {
  onNavigate: (route: AppRoute) => void;
  onBack?: () => void;
}

export const CalendarHistoryScreen: React.FC<CalendarHistoryScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const {
    todayKey,
    todayFormatted,
    completedCount,
    totalCount,
    progressPercent,
    dailyReward,
  } = useQuestSystem();

  const {
    todayPlan,
    totalTodayExercises,
    completedTodayExercises,
    isTodayWorkoutComplete,
  } = useWorkoutSystem();

  const { litersConsumed, litersTarget, isTargetReached } = useWaterSystem();

  // Active viewing month and year
  const [viewYear, setViewYear] = useState<number>(() => {
    const [y] = todayKey.split('-').map(Number);
    return y || new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    const [, m] = todayKey.split('-').map(Number);
    return m || new Date().getMonth() + 1;
  });

  // Selected date modal state
  const [selectedSummary, setSelectedSummary] = useState<DaySummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Live today override so today's dynamic state is always 100% in sync
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

  // Compute monthly stats for currently selected year/month
  const monthlyStats = useMemo(() => {
    return getMonthlyStats(viewYear, viewMonth, todayKey, liveTodayOverride);
  }, [viewYear, viewMonth, todayKey, liveTodayOverride]);

  // Navigate month
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const [y, m] = todayKey.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m);
  };

  // Build 7-day grid cells for the month
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
    // In ISO week (Mon=0..Sun=6), Sunday is 0 -> 6, Mon is 1 -> 0
    const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      summary?: DaySummary;
      isToday: boolean;
    }> = [];

    // Leading empty cells
    for (let i = 0; i < startPadding; i++) {
      cells.push({
        dayNumber: 0,
        dateKey: `pad-start-${i}`,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(viewMonth).padStart(2, '0');
      const dateKey = `${viewYear}-${monthStr}-${dayStr}`;
      const isToday = dateKey === todayKey;

      const summary = getDaySummary(dateKey, isToday ? liveTodayOverride : undefined);

      cells.push({
        dayNumber: day,
        dateKey,
        isCurrentMonth: true,
        summary,
        isToday,
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayKey, liveTodayOverride]);

  const handleDayClick = (summary?: DaySummary, dateKey?: string) => {
    if (!summary && dateKey) {
      summary = getDaySummary(dateKey, dateKey === todayKey ? liveTodayOverride : undefined);
    }
    if (summary) {
      setSelectedSummary(summary);
      setIsModalOpen(true);
    }
  };

  return (
    <div id="calendar-history-screen" className="relative min-h-screen pb-24 select-none">
      {/* Background ambient glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-72 rounded-full bg-cyan-600/10 blur-[90px] pointer-events-none" />
      <div className="absolute top-96 right-0 w-72 h-72 rounded-full bg-purple-600/10 blur-[85px] pointer-events-none" />

      {/* Screen Header */}
      <SystemHeader
        variant="subscreen"
        title="CALENDAR & HISTORY"
        subtitle="TEMPORAL QUEST ARCHIVE"
        onNavigate={onNavigate}
        onBack={onBack || (() => onNavigate('/stats'))}
      />

      <div className="p-4 space-y-4">
        {/* Month Selector Bar */}
        <SystemCard
          id="calendar-month-selector"
          glow="cyan"
          className="p-3 bg-gradient-to-r from-[#09152b]/90 via-[#0a1024]/90 to-[#060a16] border-cyan-500/40"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="font-display text-base font-black text-white tracking-widest uppercase">
                {monthlyStats.monthName}
              </span>
              <span className="block font-hud text-[10px] text-cyan-400 font-bold tracking-wider">
                {monthlyStats.completedDaysCount} DAYS 100% CLEARED
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="px-2 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-400/50 text-cyan-300 font-hud text-[10px] font-bold hover:bg-cyan-900/60 transition-colors cursor-pointer"
              >
                TODAY
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </SystemCard>

        {/* Monthly Calendar Matrix */}
        <SystemCard
          id="monthly-calendar-grid-card"
          glow="purple"
          className="p-3.5 bg-[#080d1e]/90 border-purple-500/30"
        >
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2 pb-2 border-b border-slate-800">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <span key={day} className="font-hud text-[10px] font-bold text-slate-400 tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={`pad-${idx}`}
                    className="h-12 rounded-lg bg-slate-950/30 opacity-20 pointer-events-none"
                  />
                );
              }

              const summary = cell.summary;
              const is100 = summary ? summary.progressPercent === 100 : false;
              const isPartial = summary ? summary.progressPercent > 0 && !is100 : false;
              const hasActivity = summary?.hasActivity || false;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => handleDayClick(summary, cell.dateKey)}
                  className={`relative h-12 rounded-lg p-1 flex flex-col items-center justify-between border transition-all cursor-pointer ${
                    cell.isToday
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                      : is100
                      ? 'border-emerald-500/50 bg-[#07161b] hover:border-emerald-400'
                      : isPartial
                      ? 'border-amber-500/50 bg-[#16120d] hover:border-amber-400'
                      : 'border-slate-800/80 bg-[#060814]/70 hover:border-slate-700'
                  }`}
                >
                  {/* Day Number */}
                  <span
                    className={`font-hud text-xs font-bold ${
                      cell.isToday
                        ? 'text-cyan-300'
                        : is100
                        ? 'text-emerald-300'
                        : isPartial
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Status Indicator (Requirement 5) */}
                  <div className="flex items-center justify-center">
                    {is100 ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                    ) : isPartial ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Calendar Status Legend */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-hud text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span>100% CLEARED</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
              <span>PARTIAL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span>UNLOGGED / REST</span>
            </div>
          </div>
        </SystemCard>

        {/* Monthly Summary Statistics Strip */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-[#060814]/90 border border-slate-800 font-hud">
            <span className="text-[10px] text-slate-400 block truncate">AVG PROGRESS</span>
            <span className="text-sm font-black text-cyan-300">
              {monthlyStats.averageCompletion}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#060814]/90 border border-slate-800 font-hud">
            <span className="text-[10px] text-slate-400 block truncate">MONTH XP</span>
            <span className="text-sm font-black text-purple-300">
              +{monthlyStats.totalXpEarned.toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#060814]/90 border border-slate-800 font-hud">
            <span className="text-[10px] text-slate-400 block truncate">WORKOUTS</span>
            <span className="text-sm font-black text-cyan-300">
              {monthlyStats.workoutSessionsCount}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#060814]/90 border border-slate-800 font-hud">
            <span className="text-[10px] text-slate-400 block truncate">WATER DAYS</span>
            <span className="text-sm font-black text-blue-300">
              {monthlyStats.waterTargetDaysCount}
            </span>
          </div>
        </div>

        {/* Daily History Activity Stream for this Month */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="font-hud text-xs font-bold text-slate-300 tracking-wider uppercase">
              {monthlyStats.monthName} // ACTIVITY STREAM
            </span>
            <span className="font-hud text-[11px] text-slate-500">
              {monthlyStats.dailyRecords.length} RECORDS
            </span>
          </div>

          {monthlyStats.dailyRecords.length === 0 ? (
            /* Empty State (Requirement 18) */
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
            <div className="space-y-2.5">
              {monthlyStats.dailyRecords.map((summary) => (
                <DailyHistoryCard
                  key={summary.date}
                  summary={summary}
                  onClick={() => {
                    setSelectedSummary(summary);
                    setIsModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Detail Inspection Modal */}
      <DateDetailModal
        summary={selectedSummary}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
