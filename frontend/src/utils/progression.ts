import type { Difficulty, GameMode, Progress } from '../types/game';

/** Plays of the previous level required before a level unlocks (mirrors the server rule). */
export const REQUIRED_PLAYS: Readonly<Record<Difficulty, number>> = {
  EASY: 0,
  MEDIUM: 3,
  HARD: 5,
};

const PREVIOUS_LEVEL: Readonly<Record<Difficulty, Difficulty | null>> = {
  EASY: null,
  MEDIUM: 'EASY',
  HARD: 'MEDIUM',
};

export function emptyProgress(): Progress {
  return {
    CLASSIC: { EASY: 0, MEDIUM: 0, HARD: 0 },
    BOT_CHALLENGE: { EASY: 0, MEDIUM: 0, HARD: 0 },
  };
}

export function isUnlocked(progress: Progress, mode: GameMode, difficulty: Difficulty): boolean {
  const previous = PREVIOUS_LEVEL[difficulty];
  return previous === null || (progress[mode]?.[previous] ?? 0) >= REQUIRED_PLAYS[difficulty];
}

/** Human-readable reason a level is locked, or null when it is playable. */
export function lockReason(progress: Progress, mode: GameMode, difficulty: Difficulty): string | null {
  const previous = PREVIOUS_LEVEL[difficulty];
  if (previous === null || isUnlocked(progress, mode, difficulty)) {
    return null;
  }
  const done = progress[mode]?.[previous] ?? 0;
  return `Play ${previous.charAt(0) + previous.slice(1).toLowerCase()} ${done}/${REQUIRED_PLAYS[difficulty]} times to unlock`;
}
