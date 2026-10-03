import { TaskVerificationConfig } from '../types.ts';

/**
 * Parses time strings like "5:00 AM", "05:10 AM", "6:00 PM" into minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return (hours * 60 + minutes) % 1440;
}

/**
 * Formats minutes from midnight (0..1439) into "hh:mm AM/PM".
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(norm / 60);
  const mins = norm % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
  return `${hours12}:${minsStr} ${period}`;
}

/**
 * Checks if a given minute of day is inside [startMinute, endMinute].
 * Handles intervals crossing midnight (e.g. 23:00 to 01:00).
 */
export function isMinuteInWindow(currentMinute: number, startMinute: number, endMinute: number): boolean {
  if (startMinute <= endMinute) {
    return currentMinute >= startMinute && currentMinute <= endMinute;
  }
  // Crosses midnight
  return currentMinute >= startMinute || currentMinute <= endMinute;
}

/**
 * Known specific task verification configurations matching user specifications:
 * - Wake Up: 5:00 AM (window: 5:00 AM - 5:30 AM)
 * - Brush: 5:05 AM (window: 5:00 AM - 5:35 AM)
 * - Water: Manual completion only
 * - Workout: Manual completion by default. Capture optional.
 * - Bath/Shower: Manual completion only (STRICT PRIVACY RULE)
 * - Dinner: Manual completion only
 * - College: 9:00 AM - 6:00 PM (College / environment / uniform photo)
 * - Freelancing: 8:00 PM - 9:00 PM (Laptop / workspace photo)
 * - Skill Learning: 6:40 PM - 8:00 PM (Study / workspace photo)
 * - Sleep: 11:00 PM (Non-private room / bed photo, manual always available)
 */
