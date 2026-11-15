export type GameMode = 'CLASSIC' | 'BOT_CHALLENGE';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Position {
  row: number;
  col: number;
}

export interface CellDTO {
  row: number;
  col: number;
  currentValue: number;
  given: boolean;
  solved: boolean;
}

export interface CageDTO {
  id: number;
  cells: Position[];
  targetSum: number;
}

export interface PlayerHealthDTO {
  maxHp: number;
  currentHp: number;
}

export interface BotDTO {
  active: boolean;
  revealed: boolean;
  position: Position | null;
  remainingTimeoutMs: number;
  maxTimeoutMs: number;
}

export interface BoardStateDTO {
  mode: GameMode;
  difficulty: Difficulty;
  cells: CellDTO[][];
  cages: CageDTO[];
  emptyCellsCount: number;
  playerHealth: PlayerHealthDTO | null;
  bot: BotDTO | null;
}

export type GameEventType =
  | 'GAME_STARTED'
  | 'CELL_UPDATED'
  | 'MOVE_REJECTED'
  | 'BOT_SPAWNED'
  | 'BOT_REVEALED'
  | 'BOT_JUMPED'
  | 'BOT_TIMEOUT'
  | 'BOT_DEACTIVATED'
  | 'HP_CHANGED'
  | 'ALERT_WARNING'
  | 'CAGES_RESHAPED'
  | 'GAME_WON'
  | 'GAME_LOST';

export interface GameEventMessage<TPayload = unknown> {
  type: GameEventType;
  sessionId: string;
  timestamp: number;
  payload: TPayload;
}
