import React, { useState, useMemo } from 'react';
import {
  Lock,
  Droplets,
  Dumbbell,
  ChevronRight,
  Sparkles,
  Trophy,
  Shield,
  Flame,
  Zap,
  Gift,
  CheckCircle2,
  Cpu,
  Plus,
} from 'lucide-react';

import { SystemHeader } from '../components/SystemHeader.tsx';
import { SystemCard } from '../components/SystemCard.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { QuestCard } from '../components/QuestCard.tsx';
import { SectionHeader } from '../components/SectionHeader.tsx';
import { TaskCreateModal } from '../components/TaskCreateModal.tsx';
import { NewQuestRegisteredModal } from '../components/NewQuestRegisteredModal.tsx';
import { AppRoute, QuestCategory, TaskVerificationMethod, RoutineItemConfig } from '../types.ts';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';
import { useWaterSystem } from '../context/WaterContext.tsx';
import { formatHunterGreeting } from '../utils/levelSystem.ts';
import { useAudio } from '../hooks/useAudio.ts';

interface HomeScreenProps {
  onNavigate: (route: AppRoute) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const {
    quests,
    routineItems,
    completedCount,
    totalCount,
    progressPercent,
    xp,
    levelInfo,
    streak,
    todayFormatted,
    userName,
    dailyReward,
    isRewardReady,
    isRewardRevealed,
    toggleQuest,
    addCustomRoutineItem,
    updateRoutineItem,
    deleteCustomRoutineItem,
  } = useQuestSystem();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItemConfig | null>(null);
  const [registeredQuestInfo, setRegisteredQuestInfo] = useState<{
    isOpen: boolean;
    title: string;
    time: string;
    xp: number;
  }>({
    isOpen: false,
    title: '',
    time: '',
    xp: 0,
  });

  const { playUiClick } = useAudio();

  const handleTaskSubmit = (taskData: {
    title: string;
    category?: QuestCategory;
    startTime?: string;
    endTime?: string;
    duration?: string;
    xp: number;
    verificationMethod: TaskVerificationMethod;
    recurring?: boolean;
    daysOfWeek?: number[];
  }) => {
    if (editingItem) {
      updateRoutineItem(editingItem.id, taskData);
      setEditingItem(null);
    } else {
      const wasEmpty = quests.length === 0;
      addCustomRoutineItem(taskData);
      if (wasEmpty) {
        setRegisteredQuestInfo({
          isOpen: true,
          title: taskData.title,
          time: taskData.startTime || 'Anytime',
          xp: taskData.xp,
        });
      }
    }
    setIsCreateModalOpen(false);
  };

  const {
    todayPlan,
    totalTodayExercises,
    completedTodayExercises,
    isTodayWorkoutComplete,
  } = useWorkoutSystem();

  const {
    litersConsumed: waterConsumed,
    litersTarget: waterTarget,
    progressPercent: waterProgressPercent,
    isTargetReached: isWaterTargetReached,
  } = useWaterSystem();

  const [activeFilter, setActiveFilter] = useState<'ALL' | QuestCategory>('ALL');

  // Filtered quests based on selected category tab
  const displayedQuests = useMemo(() => {
    if (activeFilter === 'ALL') {
      return quests;
    }
    return quests.filter((q) => q.category === activeFilter);
  }, [quests, activeFilter]);

  // SYSTEM AI calculated insight for Home card
  const homeAiInsightText = useMemo(() => {
    const nextQuest = quests.find((q) => !q.completed);
    if (!nextQuest) {
      return `${completedCount} of ${totalCount} quests completed. All daily objectives cleared.`;
    }
    return `${completedCount} of ${totalCount} quests completed. Your next scheduled task is ${nextQuest.title}.`;
  }, [completedCount, totalCount, quests]);


  // Standardized dynamic Hunter greeting with rank (e.g., "WELCOME, HUNTER CHARAN • E-RANK")
  const hunterGreeting = useMemo(() => {
    return formatHunterGreeting(userName, levelInfo.rank);
  }, [userName, levelInfo.rank]);

