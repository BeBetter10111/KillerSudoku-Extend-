import type { Position } from './position';
import type { CellValue } from './cell';
import type { Cage } from './cage';
import type { BoardState } from './board';
import type { Difficulty, GameConfig, GameMode } from './config';

/* ------------------------------------------------------------------ */
/* Event names (runtime constants)                                     */
/* ------------------------------------------------------------------ */

export const ClientEvent = {
  START_GAME: 'START_GAME',
  SUBMIT_CELL: 'SUBMIT_CELL',
} as const;

export const ServerEvent = {
  GAME_STATE: 'GAME_STATE',
  CELL_RESULT: 'CELL_RESULT',
  HP_UPDATE: 'HP_UPDATE',
  BOT_SPAWN: 'BOT_SPAWN',
  BOT_DESPAWN: 'BOT_DESPAWN',
  ALERT_WARNING: 'ALERT_WARNING',
  CAGE_RESHAPED: 'CAGE_RESHAPED',
  TICK: 'TICK',
  GAME_OVER: 'GAME_OVER',
  ERROR: 'ERROR',
} as const;

/* ------------------------------------------------------------------ */
/* Client -> Server payloads                                           */
/* ------------------------------------------------------------------ */

export interface StartGamePayload {
  mode: GameMode;
  difficulty: Difficulty;
}

export interface SubmitCellPayload {
  position: Position;
  /** null clears the cell. */
  value: CellValue;
}

/* ------------------------------------------------------------------ */
/* Server -> Client payloads                                           */
/* ------------------------------------------------------------------ */

export type GameStatus = 'PLAYING' | 'WON' | 'LOST';

/** Full snapshot: sent on game start and whenever the client needs to resync. */
export interface GameStatePayload {
  mode: GameMode;
  difficulty: Difficulty;
  config: GameConfig;
  board: BoardState;
  hp: number;
  elapsedMs: number;
  status: GameStatus;
  /** Present only while a bot is active. */
  bot: BotSpawnPayload | null;
}

export interface CellResultPayload {
  position: Position;
  value: CellValue;
  isCorrect: boolean;
  /** True if this move solved the bot's current cell. */
  solvedBotCell: boolean;
}

export type HpChangeReason = 'WRONG_CELL' | 'BOT_TIMEOUT';

export interface HpUpdatePayload {
  hp: number;
  hpMax: number;
  /** Negative for damage. */
  delta: number;
  reason: HpChangeReason;
}

export interface BotSpawnPayload {
  position: Position;
  /** Server epoch ms when the bot's timeout expires. */
  expiresAt: number;
}

export type BotDespawnReason = 'SOLVED' | 'TIMEOUT' | 'END_GAME_GUARD';

export interface BotDespawnPayload {
  position: Position;
  reason: BotDespawnReason;
}

export type AlertType = 'CAGE_RESHAPE';

export interface AlertWarningPayload {
  type: AlertType;
  /** Seconds until the event fires (e.g. 10). */
  secondsRemaining: number;
  /** Server epoch ms when the event fires. */
  triggersAt: number;
}

export interface CageReshapedPayload {
  cages: Cage[];
}

export interface TickPayload {
  elapsedMs: number;
  /** Server epoch ms, lets the client correct drift. */
  serverTime: number;
}

export type GameOverReason = 'SOLVED' | 'HP_DEPLETED';

export interface GameOverPayload {
  status: Exclude<GameStatus, 'PLAYING'>;
  reason: GameOverReason;
  elapsedMs: number;
}

export interface ErrorPayload {
  code: 'INVALID_MOVE' | 'NO_ACTIVE_GAME' | 'INVALID_CONFIG';
  message: string;
}

/* ------------------------------------------------------------------ */
/* Typed Socket.IO maps                                                */
/* ------------------------------------------------------------------ */

export interface ClientToServerEvents {
  [ClientEvent.START_GAME]: (payload: StartGamePayload) => void;
  [ClientEvent.SUBMIT_CELL]: (payload: SubmitCellPayload) => void;
}

export interface ServerToClientEvents {
  [ServerEvent.GAME_STATE]: (payload: GameStatePayload) => void;
  [ServerEvent.CELL_RESULT]: (payload: CellResultPayload) => void;
  [ServerEvent.HP_UPDATE]: (payload: HpUpdatePayload) => void;
  [ServerEvent.BOT_SPAWN]: (payload: BotSpawnPayload) => void;
  [ServerEvent.BOT_DESPAWN]: (payload: BotDespawnPayload) => void;
  [ServerEvent.ALERT_WARNING]: (payload: AlertWarningPayload) => void;
  [ServerEvent.CAGE_RESHAPED]: (payload: CageReshapedPayload) => void;
  [ServerEvent.TICK]: (payload: TickPayload) => void;
  [ServerEvent.GAME_OVER]: (payload: GameOverPayload) => void;
  [ServerEvent.ERROR]: (payload: ErrorPayload) => void;
}