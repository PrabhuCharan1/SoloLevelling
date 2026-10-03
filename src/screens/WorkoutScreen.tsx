import React, { useState } from 'react';
import {
  Dumbbell,
  Zap,
  Flame,
  ShieldAlert,
  HeartPulse,
  CheckCircle2,
  ChevronRight,
  Trophy,
  Camera,
  Plus,
  Sparkles,
} from 'lucide-react';
import { SystemHeader } from '../components/SystemHeader.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { AppRoute, CustomWorkout } from '../types.ts';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';
import { BodyProgressScanView } from './BodyProgressScanView.tsx';
import { CustomWorkoutModal } from '../components/CustomWorkoutModal.tsx';
import { CustomWorkoutCard } from '../components/CustomWorkoutCard.tsx';
import { CustomWorkoutSessionModal } from '../components/CustomWorkoutSessionModal.tsx';
import { DeleteWorkoutConfirmModal } from '../components/DeleteWorkoutConfirmModal.tsx';
import { audioManager } from '../utils/audioManager.ts';

interface WorkoutScreenProps {
  onNavigate: (route: AppRoute) => void;
  initialTab?: 'protocol' | 'body-scan';
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({ onNavigate, initialTab = 'protocol' }) => {
  const [activeWorkoutTab, setActiveWorkoutTab] = useState<'protocol' | 'body-scan'>(initialTab);

  // Custom Workout Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(null);
  const [sessionWorkout, setSessionWorkout] = useState<CustomWorkout | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<CustomWorkout | null>(null);
  const [customFilterMode, setCustomFilterMode] = useState<'day' | 'all'>('day');

  const {
    currentDayOfWeek,
    selectedDayOfWeek,
    setSelectedDayOfWeek,
    activePlan,
    setSelectedMuscleGroupId,
    getGroupStats,
    totalActiveExercises,
    completedActiveExercises,
    activeProgressPercent,
    isActiveWorkoutComplete,
    // Custom Workouts
    customWorkouts,
    todayCustomWorkouts,
    activeCustomWorkouts,
    addCustomWorkout,
    updateCustomWorkout,
    deleteCustomWorkout,
    isCustomWorkoutCompleted,
    getCustomWorkoutProgress,
  } = useWorkoutSystem();

  const daysList = [
    { num: 1, label: 'MON' },
    { num: 2, label: 'TUE' },
    { num: 3, label: 'WED' },
    { num: 4, label: 'THU' },
    { num: 5, label: 'FRI' },
    { num: 6, label: 'SAT' },
    { num: 0, label: 'SUN' },
  ];

  const handleOpenGroup = (groupId: string) => {
    setSelectedMuscleGroupId(groupId);
    onNavigate('/workout/exercise');
  };

  const isToday = selectedDayOfWeek === currentDayOfWeek;

  // Custom workout handlers
  const handleOpenCreate = () => {
    audioManager.playUiClick();
    setEditingWorkout(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (workout: CustomWorkout) => {
    audioManager.playUiClick();
    setEditingWorkout(workout);
    setIsCreateModalOpen(true);
  };

  const handleOpenStart = (workout: CustomWorkout) => {
    audioManager.playUiClick();
    setSessionWorkout(workout);
  };

  const handleOpenDelete = (workout: CustomWorkout) => {
    audioManager.playUiClick();
    setDeletingWorkout(workout);
  };

  const handleConfirmDelete = () => {
    if (deletingWorkout) {
      deleteCustomWorkout(deletingWorkout.id);
      setDeletingWorkout(null);
    }
  };

  const handleSaveWorkout = (
    data: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    if (editId) {
      const existing = customWorkouts.find((w) => w.id === editId);
      if (existing) {
        updateCustomWorkout({
          ...existing,
          ...data,
          id: editId,
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      addCustomWorkout(data);
    }
  };

  // Determine which custom workouts to show based on filter
  const displayedCustomWorkouts =
    customFilterMode === 'all' ? customWorkouts : activeCustomWorkouts;

  return (
    <div className="relative min-h-screen pb-24 select-none">
      {/* Ambient background glow */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-72 rounded-full bg-cyan-600/10 blur-[90px] pointer-events-none" />
      <div className="absolute top-64 right-0 w-64 h-64 rounded-full bg-purple-600/15 blur-[80px] pointer-events-none" />

      {/* Subscreen Header */}
      <SystemHeader
        variant="subscreen"
        title={activeWorkoutTab === 'body-scan' ? 'BODY PROGRESS SCAN' : "TODAY'S WORKOUT"}
        subtitle={
          activeWorkoutTab === 'body-scan'
            ? 'BIOMETRIC VISUAL DEVELOPMENT PROTOCOL'
            : activePlan.isRestDay
            ? 'RECOVERY PROTOCOL // ACTIVE'
            : `${completedActiveExercises} / ${totalActiveExercises} OBJECTIVES CLEARED`
        }
        onNavigate={onNavigate}
      />

      <div className="p-4 space-y-4">
        {/* Workout Mode Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#080d1e] border border-cyan-950/80">
          <button
            type="button"
            id="tab-training-protocol"
            onClick={() => setActiveWorkoutTab('protocol')}
            className={`flex-1 py-2 px-3 rounded-lg text-center font-hud text-xs font-bold tracking-wider transition-all cursor-pointer ${
              activeWorkoutTab === 'protocol'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            TRAINING PROTOCOL
          </button>
          <button
            type="button"
            id="tab-body-progress-scan"
            onClick={() => setActiveWorkoutTab('body-scan')}
            className={`flex-1 py-2 px-3 rounded-lg text-center font-hud text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeWorkoutTab === 'body-scan'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-cyan-300" />
            BODY PROGRESS
          </button>
        </div>

        {activeWorkoutTab === 'body-scan' ? (
          /* BODY PROGRESS SCAN SUBSYSTEM */
          <BodyProgressScanView
            onBackToWorkout={() => setActiveWorkoutTab('protocol')}
            onNavigate={onNavigate}
          />
        ) : (
          /* REGULAR TRAINING PROTOCOL */
          <>
            {/* Quick Access Card to Body Progress Scan */}
            <div
              onClick={() => setActiveWorkoutTab('body-scan')}
              className="relative overflow-hidden rounded-xl p-3 bg-gradient-to-r from-[#0d1630]/80 via-[#0a0f24]/80 to-[#120e28]/80 border border-cyan-500/30 hover:border-cyan-400/60 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <p className="font-hud text-xs font-bold text-white tracking-wider group-hover:text-cyan-200 uppercase">
                      BODY PROGRESS SCAN
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400">
                    Standardized photo baseline & visual progress comparison
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-cyan-400 font-hud text-xs font-bold">
                <span>SCAN</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Day Selector Navigation Bar */}
            <div className="flex items-center justify-between gap-1 p-1 rounded-xl bg-[#080d1e] border border-cyan-950/60 overflow-x-auto scrollbar-none">
              {daysList.map((d) => {
                const isSelected = selectedDayOfWeek === d.num;
                const isActualToday = currentDayOfWeek === d.num;

                return (
                  <button
                    key={d.num}
                    id={`btn-day-${d.label.toLowerCase()}`}
                    onClick={() => setSelectedDayOfWeek(d.num)}
                    className={`relative flex-1 py-1.5 px-2 rounded-lg text-center font-hud text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    {d.label}
                    {isActualToday && (
                      <span
                        className={`block text-[8px] uppercase tracking-tighter ${
                          isSelected ? 'text-cyan-200' : 'text-cyan-400 font-extrabold'
                        }`}
                      >
                        TODAY
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* "+ ADD CUSTOM WORKOUT" Action Button (Prominent & HUD styled) */}
            <button
              type="button"
              id="btn-add-custom-workout"
              onClick={handleOpenCreate}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-[#0c1830] to-purple-950/90 border-2 border-cyan-400/80 hover:border-cyan-300 text-white font-hud text-xs sm:text-sm font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_28px_rgba(0,240,255,0.5)] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="system-text-glow">+ ADD CUSTOM WORKOUT</span>
              <span className="text-[10px] text-cyan-400 font-mono hidden sm:inline-block ml-1">
                // FORGE PROTOCOL
              </span>
            </button>

        {/* Dynamic Day & Workout Focus Banner */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-r from-[#0d1630]/90 via-[#0a0f24]/90 to-[#120e28]/90 border border-cyan-500/35 shadow-[0_0_20px_-4px_rgba(0,240,255,0.2)]">
          <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-400" />

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-hud text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">
                {isToday ? "TODAY'S WORKOUT" : "SCHEDULED PROTOCOL"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[10px] font-hud font-bold text-cyan-300 uppercase">
              {activePlan.isRestDay ? 'REST PHASE' : 'TRAINING DAY'}
            </span>
          </div>

          <h2
            id="workout-day-name"
            className="font-display text-xs font-bold text-slate-400 tracking-widest uppercase"
          >
            {activePlan.dayName.toUpperCase()}
          </h2>
          <h1
            id="workout-title"
            className="font-display text-2xl sm:text-3xl font-black text-white tracking-wider uppercase system-text-glow mt-0.5"
          >
            {activePlan.title.toUpperCase()}
          </h1>

          {!activePlan.isRestDay && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/80 font-hud text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
                <span>{totalActiveExercises} TOTAL EXERCISES</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>+100 XP REWARD</span>
              </div>
            </div>
          )}
        </div>

        {/* WORKOUT COMPLETION CELEBRATION BANNER (Requirement 10) */}
        {isActiveWorkoutComplete && !activePlan.isRestDay && (
          <div
            id="workout-complete-banner"
            className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-r from-cyan-950/90 via-[#0a1b2d] to-purple-950/90 border-2 border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.4)] animate-in fade-in zoom-in duration-300"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.6)]">
                <Trophy className="w-7 h-7 text-cyan-300 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-hud text-[10px] font-extrabold tracking-widest text-cyan-300 uppercase px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400/40">
                    QUEST COMPLETE
                  </span>
                  <span className="font-hud text-xs font-bold text-purple-300">
                    +100 XP
                  </span>
                </div>
                <h3 className="font-display text-lg font-black text-white tracking-wider uppercase mt-1 system-text-glow">
                  WORKOUT COMPLETE
                </h3>
                <p className="font-hud text-xs text-slate-300 mt-0.5">
                  All training protocols cleared. XP synchronised with Hunter System.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Workout Progress Bar (Requirement 9) */}
        {!activePlan.isRestDay && (
          <div className="p-4 rounded-xl bg-[#090d1e]/90 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-cyan-400" />
                <span className="font-hud text-xs font-bold tracking-widest text-slate-300 uppercase">
                  WORKOUT PROGRESS
                </span>
              </div>
              <span
                id="workout-progress-counter"
                className="font-hud text-xs font-bold text-cyan-300"
              >
                {completedActiveExercises} / {totalActiveExercises} COMPLETED ({activeProgressPercent}%)
              </span>
            </div>
            <ProgressBar progress={activeProgressPercent} size="md" glowColor="cyan" />
          </div>
        )}

        {/* SUNDAY RECOVERY SCREEN (Requirement 15) */}
        {activePlan.isRestDay ? (
          <div
            id="recovery-day-screen"
            className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1630] via-[#090e22] to-[#060a18] border border-cyan-500/30 text-center space-y-4"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <HeartPulse className="w-8 h-8 text-purple-400 animate-pulse" />
            </div>

            <div>
              <span className="font-hud text-xs font-bold text-purple-300 tracking-widest uppercase">
                HUNTER REST PROTOCOL
              </span>
              <h2 className="font-display text-2xl font-black text-white tracking-wider uppercase mt-1 system-text-glow">
                RECOVERY DAY
              </h2>
              <p className="font-display text-base font-bold text-cyan-300 tracking-wide mt-1">
                REST & RECOVER
              </p>
            </div>

            <p className="font-hud text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              System recharge in progress. No heavy physical drills scheduled today. Hydrate, replenish energy cells, and prepare for the upcoming training cycle.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-left">
              <div className="p-3 rounded-xl bg-[#060914] border border-slate-800">
                <span className="font-hud text-[10px] text-slate-400 uppercase tracking-wider block">
                  CELL REPAIR
                </span>
                <span className="font-hud text-sm font-bold text-cyan-300">
                  OPTIMAL (8H SLEEP)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#060914] border border-slate-800">
                <span className="font-hud text-[10px] text-slate-400 uppercase tracking-wider block">
                  WATER TARGET
                </span>
                <span className="font-hud text-sm font-bold text-purple-300">
                  3.5 LITRES
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* TRAINING DAYS: Clickable Muscle-Group Cards (Requirement 2 & 9) */
          <div className="space-y-3">
            <div className="text-[11px] font-hud tracking-widest text-slate-400 uppercase flex items-center gap-2 px-1">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>SELECT MUSCLE GROUP TO COMMENCE</span>
            </div>

            {activePlan.groups.map((group) => {
              const stats = getGroupStats(group);
              const isPurple = group.color === 'purple';
              const isGroupDone = stats.total > 0 && stats.completed === stats.total;

              return (
                <div
                  key={group.id}
                  id={`card-muscle-${group.id}`}
                  onClick={() => handleOpenGroup(group.id)}
                  className={`group relative overflow-hidden rounded-2xl p-5 border cursor-pointer select-none transition-all duration-300 active:scale-[0.98] ${
                    isGroupDone
                      ? 'bg-gradient-to-br from-[#091a24] via-[#091422] to-[#070d18] border-cyan-400 shadow-[0_0_20px_-4px_rgba(0,240,255,0.3)]'
                      : isPurple
                      ? 'bg-gradient-to-br from-[#120e28]/90 via-[#0a0d1e]/90 to-[#070a16] border-purple-500/35 hover:border-purple-400/60 shadow-[0_0_20px_-4px_rgba(168,85,247,0.2)] hover:shadow-[0_0_28px_rgba(168,85,247,0.4)]'
                      : 'bg-gradient-to-br from-[#0c1830]/90 via-[#0a0d1e]/90 to-[#070a16] border-cyan-500/35 hover:border-cyan-400/60 shadow-[0_0_20px_-4px_rgba(0,240,255,0.2)] hover:shadow-[0_0_28px_rgba(0,240,255,0.4)]'
                  }`}
                >
                  <span
                    className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-sm pointer-events-none ${
                      isPurple ? 'border-purple-400' : 'border-cyan-400'
                    }`}
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-sm pointer-events-none ${
                      isPurple ? 'border-purple-400' : 'border-cyan-400'
                    }`}
                  />

                  <div className="relative z-10 flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                          isGroupDone
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : isPurple
                            ? 'bg-purple-950/60 border-purple-500/50 text-purple-300 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                            : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]'
                        }`}
                      >
                        {isGroupDone ? (
                          <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                        ) : (
                          <Dumbbell className="w-6 h-6 stroke-[2]" />
                        )}
                      </div>

                      <div>
                        {group.badge && (
                          <span
                            className={`inline-block text-[9px] font-hud font-bold tracking-widest uppercase px-1.5 py-0.5 rounded mb-1 ${
                              isGroupDone
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : isPurple
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {group.badge}
                          </span>
                        )}
                        <h3 className="font-display text-xl font-bold text-white tracking-wider group-hover:text-cyan-200 transition-colors">
                          {group.name}
                        </h3>
                        <p className="font-hud text-xs font-semibold text-slate-400 tracking-wider">
                          {stats.completed} / {stats.total} COMPLETED ({stats.percent}%)
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-200 ${
                        isPurple
                          ? 'border-purple-500/30 bg-purple-950/40 text-purple-300 group-hover:border-purple-400 group-hover:translate-x-0.5'
                          : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300 group-hover:border-cyan-400 group-hover:translate-x-0.5'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Muscle group progress bar */}
                  <ProgressBar
                    progress={stats.percent}
                    size="sm"
                    glowColor={isPurple ? 'purple' : 'cyan'}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* CUSTOM WORKOUTS SECTION (Additive Feature) */}
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="font-hud text-xs font-bold tracking-widest text-slate-300 uppercase">
                {isToday ? "TODAY'S CUSTOM PROTOCOLS" : "SCHEDULED CUSTOM PROTOCOLS"}
              </h3>
            </div>

            {/* Filter Toggle: Scheduled for this day vs All custom workouts */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#080d1e] border border-cyan-950 text-[10px] font-hud">
              <button
                type="button"
                id="btn-filter-custom-day"
                onClick={() => setCustomFilterMode('day')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  customFilterMode === 'day'
                    ? 'bg-gradient-to-r from-cyan-600/80 to-blue-600/80 text-white font-bold shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {daysList.find((d) => d.num === selectedDayOfWeek)?.label || 'DAY'} ({activeCustomWorkouts.length})
              </button>
              <button
                type="button"
                id="btn-filter-custom-all"
                onClick={() => setCustomFilterMode('all')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  customFilterMode === 'all'
                    ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white font-bold shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ALL ({customWorkouts.length})
              </button>
            </div>
          </div>

          {displayedCustomWorkouts.length > 0 ? (
            <div className="space-y-3">
              {displayedCustomWorkouts.map((workout) => (
                <CustomWorkoutCard
                  key={workout.id}
                  workout={workout}
                  isCompletedToday={isCustomWorkoutCompleted(workout.id)}
                  progress={getCustomWorkoutProgress(workout)}
                  onStart={handleOpenStart}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                />
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#080d1e]/80 border border-dashed border-cyan-900/60 text-center space-y-2.5">
              <p className="font-hud text-xs text-slate-400">
                {customFilterMode === 'day'
                  ? `No custom workouts scheduled for ${
                      daysList.find((d) => d.num === selectedDayOfWeek)?.label
                    }.`
                  : 'No custom workouts created yet.'}
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40 font-hud text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ADD CUSTOM WORKOUT</span>
              </button>
            </div>
          )}
        </div>
      </>
    )}
  </div>

  {/* Custom Workout Creation/Editing Modal */}
  <CustomWorkoutModal
    isOpen={isCreateModalOpen}
    onClose={() => {
      setIsCreateModalOpen(false);
      setEditingWorkout(null);
    }}
    onSave={handleSaveWorkout}
    initialWorkout={editingWorkout}
  />

  {/* Custom Workout Interactive Drill-Down / Session Modal */}
  <CustomWorkoutSessionModal
    workout={sessionWorkout}
    isOpen={Boolean(sessionWorkout)}
    onClose={() => setSessionWorkout(null)}
  />

  {/* Delete Confirmation Modal */}
  <DeleteWorkoutConfirmModal
    isOpen={Boolean(deletingWorkout)}
    workout={deletingWorkout}
    onConfirm={handleConfirmDelete}
    onCancel={() => setDeletingWorkout(null)}
  />
</div>
  );
};