const KNOWN_TASK_RULES: Record<string, Partial<TaskVerificationConfig>> = {
  'quest-morning-wake-up': {
    allowCapture: true,
    targetTimeStr: '5:00 AM',
    windowStartMinute: 5 * 60, // 5:00 AM
    windowEndMinute: 5 * 60 + 30, // 5:30 AM
    windowDisplayStr: '5:00 AM – 5:30 AM',
    capturePrompt: 'Morning alarm, sunrise, or room photo',
  },
  'quest-morning-brush': {
    allowCapture: true,
    targetTimeStr: '5:05 AM',
    windowStartMinute: 5 * 60, // 5:00 AM
    windowEndMinute: 5 * 60 + 35, // 5:35 AM
    windowDisplayStr: '5:00 AM – 5:35 AM',
    capturePrompt: 'Toothbrush or sink setup photo',
  },
  'quest-morning-drink-water': {
    allowCapture: false,
    targetTimeStr: '5:10 AM',
    privacyNotice: 'Water intake is verified via manual completion.',
  },
  'quest-morning-workout': {
    allowCapture: true,
    targetTimeStr: '5:10 AM',
    windowStartMinute: 5 * 60 + 10, // 5:10 AM
    windowEndMinute: 6 * 60 + 15, // 6:15 AM
    windowDisplayStr: '5:10 AM – 6:15 AM',
    capturePrompt: 'Workout area, fitness equipment, or workout gear photo',
  },
  'quest-morning-bath': {
    allowCapture: false,
    targetTimeStr: '6:00 AM',
    privacyNotice: 'Private activity. Manual completion only.',
  },
  'quest-morning-breakfast': {
    allowCapture: true,
    targetTimeStr: '6:20 AM',
    windowStartMinute: 6 * 60 + 15,
    windowEndMinute: 7 * 60,
    windowDisplayStr: '6:15 AM – 7:00 AM',
    capturePrompt: 'Breakfast meal or table setting photo',
  },
  'quest-morning-pack-bag': {
    allowCapture: true,
    targetTimeStr: '6:50 AM',
    windowStartMinute: 6 * 60 + 40,
    windowEndMinute: 7 * 60 + 20,
    windowDisplayStr: '6:40 AM – 7:20 AM',
    capturePrompt: 'Packed backpack, books, or study essentials photo',
  },
  'quest-college-travel': {
    allowCapture: true,
    targetTimeStr: '7:15 AM',
    windowStartMinute: 7 * 60,
    windowEndMinute: 8 * 60 + 45,
    windowDisplayStr: '7:00 AM – 8:45 AM',
    capturePrompt: 'Transit, commute, or travel route photo',
  },
  'quest-college-college': {
    allowCapture: true,
    targetTimeStr: '9:00 AM',
    windowStartMinute: 9 * 60, // 9:00 AM
    windowEndMinute: 18 * 60, // 6:00 PM
    windowDisplayStr: '9:00 AM – 6:00 PM',
    capturePrompt: 'College, campus environment, or uniform photo',
  },
  'quest-college-water-target': {
    allowCapture: false,
    targetTimeStr: '9:00 AM',
    privacyNotice: 'Water target is verified via manual completion.',
  },
  'quest-evening-bath': {
    allowCapture: false,
    targetTimeStr: '6:00 PM',
    privacyNotice: 'Private activity. Manual completion only.',
  },
  'quest-evening-snack': {
    allowCapture: true,
    targetTimeStr: '6:20 PM',
    windowStartMinute: 18 * 60 + 15,
    windowEndMinute: 19 * 60,
    windowDisplayStr: '6:15 PM – 7:00 PM',
    capturePrompt: 'Evening snack or relaxation area photo',
  },
  'quest-evening-skill-learning': {
    allowCapture: true,
    targetTimeStr: '6:40 PM',
    windowStartMinute: 18 * 60 + 30, // 6:30 PM
    windowEndMinute: 20 * 60 + 15, // 8:15 PM
    windowDisplayStr: '6:30 PM – 8:15 PM',
    capturePrompt: 'Study notes, textbook, or learning workspace photo',
  },
  'quest-evening-freelancing': {
    allowCapture: true,
    targetTimeStr: '8:00 PM',
    windowStartMinute: 19 * 60 + 45, // 7:45 PM
    windowEndMinute: 21 * 60 + 15, // 9:15 PM
    windowDisplayStr: '7:45 PM – 9:15 PM',
    capturePrompt: 'Laptop, coding IDE, or project workspace photo',
  },
  'quest-evening-dinner': {
    allowCapture: false,
    targetTimeStr: '9:00 PM',
    privacyNotice: 'Dinner is verified via manual completion only.',
  },
  'quest-evening-walk': {
    allowCapture: true,
    targetTimeStr: '9:30 PM',
    windowStartMinute: 21 * 60 + 15,
    windowEndMinute: 22 * 60 + 15,
    windowDisplayStr: '9:15 PM – 10:15 PM',
    capturePrompt: 'Walking shoes, outdoor pathway, or step count photo',
  },
  'quest-night-work': {
    allowCapture: true,
    targetTimeStr: '10:00 PM',
    windowStartMinute: 21 * 60 + 45,
    windowEndMinute: 23 * 60 + 30,
    windowDisplayStr: '9:45 PM – 11:30 PM',
    capturePrompt: 'Desk setup or night study workspace photo',
  },
  'quest-night-sleep': {
    allowCapture: true,
    targetTimeStr: '11:00 PM',
    windowStartMinute: 22 * 60 + 30, // 10:30 PM
    windowEndMinute: 23 * 60 + 59, // 11:59 PM
    windowDisplayStr: '10:30 PM – 11:59 PM',
    capturePrompt: 'Non-private room or bed setup photo (manual completion always available)',
  },
};

/**
 * Determines task verification configuration for any task (default or custom).
 */
