import { MysteryReward } from '../types.ts';

export const REWARD_POOL: MysteryReward[] = [
  {
    id: 'reward-fav-show',
    name: 'Watch an Episode of a Favorite Show',
    category: 'Entertainment',
    description: 'Enjoy 1 full episode of your favorite series completely guilt-free.',
    iconName: 'Tv',
    tagline: 'HUNTER LEISURE PROTOCOL // CLEARED',
    lore: 'The System grants a moment of tranquil immersion in legendary visual chronicles.',
  },
  {
    id: 'reward-guilt-free-gaming',
    name: '30 Minutes of Guilt-Free Gaming',
    category: 'Leisure',
    description: 'Jump into your favorite video game for 30 minutes with zero distractions or regrets.',
    iconName: 'Gamepad2',
    tagline: 'TACTICAL ENTERTAINMENT WINDOW',
    lore: 'Virtual battlefields await. Re-calibrate motor reflexes in a digital realm of your choice.',
  },
  {
    id: 'reward-favorite-playlist',
    name: 'Listen to a Favorite Playlist',
    category: 'Mindset',
    description: 'Put on quality headphones and listen to a curated audio session without multitasking.',
    iconName: 'Headphones',
    tagline: 'SONIC REJUVENATION FREQUENCY',
    lore: 'Harmonic resonance restores focus and clears neural static accumulated during trials.',
  },
  {
    id: 'reward-tomorrow-breakfast',
    name: "Choose Tomorrow's Breakfast",
    category: 'Wellness',
    description: 'Pre-select a delicious, nourishing morning meal that excites you for tomorrow.',
    iconName: 'Utensils',
    tagline: 'HIGH-PRIORITY NOURISHMENT PRIVILEGE',
    lore: 'Fueling an awakened hunter requires deliberate morning sustenance chosen by command.',
  },
  {
    id: 'reward-relaxing-break',
    name: 'Take a Relaxing Mindful Break',
    category: 'Wellness',
    description: 'Unplug completely for 20 minutes: stretch, breathe, or sit in peaceful silence.',
    iconName: 'Coffee',
    tagline: 'CELLULAR RESTORATION SANCTUARY',
    lore: 'Cease all cognitive demands. Re-charge your inner core through still equilibrium.',
  },
  {
    id: 'reward-movie-time',
    name: 'Movie Night Immersion',
    category: 'Entertainment',
    description: 'Reserve tonight or the upcoming evening to watch a film you have been wanting to see.',
    iconName: 'Film',
    tagline: 'CINEMATIC ODYSSEY AUTHORIZATION',
    lore: 'A long-form narrative unlocks. Immerse in master storytelling as an honored hunter.',
  },
  {
    id: 'reward-creative-time',
    name: 'Free Creative Exploration',
    category: 'Mindset',
    description: 'Spend 30 minutes drawing, writing, coding a fun idea, or working on a hobby project.',
    iconName: 'Sparkles',
    tagline: 'CREATIVE SPARK MATRIX ACTIVATED',
    lore: 'Channel raw willpower into original creation. Build without restrictions or deadlines.',
  },
  {
    id: 'reward-explore-topic',
    name: 'Explore a Fascinating New Topic',
    category: 'Mindset',
    description: 'Spend 25 minutes reading articles or watching a documentary on a subject you love.',
    iconName: 'Compass',
    tagline: 'KNOWLEDGE EXTRACTION DIRECTIVE',
    lore: 'An awakened hunter expands mental horizons. Absorb wisdom from uncharted domains.',
  },
  {
    id: 'reward-evening-activity',
    name: "Pick Tomorrow's Evening Activity",
    category: 'Leisure',
    description: 'You dictate tomorrow night’s relaxation: a night stroll, a favorite book, or a board game.',
    iconName: 'Moon',
    tagline: 'SCHEDULE SOVEREIGNTY GRANTED',
    lore: 'Mastery over one’s calendar is the true mark of high-rank hunters. Direct the evening hours.',
  },
  {
    id: 'reward-system-master-badge',
    name: 'Digital Achievement: Shadow Hunter Crest',
    category: 'Achievement',
    description: 'Commemorative digital badge awarded for flawless execution of daily system protocols.',
    iconName: 'ShieldCheck',
    tagline: 'HUNTER CITATION // PROTOCOL PERFECTION',
    lore: 'The System records an immutable insignia upon your Hunter soul. Rank perfection acknowledged.',
  },
  {
    id: 'reward-artisan-warm-drink',
    name: 'Artisan Warm Beverage Ritual',
    category: 'Wellness',
    description: 'Prepare or treat yourself to a gourmet tea, specialty coffee, or warm herbal infusion.',
    iconName: 'CupSoda',
    tagline: 'ELIXIR OF RECOVERY COMPOUND',
    lore: 'A fragrant warm brew calms the central nervous system and accelerates vitality recovery.',
  },
  {
    id: 'reward-undisturbed-reading',
    name: '20 Minutes of Undisturbed Reading',
    category: 'Mindset',
    description: 'Read an engaging chapter of fiction or non-fiction with all notifications muted.',
    iconName: 'BookOpen',
    tagline: 'SILENT SANCTUARY DECREE',
    lore: 'Silence all exterior broadcasts. Commune with the written thoughts of legendary minds.',
  },
];

/**
 * Deterministically picks a reward for a given date key (YYYY-MM-DD)
 * to ensure consistent selection before it is saved to localStorage.
 */
export function getDeterministicRewardForDate(dateKey: string): MysteryReward {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 37 + dateKey.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % REWARD_POOL.length;
  return REWARD_POOL[index];
}
