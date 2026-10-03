import { useEffect } from 'react';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';
import { useWaterSystem } from '../context/WaterContext.tsx';
import { useSettings } from '../context/SettingsContext.tsx';
import {
  getNotificationPermissionStatus,
  notifyWorkoutReminder,
  notifyWaterReminder,
  checkAndDispatchRoutineReminder,
} from '../utils/notificationManager.ts';

export function useReminderScheduler() {
  const { routineItems, todayKey } = useQuestSystem();
  const { todayPlan, isTodayWorkoutComplete } = useWorkoutSystem();
  const { totalConsumedMl, targetMl } = useWaterSystem();
  const { settings } = useSettings();

  useEffect(() => {
    // If notifications are not permitted in browser, skip
    if (getNotificationPermissionStatus() !== 'granted') {
      return;
    }

    const checkReminders = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

      // 1. Routine Schedule Reminders (based on user configured routine times)
      if (settings.notifications.dailyReminder) {
        routineItems.forEach((item) => {
          if (!item.enabled || !item.startTime) return;
          // Trigger within the 30-minute window of the start time
          const [itemHoursStr, itemMinutesStr] = item.startTime.split(':');
          if (itemHoursStr !== undefined) {
            const itemHours = parseInt(itemHoursStr, 10);
            const itemMinutes = itemMinutesStr ? parseInt(itemMinutesStr, 10) : 0;
            const diffMinutes = (currentHours - itemHours) * 60 + (currentMinutes - itemMinutes);

            // If within 15 minutes before start time: "is coming up"
            if (diffMinutes >= -15 && diffMinutes < 0) {
              checkAndDispatchRoutineReminder(item, false);
            }
            // If within 0 to 20 minutes past start time: "is ready"
            else if (diffMinutes >= 0 && diffMinutes <= 20) {
              checkAndDispatchRoutineReminder(item, true);
            }
          }
        });
      }

      // 2. Workout Reminder (references actual weekday workout plan; skips Sunday rest day)
      if (settings.notifications.workoutReminder && !isTodayWorkoutComplete) {
        // Find if user has a workout routine item, or trigger in late afternoon (e.g. 17:00 / 5 PM)
        const workoutRoutineItem = routineItems.find(
          (q) => (q.title.toLowerCase().includes('workout') || q.title.toLowerCase().includes('gym')) && q.enabled
        );
        let shouldTriggerWorkout = false;

        if (workoutRoutineItem && workoutRoutineItem.startTime) {
          const [wH, wM] = workoutRoutineItem.startTime.split(':');
          const workoutHours = parseInt(wH, 10);
          const workoutMinutes = wM ? parseInt(wM, 10) : 0;
          const diff = (currentHours - workoutHours) * 60 + (currentMinutes - workoutMinutes);
          if (diff >= -15 && diff <= 30) {
            shouldTriggerWorkout = true;
          }
        } else if (currentHours >= 17 && currentHours <= 20) {
          shouldTriggerWorkout = true;
        }

        if (shouldTriggerWorkout) {
          notifyWorkoutReminder(todayPlan.title, Boolean(todayPlan.isRestDay));
        }
      }

      // 3. Hydration check during active day
      if (settings.notifications.waterReminder && totalConsumedMl < targetMl) {
        if ((currentHours >= 12 && currentHours <= 14) || (currentHours >= 17 && currentHours <= 19)) {
          notifyWaterReminder(totalConsumedMl, targetMl);
        }
      }
    };

    // Run check on mount
    checkReminders();

    // Check periodically every 60 seconds
    const interval = setInterval(checkReminders, 60 * 1000);
    return () => clearInterval(interval);
  }, [
    routineItems,
    todayPlan,
    isTodayWorkoutComplete,
    totalConsumedMl,
    targetMl,
    settings.notifications,
    todayKey,
  ]);
}
