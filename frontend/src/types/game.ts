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
  sessionId: string;
  seed: string;
  mode: GameMode;
  difficulty: Difficulty;
  cells: CellDTO[][];
  cages: CageDTO[];
  emptyCellsCount: number;
  playerHealth: PlayerHealthDTO | null;
  bot: BotDTO | null;
}

export type SolverStrategyType = 'NAIVE_ORACLE' | 'OPTIMIZED_MRV_PRUNING';

export type AlgorithmOperationType = 'PUZZLE_GEN' | 'CAGE_RESHAPE' | 'SOLVE';

export interface AlgorithmMetrics {
  strategyUsed: SolverStrategyType;
  operationType: AlgorithmOperationType;
  executionTimeMs: number;
  nodesVisited: number;
  prunedBranches: number;
  unionFindOps: number;
  memoryBytes: number;
  oracleVerified: boolean;
}

export interface StrategyBenchmarkStats {
  strategy: SolverStrategyType;
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgNodesVisited: number;
  avgPrunedBranches: number;
  peakMemoryBytes: number;
}

export interface BenchmarkRequest {
  difficulty: Difficulty;
  batchSize?: number;
  seedPrefix?: string;
}

export interface BenchmarkResultDTO {
  difficulty: Difficulty;
  batchSize: number;
  comparedCount: number;
  inconclusiveCount: number;
  seedPrefix: string;
  naive: StrategyBenchmarkStats;
  optimized: StrategyBenchmarkStats;
  nodeReductionPercent: number;
  oracleAgreementPercent: number;
  generatedAt: number;
}

export type GameEventType =
  | 'GAME_STARTED'
  | 'CELL_UPDATED'
  | 'MOVE_REJECTED'
  | 'BOT_UPDATED'
  | 'HP_CHANGED'
  | 'ALERT_WARNING'
  | 'CAGE_RESHAPED'
  | 'TICK'
  | 'GAME_WON'
  | 'GAME_LOST'
  | 'ERROR';

export interface CellUpdatePayload {
  position: Position;
  value: number;
  correct: boolean;
}

export interface AlertPayload {
  secondsRemaining: number;
}

export interface TickPayload {
  elapsedMs: number;
  botRemainingMs: number | null;
}

export interface GameOverPayload {
  won: boolean;
  finalTimeMs: number;
  reason: string;
}

export interface CageReshapedPayload {
  cages: CageDTO[];
  metrics: AlgorithmMetrics;
}

export interface ErrorPayload {
  message: string;
}

export interface GameEventPayloads {
  GAME_STARTED: BoardStateDTO;
  CELL_UPDATED: CellUpdatePayload;
  MOVE_REJECTED: CellUpdatePayload;
  BOT_UPDATED: BotDTO;
  HP_CHANGED: PlayerHealthDTO;
  ALERT_WARNING: AlertPayload;
  CAGE_RESHAPED: CageReshapedPayload;
  TICK: TickPayload;
  GAME_WON: GameOverPayload;
  GAME_LOST: GameOverPayload;
  ERROR: ErrorPayload;
}

export type GameEventMessage<T extends GameEventType = GameEventType> = {
  [K in T]: {
    type: K;
    sessionId: string;
    timestamp: number;
    payload: GameEventPayloads[K];
    metrics?: AlgorithmMetrics | null;
  };
}[T];

export interface StartGameRequest {
  mode: GameMode;
  difficulty: Difficulty;
  seed?: string;
  playerName?: string;
  solverStrategy?: SolverStrategyType;
}

export interface SubmitCellRequest {
  row: number;
  col: number;
  value: number;
}

export interface DailySeedResponse {
  date: string;
  seed: string;
}

export interface LeaderboardEntry {
  playerName: string;
  finalTimeMs: number;
  mode: GameMode;
  difficulty: Difficulty;
  date: string;
  completedAt: string;
}
