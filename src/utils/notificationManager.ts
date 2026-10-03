import { getLocalDateKey } from './storageCore.ts';
import { RoutineItemConfig } from '../types.ts';

const NOTIFICATION_LEDGER_KEY = 'questlife_notification_ledger_v1';
const NOTIFICATION_DISMISSED_PROMPT_KEY = 'questlife_notification_prompt_dismissed';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Get current browser notification permission
 */
export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Load the set of already-sent notification event IDs to prevent duplicate alerts
 */
function getNotificationLedger(): Record<string, number> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_LEDGER_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading notification ledger:', err);
    return {};
  }
}

/**
 * Mark a notification event as sent
 */
function markNotificationSent(eventId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const ledger = getNotificationLedger();
    ledger[eventId] = Date.now();
    // Prune events older than 14 days to keep storage lean
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const pruned: Record<string, number> = {};
    for (const [key, timestamp] of Object.entries(ledger)) {
      if (timestamp > fourteenDaysAgo) {
        pruned[key] = timestamp;
      }
    }
    window.localStorage.setItem(NOTIFICATION_LEDGER_KEY, JSON.stringify(pruned));
  } catch (err) {
    console.error('Error recording notification in ledger:', err);
  }
}

/**
 * Check if a notification event was already processed today
 */
export function isNotificationAlreadySent(eventId: string): boolean {
  const ledger = getNotificationLedger();
  return Boolean(ledger[eventId]);
}

/**
 * Explicit user permission request
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Check if the user dismissed the permission banner/modal
 */
export function isNotificationPromptDismissed(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(NOTIFICATION_DISMISSED_PROMPT_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set prompt dismissal state
 */
export function setNotificationPromptDismissed(dismissed: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (dismissed) {
      window.localStorage.setItem(NOTIFICATION_DISMISSED_PROMPT_KEY, 'true');
    } else {
      window.localStorage.removeItem(NOTIFICATION_DISMISSED_PROMPT_KEY);
    }
  } catch (err) {
    console.error('Error saving notification dismissal state:', err);
  }
}

/**
 * Core notification dispatcher with deduplication and SW fallback
 */
export async function dispatchSystemNotification(
  eventId: string,
  title: string,
  options: NotificationOptions
): Promise<boolean> {
  // Check permission
  if (getNotificationPermissionStatus() !== 'granted') {
    return false;
  }

  // Deduplication check
  if (isNotificationAlreadySent(eventId)) {
    return false;
  }

  const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    tag: eventId,
    ...options,
  };

  try {
    // Try Service Worker registration first if available
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.showNotification) {
        await registration.showNotification(title, notificationOptions);
        markNotificationSent(eventId);
        return true;
      }
    }

    // Fallback to standard Notification API
    if ('Notification' in window) {
      new Notification(title, notificationOptions);
      markNotificationSent(eventId);
      return true;
    }
  } catch (err) {
    console.error('Failed to display notification:', err);
  }

  return false;
}

/**
 * 1. Quest Completion Notification:
 * "Quest Complete +[X] XP"
 */
export async function notifyQuestCompletion(questId: string, questTitle: string, xp: number): Promise<boolean> {
  const dateKey = getLocalDateKey();
  const eventId = `${dateKey}_quest_complete_${questId}`;

  return dispatchSystemNotification(eventId, `Quest Complete +${xp} XP`, {
    body: `${questTitle} finished. Systems updated.`,
    data: { url: '/quests', questId },
  });
}

/**
 * 2. Reward Ready Notification:
 * "QuestLife: Mystery reward unlocked."
 * CRITICAL: Do NOT reveal reward name, type, icon, or identity!
 */
export async function notifyRewardReady(): Promise<boolean> {
  const dateKey = getLocalDateKey();
  const eventId = `${dateKey}_reward_ready`;

  return dispatchSystemNotification(eventId, 'QuestLife: Mystery reward unlocked.', {
    body: 'Daily 100% threshold reached. Open Rewards to reveal.',
    data: { url: '/rewards' },
  });
}

/**
 * 3. Daily Workout Reminder:
 * "QuestLife: Today's workout is ready."
 * Only sends on scheduled workout days, not on Sunday rest day unless specified.
 */
export async function notifyWorkoutReminder(workoutTitle: string, isRestDay: boolean): Promise<boolean> {
  if (isRestDay) return false;

  const dateKey = getLocalDateKey();
  const eventId = `${dateKey}_workout_reminder`;

  return dispatchSystemNotification(eventId, "QuestLife: Today's workout is ready.", {
    body: `Protocol: ${workoutTitle}. Begin your session when ready.`,
    data: { url: '/workout' },
  });
}

/**
 * 4. Water Intake Reminder:
 * Gentle hydration reminder, respects user target and avoids spam.
 */
export async function notifyWaterReminder(consumedMl: number, targetMl: number): Promise<boolean> {
  const dateKey = getLocalDateKey();
  const hour = new Date().getHours();
  // Limit to 2 time blocks max per day (e.g. midday block and late afternoon block)
  const block = hour < 14 ? 'midday' : 'afternoon';
  const eventId = `${dateKey}_water_reminder_${block}`;

  const remaining = Math.max(0, targetMl - consumedMl);
  if (remaining <= 0) return false;

  return dispatchSystemNotification(eventId, 'QuestLife: Hydration Check', {
    body: `${(consumedMl / 1000).toFixed(1)}L / ${(targetMl / 1000).toFixed(1)}L consumed. Drink water to maintain optimal performance.`,
    data: { url: '/water' },
  });
}

/**
 * 5. Routine Reminders based on user's configured schedule
 */
export async function checkAndDispatchRoutineReminder(item: RoutineItemConfig, isReady = true): Promise<boolean> {
  if (!item.enabled) return false;

  const dateKey = getLocalDateKey();
  const eventId = `${dateKey}_routine_reminder_${item.id}`;
  const suffix = isReady ? 'is ready.' : 'is coming up.';

  return dispatchSystemNotification(eventId, `QuestLife: ${item.title} quest ${suffix}`, {
    body: `Scheduled at ${item.timeSpan || item.startTime}. Category: ${item.category}.`,
    data: { url: '/quests' },
  });
}
