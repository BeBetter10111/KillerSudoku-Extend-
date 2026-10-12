export type GameMode = 'CLASSIC' | 'BOT_CHALLENGE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GameConfig {
  hpMax: number;
  botTimeoutMs: number | null;
  reshapeIntervalMs: number | null;
  botHpPenalty: number;
  reshapeWarningMs: number;
}