export function getTaskVerificationConfig(
  taskId: string,
  title: string,
  startTime?: string,
  endTime?: string,
  timeSpan?: string
): TaskVerificationConfig {
  const lowerTitle = title.toLowerCase();

  // Strict Privacy and Manual-Only Filter:
  // Bath/shower, water, dinner must always be manual only
  if (
    lowerTitle.includes('bath') ||
    lowerTitle.includes('shower') ||
    lowerTitle.includes('freshen up') ||
    lowerTitle.includes('change') ||
    lowerTitle.includes('water') ||
    lowerTitle.includes('drink') ||
    lowerTitle.includes('dinner')
  ) {
    const isBath = lowerTitle.includes('bath') || lowerTitle.includes('shower');
    return {
      allowCapture: false,
      targetTimeStr: startTime || timeSpan || 'Scheduled',
      windowStartMinute: 0,
      windowEndMinute: 1439,
      windowDisplayStr: 'Manual completion only',
      privacyNotice: isBath
        ? 'Private activity. Manual completion only.'
        : 'Manual completion only.',
    };
  }

  // Check known map
  const known = KNOWN_TASK_RULES[taskId];
  if (known && known.allowCapture !== undefined) {
    return {
      allowCapture: known.allowCapture ?? true,
      targetTimeStr: known.targetTimeStr || startTime || 'Scheduled',
      windowStartMinute: known.windowStartMinute ?? 0,
      windowEndMinute: known.windowEndMinute ?? 1439,
      windowDisplayStr: known.windowDisplayStr || 'Scheduled window',
      capturePrompt: known.capturePrompt || 'Take a verification photo',
      privacyNotice: known.privacyNotice,
    };
  }

  // Title-based pattern matching for custom tasks
  if (lowerTitle.includes('college') || lowerTitle.includes('school') || lowerTitle.includes('class')) {
    return {
      allowCapture: true,
      targetTimeStr: startTime || '9:00 AM',
      windowStartMinute: 9 * 60,
      windowEndMinute: 18 * 60,
      windowDisplayStr: '9:00 AM – 6:00 PM',
      capturePrompt: 'College, campus environment, or uniform photo',
    };
  }

  if (lowerTitle.includes('freelanc') || lowerTitle.includes('code') || lowerTitle.includes('laptop')) {
    return {
      allowCapture: true,
      targetTimeStr: startTime || '8:00 PM',
      windowStartMinute: 19 * 60 + 30,
      windowEndMinute: 21 * 60 + 30,
      windowDisplayStr: '7:30 PM – 9:30 PM',
      capturePrompt: 'Laptop or workspace photo',
    };
  }

  if (lowerTitle.includes('skill') || lowerTitle.includes('study') || lowerTitle.includes('read')) {
    return {
      allowCapture: true,
      targetTimeStr: startTime || '6:40 PM',
      windowStartMinute: 18 * 60 + 30,
      windowEndMinute: 20 * 60 + 30,
      windowDisplayStr: '6:30 PM – 8:30 PM',
      capturePrompt: 'Study or workspace photo',
    };
  }

  if (lowerTitle.includes('sleep') || lowerTitle.includes('bed')) {
    return {
      allowCapture: true,
      targetTimeStr: startTime || '11:00 PM',
      windowStartMinute: 22 * 60 + 30,
      windowEndMinute: 23 * 60 + 59,
      windowDisplayStr: '10:30 PM – 11:59 PM',
      capturePrompt: 'Non-private room or bed photo',
    };
  }

  if (lowerTitle.includes('workout') || lowerTitle.includes('gym') || lowerTitle.includes('exercise')) {
    return {
      allowCapture: true,
      targetTimeStr: startTime || '5:10 AM',
      windowStartMinute: 5 * 60,
      windowEndMinute: 7 * 60,
      windowDisplayStr: '5:00 AM – 7:00 AM',
      capturePrompt: 'Fitness gear or workout space photo',
    };
  }

  // Derive from startTime and endTime if provided
  const parsedStart = startTime ? parseTimeToMinutes(startTime) : null;
  const parsedEnd = endTime ? parseTimeToMinutes(endTime) : null;

  if (parsedStart !== null) {
    const startMin = Math.max(0, parsedStart - 15);
    const endMin = parsedEnd !== null ? parsedEnd + 15 : (parsedStart + 45) % 1440;
    return {
      allowCapture: true,
      targetTimeStr: startTime || 'Scheduled',
      windowStartMinute: startMin,
      windowEndMinute: endMin,
      windowDisplayStr: `${formatMinutesToTime(startMin)} – ${formatMinutesToTime(endMin)}`,
      capturePrompt: 'Task verification photo',
    };
  }

  // Default fallback for any generic custom task
  return {
    allowCapture: true,
    targetTimeStr: timeSpan || 'Anytime',
    windowStartMinute: 0,
    windowEndMinute: 1439,
    windowDisplayStr: 'Open window (Anytime today)',
    capturePrompt: 'Task verification photo',
  };
}

/**
 * Checks if the current local time is within the allowed time window for a task.
 */
export function checkIsWithinTimeWindow(
  config: TaskVerificationConfig,
  currentDate: Date = new Date()
): {
  isWithin: boolean;
  currentFormattedTime: string;
  windowDisplay: string;
  currentMinute: number;
} {
  const currentMinute = currentDate.getHours() * 60 + currentDate.getMinutes();
  const currentFormattedTime = formatMinutesToTime(currentMinute);

  const isWithin = isMinuteInWindow(
    currentMinute,
    config.windowStartMinute,
    config.windowEndMinute
  );

  return {
    isWithin,
    currentFormattedTime,
    windowDisplay: config.windowDisplayStr,
    currentMinute,
  };
}
