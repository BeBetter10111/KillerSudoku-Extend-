export type GameMode = 'CLASSIC' | 'BOT_CHALLENGE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GameConfig {
  /** Starting and maximum HP. */
  hpMax: number;
  /** Time the player has to solve the bot's cell. null = bot disabled. */
  botTimeoutMs: number | null;
  /** Interval between cage reshapes. null = reshape disabled. */
  reshapeIntervalMs: number | null;
  /** HP lost each time the bot's timeout expires. */
  botHpPenalty: number;
  /** How long before a reshape the ALERT_WARNING is emitted. */
  reshapeWarningMs: number;
}