import { RoutineItemConfig, QuestCategory } from '../types.ts';

// Clean initial routine: empty until configured by the user
export const DEFAULT_ROUTINE_ITEMS: RoutineItemConfig[] = [];

// Suggested quick presets for user convenience during task setup
export interface SuggestedQuestTemplate {
  title: string;
  category: QuestCategory;
  startTime: string;
  xp: number;
  verificationMethod: 'MANUAL' | 'CAPTURE' | 'MANUAL + CAPTURE';
}

export const SUGGESTED_QUEST_TEMPLATES: SuggestedQuestTemplate[] = [
  { title: 'Wake Up', category: 'Morning', startTime: '05:00 AM', xp: 50, verificationMethod: 'MANUAL + CAPTURE' },
  { title: 'Brush', category: 'Morning', startTime: '05:15 AM', xp: 30, verificationMethod: 'MANUAL' },
  { title: 'Drink Water', category: 'Morning', startTime: '05:30 AM', xp: 50, verificationMethod: 'MANUAL + CAPTURE' },
  { title: 'Workout', category: 'Morning', startTime: '06:00 AM', xp: 100, verificationMethod: 'MANUAL + CAPTURE' },
  { title: 'Bath', category: 'Morning', startTime: '07:00 AM', xp: 50, verificationMethod: 'MANUAL' },
  { title: 'Pack Bag', category: 'Morning', startTime: '07:30 AM', xp: 30, verificationMethod: 'MANUAL' },
  { title: 'College', category: 'College', startTime: '09:00 AM', xp: 100, verificationMethod: 'MANUAL' },
  { title: 'Skill Learning', category: 'Evening', startTime: '06:30 PM', xp: 100, verificationMethod: 'MANUAL + CAPTURE' },
  { title: 'Freelancing', category: 'Evening', startTime: '07:30 PM', xp: 100, verificationMethod: 'MANUAL' },
  { title: 'Dinner', category: 'Evening', startTime: '09:00 PM', xp: 50, verificationMethod: 'MANUAL' },
  { title: 'Walk', category: 'Evening', startTime: '09:30 PM', xp: 50, verificationMethod: 'MANUAL + CAPTURE' },
  { title: 'Sleep', category: 'Night', startTime: '11:00 PM', xp: 50, verificationMethod: 'MANUAL' },
];
