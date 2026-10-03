export type HunterRank = 'E-RANK' | 'D-RANK' | 'C-RANK' | 'B-RANK' | 'A-RANK' | 'S-RANK';

export function getHunterRank(level: number): HunterRank {
  if (level >= 80) return 'S-RANK';
  if (level >= 50) return 'A-RANK';
  if (level >= 31) return 'B-RANK';
  if (level >= 21) return 'C-RANK';
  if (level >= 11) return 'D-RANK';
  return 'E-RANK';
}

/**
 * Standardized dynamic hunter greeting format:
 * "WELCOME, HUNTER CHARAN • E-RANK"
 * Automatically adjusts when userName or rank updates.
 */
export function formatHunterGreeting(userName: string | undefined | null, rank: HunterRank | string): string {
  const raw = (userName || 'CHARAN').trim().toUpperCase();
  const name = raw.startsWith('HUNTER') ? raw : `HUNTER ${raw || 'CHARAN'}`;
  return `WELCOME, ${name} • ${rank}`;
}

export interface LevelInfo {
  level: number;
  rank: HunterRank;
  nextLevel: number;
  currentXp: number;
  currentLevelStartXp: number;
  nextLevelXp: number;
  xpToNext: number;
  progressPercent: number;
}

/**
 * Calculates Hunter Level and dynamic progress according to Phase 5:
 *
 * Rules:
 * LEVEL 1: 0–499 XP
 * LEVEL 2: 500–999 XP
 * LEVEL 3: 1000–1499 XP
 * Formula: level = floor(totalXP / 500) + 1
 *
 * Examples:
 * 0 XP → Level 1 (next: 500 XP)
 * 499 XP → Level 1 (next: 500 XP)
 * 500 XP → Level 2 (next: 1000 XP)
 * 3250 XP → Level 7 (starts 3000 XP, next 3500 XP, 250 to next, 50%)
 * 3450 XP → Level 7 (starts 3000 XP, next 3500 XP, 50 to next, 90%)
 */
export function getLevelInfo(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));

  // Fresh initial account: Level 0: 0 XP, E-RANK.
  // After the user earns their first XP, begin normal level progression.
  if (safeXp === 0) {
    return {
      level: 0,
      rank: 'E-RANK',
      nextLevel: 1,
      currentXp: 0,
      currentLevelStartXp: 0,
      nextLevelXp: 500,
      xpToNext: 500,
      progressPercent: 0,
    };
  }

  // Formula: level = floor(totalXP / 500) + 1
  const level = Math.floor(safeXp / 500) + 1;
  const currentLevelStartXp = (level - 1) * 500;
  const nextLevelXp = level * 500;
  const xpToNext = Math.max(0, nextLevelXp - safeXp);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((safeXp - currentLevelStartXp) / 500) * 100))
  );

  return {
    level,
    rank: getHunterRank(level),
    nextLevel: level + 1,
    currentXp: safeXp,
    currentLevelStartXp,
    nextLevelXp,
    xpToNext,
    progressPercent,
  };
}

