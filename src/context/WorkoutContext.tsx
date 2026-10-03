import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  DayWorkout,
  MuscleGroup,
  ExerciseState,
  DailyWorkoutStorage,
  CustomWorkout,
  CustomWorkoutDailyState,
} from '../types.ts';
import { WEEKLY_WORKOUT_SCHEDULE } from '../data/workoutSchedule.ts';
import { getTodayKey } from '../utils/questStorage.ts';
import { loadDailyWorkout, saveDailyWorkout } from '../utils/workoutStorage.ts';
import {
  loadCustomWorkouts,
  createCustomWorkout,
  updateCustomWorkout,
  deleteCustomWorkout,
  loadCustomWorkoutDaily,
  saveCustomWorkoutDaily,
  toggleCustomWorkoutExercise,
  setCustomWorkoutCompletedState,
  getWorkoutsScheduledForDay,
} from '../utils/customWorkoutStorage.ts';
import { useQuestSystem } from './QuestContext.tsx';
import { audioManager } from '../utils/audioManager.ts';

interface WorkoutContextType {
  // Current real calendar day
  currentDayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  todayDateKey: string;
  todayPlan: DayWorkout;
  
  // Selected day for viewing (defaults to current day)
  selectedDayOfWeek: number;
  setSelectedDayOfWeek: (day: number) => void;
  activePlan: DayWorkout;
  
  // Active selected muscle group for exercise screen
  selectedMuscleGroupId: string | null;
  setSelectedMuscleGroupId: (id: string | null) => void;
  activeMuscleGroup: MuscleGroup | null;
  
  // Exercise states for today (persisted in localStorage)
  exerciseStates: Record<string, ExerciseState>;
  toggleExercise: (exerciseId: string) => void;
  updateExerciseWeight: (exerciseId: string, weight: number) => void;
  updateExerciseReps: (exerciseId: string, reps: number) => void;
  
  // Progress calculations
  totalTodayExercises: number;
  completedTodayExercises: number;
  todayProgressPercent: number;
  isTodayWorkoutComplete: boolean;

  // Active viewed day calculations
  totalActiveExercises: number;
  completedActiveExercises: number;
  activeProgressPercent: number;
  isActiveWorkoutComplete: boolean;

  // Group specific calculations
  getGroupStats: (group: MuscleGroup) => { completed: number; total: number; percent: number };

  // Reset today's workout
  resetTodayWorkout: () => void;

  // Custom Workouts (Additive Feature)
  customWorkouts: CustomWorkout[];
  todayCustomWorkouts: CustomWorkout[];
  activeCustomWorkouts: CustomWorkout[];
  customWorkoutDaily: CustomWorkoutDailyState;
  addCustomWorkout: (data: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'>) => CustomWorkout;
  updateCustomWorkout: (workout: CustomWorkout) => boolean;
  deleteCustomWorkout: (id: string) => boolean;
  toggleCustomExercise: (workoutId: string, exerciseId: string) => void;
  setCustomWorkoutCompleted: (workoutId: string, completed: boolean) => void;
  isCustomWorkoutCompleted: (workoutId: string) => boolean;
  getCustomWorkoutProgress: (workout: CustomWorkout) => {
    completedCount: number;
    totalCount: number;
    percent: number;
    isComplete: boolean;
  };
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setQuestCompleted, todayKey, awardCustomWorkoutXp, reverseCustomWorkoutXp } = useQuestSystem();

  // Automatic real day detection derived from central todayKey
  const todayDateKey = todayKey;
  const currentDayOfWeek = useMemo(() => {
    const [y, m, d] = todayKey.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }, [todayKey]);

  // Selected day for viewing (defaults to real current day)
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(currentDayOfWeek);

  // Keep selectedDayOfWeek in sync if todayKey changes day
  useEffect(() => {
    setSelectedDayOfWeek(currentDayOfWeek);
  }, [currentDayOfWeek]);