  return (
    <div className="relative min-h-screen pb-24 select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-72 rounded-full bg-cyan-600/10 blur-[90px] pointer-events-none" />
      <div className="absolute top-96 right-0 w-72 h-72 rounded-full bg-purple-600/10 blur-[85px] pointer-events-none" />

      {/* Top System Header */}
      <SystemHeader
        variant="home"
        greeting={hunterGreeting}
        rank={levelInfo.rank}
        currentDate={todayFormatted}
        level={levelInfo.level}
        streak={streak}
        xp={xp}
        onNavigate={onNavigate}
      />

      <div className="px-4 space-y-4 pt-2">
        {/* If user has no tasks: Show EMPTY HOME STATE */}
        {quests.length === 0 ? (
          <div
            id="empty-system-state"
            className="p-6 bg-[#0a0f1d] border border-cyan-500/40 rounded-xl text-center shadow-[0_0_35px_rgba(6,182,212,0.15)] relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
                SYSTEM
              </span>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-4" />
            <h3 className="text-lg font-black text-white tracking-widest uppercase mb-2 font-mono">
              DAILY TASK SETUP
            </h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed mb-5 max-w-xs mx-auto">
              Create your own daily routine.
            </p>
            <button
              id="btn-add-first-task-home"
              onClick={() => {
                setEditingItem(null);
                setIsCreateModalOpen(true);
              }}
              className="py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-[0.98]"
            >
              [ ADD MY FIRST TASK ]
            </button>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mt-5" />
          </div>
        ) : (
          /* Main Hero Card: TODAY'S PROGRESS */
          <SystemCard
            id="hero-progress-card"
            glow="blue"
            className="bg-gradient-to-b from-[#0e1630]/90 via-[#0a0f22]/90 to-[#070b18] border-cyan-500/40"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
                <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                  TODAY'S PROGRESS
                </h2>
              </div>
              <span
                id="progress-counter"
                className="font-hud text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300"
              >
                {completedCount} / {totalCount} COMPLETED
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2.5">
              <span
                id="progress-percentage"
                className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight system-text-glow transition-all duration-300"
              >
                {progressPercent}%
              </span>
              <span className="font-hud text-xs text-slate-400 tracking-wider uppercase">
                {progressPercent === 100
                  ? 'ALL OBJECTIVES CLEARED'
                  : `DAILY RANK: ${progressPercent >= 80 ? 'S-TIER' : progressPercent >= 50 ? 'A-TIER' : 'B-TIER'}`}
              </span>
            </div>

            {/* Large Glowing Progress Bar with Smooth Animation */}
            <ProgressBar progress={progressPercent} size="lg" glowColor="cyan" />
          </SystemCard>
        )}

        {/* Hunter Progression Card: LEVEL, XP & STREAK */}
        <SystemCard
          id="home-level-progress-card"
          glow="purple"
          clickable
          onClick={() => onNavigate('/stats')}
          className="p-3.5 bg-gradient-to-r from-[#0e122b]/90 via-[#0a0e20]/90 to-[#070b18] border-purple-500/40 hover:border-purple-400/70 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="font-hud text-xs font-bold tracking-widest text-purple-300 uppercase">
                HUNTER RANK // {levelInfo.rank} (LEVEL {levelInfo.level})
              </span>
            </div>
            <span id="home-xp-to-next" className="font-hud text-xs font-semibold text-cyan-300">
              {levelInfo.xpToNext} XP TO NEXT LEVEL
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <span id="home-current-level" className="font-display text-2xl font-black text-white system-text-glow">
              LEVEL {levelInfo.level}
            </span>
            <span id="home-xp-display" className="font-hud text-sm font-bold text-cyan-300">
              {xp.toLocaleString()}{' '}
              <span className="text-slate-400 font-normal">
                / {levelInfo.nextLevelXp.toLocaleString()} XP
              </span>
            </span>
          </div>

          {/* Dynamic Level Progress Bar */}
          <ProgressBar progress={levelInfo.progressPercent} size="sm" glowColor="purple" />

          {/* Current Streak row */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              <span className="font-hud text-[11px] font-bold text-amber-300 tracking-wider uppercase">
                CURRENT STREAK: {streak} DAYS
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-300 transition-colors">
              <span className="font-hud text-[10px] tracking-wider uppercase">STATS ARCHIVE</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </SystemCard>

        {/* SCAR Entry Point Card */}
        <SystemCard
          id="home-scar-card"
          glow="blue"
          className="p-3.5 bg-gradient-to-r from-[#071329]/90 via-[#0a1024]/90 to-[#0c0822] border-cyan-500/40"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-hud text-xs font-bold tracking-widest text-cyan-300 uppercase">
                    SCAR
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Personal System companion
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('/ai')}
              id="open-scar-btn"
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold tracking-wider transition-colors shadow-[0_0_12px_rgba(6,182,212,0.4)] flex items-center gap-1 cursor-pointer"
            >
              <span>OPEN SCAR</span>
              <ChevronRight className="w-3 h-3 text-slate-950" />
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-cyan-950/60 flex items-center justify-between text-[11px] font-mono text-slate-300">
            <span className="text-slate-400 truncate max-w-[90%]">
              "{homeAiInsightText}"
            </span>
            <Sparkles className="w-3 h-3 text-cyan-400 shrink-0 ml-1" />
          </div>
        </SystemCard>

        {/* Quick Vitals Row: WATER & TODAY'S WORKOUT */}
        <div className="grid grid-cols-2 gap-3">
          {/* Water Card (Clickable to Water Screen - Requirement 7 & 14) */}
          <SystemCard
            id="water-card"
            glow={isWaterTargetReached ? 'cyan' : 'subtle'}
            clickable
            onClick={() => onNavigate('/water')}
            className={`p-3.5 flex flex-col justify-between group transition-all duration-300 ${
              isWaterTargetReached
                ? 'bg-gradient-to-br from-[#081b2e]/90 to-[#080d1e]/90 border-cyan-400/50'
                : 'bg-[#080d1e]/85'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-hud text-[11px] font-bold tracking-widest text-cyan-400 uppercase">
                WATER
              </span>
              <div
                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                  isWaterTargetReached
                    ? 'bg-cyan-950/70 border-cyan-300 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.6)]'
                    : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400 group-hover:border-cyan-300'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl font-bold text-white tracking-tight system-text-glow">
                  {waterConsumed} <span className="text-sm font-normal text-slate-400">/ {waterTarget} L</span>
                </span>
                <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[#070b16] mt-2 border border-cyan-500/20 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_rgba(0,240,255,0.7)]"
                  style={{ width: `${waterProgressPercent}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-hud text-[10px] text-slate-400">
                  {waterProgressPercent}%
                </span>
                {isWaterTargetReached && (
                  <span className="font-hud text-[10px] font-extrabold text-cyan-300 tracking-wider">
                    ✓ COMPLETE
                  </span>
                )}
              </div>
            </div>
          </SystemCard>

          {/* Workout Card (Clickable to Workout Screen - Requirement 11) */}
          <SystemCard
            id="quick-workout-card"
            glow={isTodayWorkoutComplete ? "cyan" : "purple"}
            clickable
            onClick={() => onNavigate('/workout')}
            className={`p-3.5 flex flex-col justify-between group transition-all duration-300 ${
              isTodayWorkoutComplete
                ? 'bg-gradient-to-br from-[#081726]/90 to-[#0c0f24]/90 border-cyan-400/50'
                : 'bg-[#0d0f24]/85'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`font-hud text-[11px] font-bold tracking-widest uppercase ${
                  isTodayWorkoutComplete ? 'text-cyan-300' : 'text-purple-400'
                }`}
              >
                TODAY'S WORKOUT
              </span>
              <div
                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                  isTodayWorkoutComplete
                    ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.5)]'
                    : 'bg-purple-950/60 border-purple-500/40 text-purple-300 group-hover:border-purple-300'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-hud tracking-widest text-slate-400 uppercase block">
                {todayPlan.dayName}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-display text-sm font-bold text-white tracking-wide group-hover:text-purple-200">
                  {todayPlan.isRestDay
                    ? 'Recovery Day'
                    : todayPlan.title}
                </span>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
              </div>

              {/* Dynamic exercises progress counter or completion badge */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-800/60">
                {todayPlan.isRestDay ? (
                  <span className="font-hud text-[11px] font-bold text-purple-300 tracking-wider">
                    REST & RECOVER
                  </span>
                ) : isTodayWorkoutComplete ? (
                  <span className="font-hud text-[11px] font-extrabold text-cyan-300 tracking-wider flex items-center gap-1">
                    ✓ WORKOUT COMPLETE
                  </span>
                ) : (
                  <span className="font-hud text-[11px] font-semibold text-slate-400 tracking-wider">
                    {completedTodayExercises} / {totalTodayExercises} EXERCISES
                  </span>
                )}
              </div>
            </div>
          </SystemCard>
        </div>

        {/* Section: TODAY'S QUESTS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              title="TODAY'S QUESTS"
              subtitle={`${completedCount} OF ${totalCount} CLEARED`}
              actionText="VIEW ALL"
              onAction={() => onNavigate('/quests')}
            />
            <button
              type="button"
              id="btn-add-quest-home-header"
              onClick={() => {
                setEditingItem(null);
                setIsCreateModalOpen(true);
              }}
              className="px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-hud text-[11px] font-bold tracking-wider flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0 ml-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>[+ QUEST]</span>
            </button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2.5 no-scrollbar">
            {(['ALL', 'Morning', 'College', 'Evening', 'Night'] as const).map((filter) => {
              const isActive = activeFilter === filter;
              const count =
                filter === 'ALL'
                  ? quests.length
                  : quests.filter((q) => q.category === filter).length;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    playUiClick();
                    setActiveFilter(filter);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-hud tracking-wider whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                      : 'bg-[#080d1e]/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {filter.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>

          {/* Fully Interactive Quest Cards */}
          <div className="space-y-2">
            {displayedQuests.length === 0 ? (
              <div className="p-6 rounded-xl border border-cyan-500/30 bg-[#0a0f1d] text-center">
                <p className="text-xs font-mono text-slate-400 mb-3">
                  {quests.length === 0 ? 'No daily tasks created yet.' : `No tasks in "${activeFilter}" category.`}
                </p>
                <button
                  type="button"
                  id="btn-empty-add-task-home"
                  onClick={() => {
                    setEditingItem(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="px-4 py-2 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold tracking-wider uppercase transition cursor-pointer"
                >
                  [ + ADD TASK ]
                </button>
              </div>
            ) : (
              displayedQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  id={`quest-${quest.id}`}
                  taskId={quest.id}
                  title={quest.title}
                  xp={quest.xp}
                  category={quest.category}
                  timeSpan={quest.timeSpan}
                  startTime={quest.startTime}
                  endTime={quest.endTime}
                  duration={quest.duration}
                  completed={quest.completed}
                  verificationMethod={quest.verificationMethod}
                  onToggle={() => toggleQuest(quest.id)}
                  onEdit={() => {
                    const routineItem = routineItems.find((r) => r.id === quest.id) || {
                      id: quest.id,
                      title: quest.title,
                      xp: quest.xp,
                      startTime: quest.startTime,
                      endTime: quest.endTime,
                      duration: quest.duration,
                      category: quest.category,
                      verificationMethod: quest.verificationMethod,
                    };
                    setEditingItem(routineItem);
                    setIsCreateModalOpen(true);
                  }}
                  onDelete={() => deleteCustomRoutineItem(quest.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Mystery Reward Card (Requirement 1 & 9) */}
        <SystemCard
          id="mystery-reward-card"
          glow={isRewardRevealed ? 'cyan' : isRewardReady ? 'cyan' : 'purple'}
          clickable
          onClick={() => onNavigate('/rewards')}
          className={`p-4 transition-all duration-300 group cursor-pointer ${
            isRewardRevealed
              ? 'bg-gradient-to-r from-[#09192c]/95 via-[#0a1524]/90 to-[#070c17] border-cyan-400/60 hover:border-cyan-300'
              : isRewardReady
              ? 'bg-gradient-to-r from-[#171038]/95 via-[#0e1630]/90 to-[#070c1a] border-cyan-400/70 hover:border-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
              : 'bg-gradient-to-r from-[#140e2c]/90 to-[#0b0f20]/90 border-purple-500/40 hover:border-purple-400/70'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                isRewardRevealed
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : isRewardReady
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.5)] animate-pulse'
                  : 'bg-purple-950/70 border-purple-500/60 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              }`}
            >
              {isRewardRevealed ? (
                <CheckCircle2 className="w-6 h-6 stroke-[2.2] text-cyan-300" />
              ) : isRewardReady ? (
                <Gift className="w-6 h-6 stroke-[2.2] text-cyan-300" />
              ) : (
                <Lock className="w-6 h-6 stroke-[2.2] text-purple-300" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-hud text-[10px] font-bold tracking-widest uppercase ${
                    isRewardRevealed
                      ? 'text-cyan-400'
                      : isRewardReady
                      ? 'text-cyan-300'
                      : 'text-purple-400'
                  }`}
                >
                  {isRewardRevealed
                    ? 'REWARD CLAIMED'
                    : isRewardReady
                    ? 'ALL QUESTS COMPLETE'
                    : 'REWARD LOCKED'}
                </span>
              </div>

              <h3 className="font-display text-base font-bold text-white tracking-wider uppercase">
                {isRewardRevealed ? 'REWARD CLAIMED' : 'MYSTERY REWARD'}
              </h3>

              <p
                className={`font-hud text-xs tracking-wide mt-0.5 truncate ${
                  isRewardRevealed
                    ? 'text-cyan-200/90 font-semibold'
                    : isRewardReady
                    ? 'text-cyan-300 font-bold animate-pulse'
                    : 'text-purple-200/70'
                }`}
              >
                {isRewardRevealed
                  ? `✓ ${dailyReward.rewardName}`
                  : isRewardReady
                  ? 'READY TO REVEAL — TAP TO UNLOCK'
                  : "Complete today's quests to unlock."}
              </p>
            </div>

            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                isRewardRevealed || isRewardReady
                  ? 'border-cyan-400/40 text-cyan-300 group-hover:border-cyan-300'
                  : 'border-purple-500/30 text-purple-400 group-hover:border-purple-400'
              }`}
            >
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </SystemCard>
      </div>

      {/* Task Create / Edit Modal */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleTaskSubmit}
        initialData={editingItem}
      />

      {/* New Quest Registered Modal */}
      <NewQuestRegisteredModal
        isOpen={registeredQuestInfo.isOpen}
        questTitle={registeredQuestInfo.title}
        time={registeredQuestInfo.time}
        xp={registeredQuestInfo.xp}
        onAccept={() =>
          setRegisteredQuestInfo({
            isOpen: false,
            title: '',
            time: '',
            xp: 0,
          })
        }
      />
    </div>
  );
};