  // Selected muscle group for drill-down screen
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/workout\/([a-z0-9_-]+)/);
      if (match && match[1] && match[1] !== 'exercise') {
        return match[1];
      }
    }
    return null;
  });

  // Listen to browser navigation for direct muscle group URLs
  useEffect(() => {
    const handleUrlChange = () => {
      const match = window.location.pathname.match(/\/workout\/([a-z0-9_-]+)/);
      if (match && match[1] && match[1] !== 'exercise') {
        setSelectedMuscleGroupId(match[1]);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Load persisted exercise states for today
  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseState>>(() => {
    const loaded = loadDailyWorkout(todayDateKey, currentDayOfWeek);
    return loaded.exercises || {};
  });

  // Reload exercise states whenever todayDateKey or currentDayOfWeek changes
  useEffect(() => {
    const loaded = loadDailyWorkout(todayDateKey, currentDayOfWeek);
    setExerciseStates(loaded.exercises || {});
  }, [todayDateKey, currentDayOfWeek]);

  // Custom workouts persistent list
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>(() => loadCustomWorkouts());

  // Daily custom workouts completion state for today
  const [customWorkoutDaily, setCustomWorkoutDaily] = useState<CustomWorkoutDailyState>(() =>
    loadCustomWorkoutDaily(todayDateKey)
  );

  // Keep custom workout daily state synced with current date
  useEffect(() => {
    setCustomWorkoutDaily(loadCustomWorkoutDaily(todayDateKey));
  }, [todayDateKey]);

  // Custom workouts scheduled for actual current day
  const todayCustomWorkouts = useMemo(() => {
    return getWorkoutsScheduledForDay(currentDayOfWeek, customWorkouts);
  }, [currentDayOfWeek, customWorkouts]);

  // Custom workouts scheduled for currently viewed day
  const activeCustomWorkouts = useMemo(() => {
    return getWorkoutsScheduledForDay(selectedDayOfWeek, customWorkouts);
  }, [selectedDayOfWeek, customWorkouts]);

  // Today's plan and active viewed plan
  const todayPlan = useMemo(() => {
    return WEEKLY_WORKOUT_SCHEDULE[currentDayOfWeek] || WEEKLY_WORKOUT_SCHEDULE[0];
  }, [currentDayOfWeek]);

  const activePlan = useMemo(() => {
    return WEEKLY_WORKOUT_SCHEDULE[selectedDayOfWeek] || WEEKLY_WORKOUT_SCHEDULE[0];
  }, [selectedDayOfWeek]);

  // Active muscle group
  const activeMuscleGroup = useMemo(() => {
    if (selectedMuscleGroupId) {
      // First check active plan
      const inActive = activePlan.groups.find((g) => g.id === selectedMuscleGroupId);
      if (inActive) return inActive;
      // If not in active day's plan, check all days in schedule
      for (const day of Object.values(WEEKLY_WORKOUT_SCHEDULE)) {
        const found = day.groups.find((g) => g.id === selectedMuscleGroupId);
        if (found) return found;
      }
    }
    if (!activePlan.groups || activePlan.groups.length === 0) return null;
    return activePlan.groups[0];
  }, [activePlan, selectedMuscleGroupId]);

  // Save to localStorage whenever exerciseStates changes
  useEffect(() => {
    const storageData: DailyWorkoutStorage = {
      date: todayDateKey,
      dayOfWeek: currentDayOfWeek,
      exercises: exerciseStates,
      updatedAt: new Date().toISOString(),
    };
    saveDailyWorkout(storageData);
  }, [exerciseStates, todayDateKey, currentDayOfWeek]);

  // Total and completed calculations for TODAY's workout
  const { totalTodayExercises, completedTodayExercises, todayProgressPercent, isTodayWorkoutComplete } =
    useMemo(() => {
      if (todayPlan.isRestDay || !todayPlan.groups || todayPlan.groups.length === 0) {
        return {
          totalTodayExercises: 0,
          completedTodayExercises: 0,
          todayProgressPercent: 0,
          isTodayWorkoutComplete: false,
        };
      }

      let total = 0;
      let completed = 0;

      todayPlan.groups.forEach((group) => {
        group.exercises.forEach((ex) => {
          total += 1;
          if (exerciseStates[ex.id]?.completed) {
            completed += 1;
          }
        });
      });

      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isComplete = total > 0 && completed === total;

      return {
        totalTodayExercises: total,
        completedTodayExercises: completed,
        todayProgressPercent: percent,
        isTodayWorkoutComplete: isComplete,
      };
    }, [todayPlan, exerciseStates]);

  // Total and completed calculations for ACTIVE VIEWED workout
  const { totalActiveExercises, completedActiveExercises, activeProgressPercent, isActiveWorkoutComplete } =
    useMemo(() => {
      if (activePlan.isRestDay || !activePlan.groups || activePlan.groups.length === 0) {
        return {
          totalActiveExercises: 0,
          completedActiveExercises: 0,
          activeProgressPercent: 0,
          isActiveWorkoutComplete: false,
        };
      }

      let total = 0;
      let completed = 0;

      activePlan.groups.forEach((group) => {
        group.exercises.forEach((ex) => {
          total += 1;
          if (exerciseStates[ex.id]?.completed) {
            completed += 1;
          }
        });
      });

      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isComplete = total > 0 && completed === total;

      return {
        totalActiveExercises: total,
        completedActiveExercises: completed,
        activeProgressPercent: percent,
        isActiveWorkoutComplete: isComplete,
      };
    }, [activePlan, exerciseStates]);

  // Sync with Daily Quest "Workout" (+100 XP)
  useEffect(() => {
    if (todayPlan.isRestDay) return;

    if (isTodayWorkoutComplete) {
      setQuestCompleted('quest-morning-workout', true);
    } else {
      // If any exercise was unchecked and workout is no longer 100%, uncomplete the quest
      setQuestCompleted('quest-morning-workout', false);
    }
  }, [isTodayWorkoutComplete, todayPlan.isRestDay, setQuestCompleted]);

  // Toggle single exercise completed status
  const toggleExercise = useCallback((exerciseId: string) => {
    setExerciseStates((prev) => {
      const current = prev[exerciseId] || { completed: false, weight: 0, reps: 10 };
      const nextCompleted = !current.completed;
      if (nextCompleted) {
        audioManager.play('exercise_check');
      } else {
        audioManager.playUiClick();
      }
      return {
        ...prev,
        [exerciseId]: {
          ...current,
          completed: nextCompleted,
        },
      };
    });
  }, []);

  // Update exercise weight
  const updateExerciseWeight = useCallback((exerciseId: string, weight: number) => {
    setExerciseStates((prev) => {
      const current = prev[exerciseId] || { completed: false, weight: 0, reps: 10 };
      return {
        ...prev,
        [exerciseId]: {
          ...current,
          weight: Math.max(0, Math.min(999, weight)),
        },
      };
    });
  }, []);

  // Update exercise reps
  const updateExerciseReps = useCallback((exerciseId: string, reps: number) => {
    setExerciseStates((prev) => {
      const current = prev[exerciseId] || { completed: false, weight: 0, reps: 10 };
      return {
        ...prev,
        [exerciseId]: {
          ...current,
          reps: Math.max(1, Math.min(999, reps)),
        },
      };
    });
  }, []);

  // Helper for muscle group stats
  const getGroupStats = useCallback(
    (group: MuscleGroup) => {
      const total = group.exercises.length;
      let completed = 0;
      group.exercises.forEach((ex) => {
        if (exerciseStates[ex.id]?.completed) {
          completed += 1;
        }
      });
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { completed, total, percent };
    },
    [exerciseStates]
  );

  const resetTodayWorkout = useCallback(() => {
    const emptyStates: Record<string, ExerciseState> = {};
    setExerciseStates(emptyStates);
    saveDailyWorkout({
      date: todayDateKey,
      dayOfWeek: currentDayOfWeek,
      exercises: emptyStates,
      updatedAt: new Date().toISOString(),
    });
  }, [todayDateKey, currentDayOfWeek]);

  // CUSTOM WORKOUT HANDLERS (Additive)
  const addCustomWorkout = useCallback(
    (data: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'>): CustomWorkout => {
      const created = createCustomWorkout(data);
      setCustomWorkouts(loadCustomWorkouts());
      audioManager.playUiClick();
      return created;
    },
    []
  );

  const updateCustomWorkoutHandler = useCallback((workout: CustomWorkout): boolean => {
    const success = updateCustomWorkout(workout);
    if (success) {
      setCustomWorkouts(loadCustomWorkouts());
      audioManager.playUiClick();
    }
    return success;
  }, []);

  const deleteCustomWorkoutHandler = useCallback(
    (id: string): boolean => {
      // Reverse today's XP if it was completed
      reverseCustomWorkoutXp(id);
      const success = deleteCustomWorkout(id);
      if (success) {
        setCustomWorkouts(loadCustomWorkouts());
        // Clean up from daily state if present
        setCustomWorkoutDaily((prev) => {
          const next = {
            ...prev,
            completedWorkoutIds: prev.completedWorkoutIds.filter((wId) => wId !== id),
          };
          saveCustomWorkoutDaily(next);
          return next;
        });
        audioManager.playUiClick();
      }
      return success;
    },
    [reverseCustomWorkoutXp]
  );

  const isCustomWorkoutCompleted = useCallback(
    (workoutId: string): boolean => {
      return customWorkoutDaily.completedWorkoutIds.includes(workoutId);
    },
    [customWorkoutDaily.completedWorkoutIds]
  );

  const getCustomWorkoutProgress = useCallback(
    (workout: CustomWorkout) => {
      const totalCount = workout.exercises.length;
      let completedCount = 0;
      workout.exercises.forEach((ex) => {
        if (customWorkoutDaily.exerciseStates[ex.id]?.completed) {
          completedCount++;
        }
      });
      const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const isComplete =
        customWorkoutDaily.completedWorkoutIds.includes(workout.id) ||
        (totalCount > 0 && completedCount === totalCount);
      return { completedCount, totalCount, percent, isComplete };
    },
    [customWorkoutDaily]
  );

  const toggleCustomExercise = useCallback(
    (workoutId: string, exerciseId: string) => {
      const workout = customWorkouts.find((w) => w.id === workoutId);
      if (!workout) return;

      const { state, isWorkoutNowComplete, isWorkoutNowUncompleted } = toggleCustomWorkoutExercise(
        todayDateKey,
        workout,
        exerciseId
      );
      setCustomWorkoutDaily(state);

      if (isWorkoutNowComplete) {
        awardCustomWorkoutXp(workout.id, workout.xpReward, workout.name);
      } else if (isWorkoutNowUncompleted) {
        reverseCustomWorkoutXp(workout.id);
      } else {
        const isDone = state.exerciseStates[exerciseId]?.completed;
        if (isDone) {
          audioManager.play('exercise_check');
        } else {
          audioManager.playUiClick();
        }
      }
    },
    [customWorkouts, todayDateKey, awardCustomWorkoutXp, reverseCustomWorkoutXp]
  );

  const setCustomWorkoutCompleted = useCallback(
    (workoutId: string, completed: boolean) => {
      const workout = customWorkouts.find((w) => w.id === workoutId);
      if (!workout) return;

      const nextState = setCustomWorkoutCompletedState(todayDateKey, workout, completed);
      setCustomWorkoutDaily(nextState);

      if (completed) {
        awardCustomWorkoutXp(workout.id, workout.xpReward, workout.name);
      } else {
        reverseCustomWorkoutXp(workout.id);
      }
    },
    [customWorkouts, todayDateKey, awardCustomWorkoutXp, reverseCustomWorkoutXp]
  );

  const value = useMemo<WorkoutContextType>(
    () => ({
      currentDayOfWeek,
      todayDateKey,
      todayPlan,
      selectedDayOfWeek,
      setSelectedDayOfWeek,
      activePlan,
      selectedMuscleGroupId,
      setSelectedMuscleGroupId,
      activeMuscleGroup,
      exerciseStates,
      toggleExercise,
      updateExerciseWeight,
      updateExerciseReps,
      totalTodayExercises,
      completedTodayExercises,
      todayProgressPercent,
      isTodayWorkoutComplete,
      totalActiveExercises,
      completedActiveExercises,
      activeProgressPercent,
      isActiveWorkoutComplete,
      getGroupStats,
      resetTodayWorkout,
      // Custom Workouts
      customWorkouts,
      todayCustomWorkouts,
      activeCustomWorkouts,
      customWorkoutDaily,
      addCustomWorkout,
      updateCustomWorkout: updateCustomWorkoutHandler,
      deleteCustomWorkout: deleteCustomWorkoutHandler,
      toggleCustomExercise,
      setCustomWorkoutCompleted,
      isCustomWorkoutCompleted,
      getCustomWorkoutProgress,
    }),
    [
      currentDayOfWeek,
      todayDateKey,
      todayPlan,
      selectedDayOfWeek,
      activePlan,
      selectedMuscleGroupId,
      activeMuscleGroup,
      exerciseStates,
      toggleExercise,
      updateExerciseWeight,
      updateExerciseReps,
      totalTodayExercises,
      completedTodayExercises,
      todayProgressPercent,
      isTodayWorkoutComplete,
      totalActiveExercises,
      completedActiveExercises,
      activeProgressPercent,
      isActiveWorkoutComplete,
      getGroupStats,
      resetTodayWorkout,
      customWorkouts,
      todayCustomWorkouts,
      activeCustomWorkouts,
      customWorkoutDaily,
      addCustomWorkout,
      updateCustomWorkoutHandler,
      deleteCustomWorkoutHandler,
      toggleCustomExercise,
      setCustomWorkoutCompleted,
      isCustomWorkoutCompleted,
      getCustomWorkoutProgress,
    ]
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
};

export function useWorkoutSystem(): WorkoutContextType {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkoutSystem must be used within a WorkoutProvider');
  }
  return context;
}

