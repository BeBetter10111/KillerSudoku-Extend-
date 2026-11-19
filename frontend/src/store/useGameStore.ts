import { create } from 'zustand';
import type {
  AlgorithmMetrics,
  CageDTO,
  CellDTO,
  Difficulty,
  GameEventMessage,
  GameMode,
  Position,
  SolverStrategyType,
} from '../types/game';

export type GameStatus = 'IDLE' | 'PLAYING' | 'WON' | 'LOST';

const GRID_SIZE = 9;
const BOX_SIZE = 3;
export const TICKS_PER_SECOND = 4;
export const MAX_METRICS_HISTORY = 50;

export interface GameState {
  sessionId: string | null;
  seed: string | null;
  mode: GameMode | null;
  difficulty: Difficulty | null;
  solverStrategy: SolverStrategyType | null;
  gameStatus: GameStatus;
  endReason: string | null;
  errorMessage: string | null;

  grid: CellDTO[][];
  cages: CageDTO[];
  selectedCell: Position | null;
  notesMode: boolean;
  notes: Record<string, number[]>;
  lastErrorCell: Position | null;

  hp: number;
  maxHp: number;
  botPosition: Position | null;
  botRemainingMs: number | null;
  botMaxMs: number | null;
  isReshapeAlertActive: boolean;
  reshapeAlertTicksLeft: number;
  elapsedMs: number;

  latestMetrics: AlgorithmMetrics | null;
  metricsHistory: AlgorithmMetrics[];
}

export interface GameActions {
  selectCell: (position: Position | null) => void;
  toggleNotesMode: () => void;
  toggleNoteNumber: (value: number) => void;
  clearNotes: () => void;
  handleServerEvent: (event: GameEventMessage) => void;
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;

export const cellKey = (row: number, col: number): string => `${row},${col}`;

const createInitialState = (): GameState => ({
  sessionId: null,
  seed: null,
  mode: null,
  difficulty: null,
  solverStrategy: null,
  gameStatus: 'IDLE',
  endReason: null,
  errorMessage: null,

  grid: [],
  cages: [],
  selectedCell: null,
  notesMode: false,
  notes: {},
  lastErrorCell: null,

  hp: 0,
  maxHp: 0,
  botPosition: null,
  botRemainingMs: null,
  botMaxMs: null,
  isReshapeAlertActive: false,
  reshapeAlertTicksLeft: 0,
  elapsedMs: 0,

  latestMetrics: null,
  metricsHistory: [],
});

const NO_BOT = { botPosition: null, botRemainingMs: null, botMaxMs: null } as const;

function withCell(grid: CellDTO[][], row: number, col: number, patch: Partial<CellDTO>): CellDTO[][] {
  return grid.map((line, r) =>
    r === row ? line.map((cell, c) => (c === col ? { ...cell, ...patch } : cell)) : line,
  );
}

function pruneNotes(
  notes: Record<string, number[]>,
  filled: Position,
  value: number,
): Record<string, number[]> {
  const boxRow = Math.floor(filled.row / BOX_SIZE);
  const boxCol = Math.floor(filled.col / BOX_SIZE);
  const next: Record<string, number[]> = {};
  for (const [key, numbers] of Object.entries(notes)) {
    const [row, col] = key.split(',').map(Number);
    if (row === filled.row && col === filled.col) {
      continue;
    }
    const isPeer =
      row === filled.row ||
      col === filled.col ||
      (Math.floor(row / BOX_SIZE) === boxRow && Math.floor(col / BOX_SIZE) === boxCol);
    const remaining = isPeer ? numbers.filter((n) => n !== value) : numbers;
    if (remaining.length > 0) {
      next[key] = remaining;
    }
  }
  return next;
}

function extractMetrics(event: GameEventMessage): AlgorithmMetrics | null {
  if (event.metrics) {
    return event.metrics;
  }
  return event.type === 'CAGE_RESHAPED' ? (event.payload.metrics ?? null) : null;
}

function applyServerEvent(state: GameState, event: GameEventMessage): Partial<GameState> {
  switch (event.type) {
    case 'GAME_STARTED': {
      const dto = event.payload;
      const bot = dto.bot;
      const botVisible = bot !== null && bot.active && bot.revealed && bot.position !== null;
      return {
        ...createInitialState(),
        sessionId: dto.sessionId,
        seed: dto.seed,
        mode: dto.mode,
        difficulty: dto.difficulty,
        solverStrategy: event.metrics?.strategyUsed ?? state.solverStrategy,
        gameStatus: 'PLAYING',
        grid: dto.cells,
        cages: dto.cages,
        hp: dto.playerHealth?.currentHp ?? 0,
        maxHp: dto.playerHealth?.maxHp ?? 0,
        botPosition: botVisible ? bot.position : null,
        botRemainingMs: botVisible ? bot.remainingTimeoutMs : null,
        botMaxMs: botVisible ? bot.maxTimeoutMs : null,
      };
    }
    case 'CELL_UPDATED': {
      const { position, value } = event.payload;
      return {
        grid: withCell(state.grid, position.row, position.col, { currentValue: value, solved: true }),
        notes: pruneNotes(state.notes, position, value),
        lastErrorCell: null,
      };
    }
    case 'MOVE_REJECTED':
      return { lastErrorCell: { ...event.payload.position } };
    case 'BOT_UPDATED': {
      const bot = event.payload;
      if (bot.active && bot.revealed && bot.position !== null) {
        return {
          botPosition: bot.position,
          botRemainingMs: bot.remainingTimeoutMs,
          botMaxMs: bot.maxTimeoutMs,
        };
      }
      return { ...NO_BOT };
    }
    case 'HP_CHANGED':
      return { hp: event.payload.currentHp, maxHp: event.payload.maxHp };
    case 'ALERT_WARNING':
      return {
        isReshapeAlertActive: true,
        reshapeAlertTicksLeft: event.payload.secondsRemaining * TICKS_PER_SECOND,
      };
    case 'CAGE_RESHAPED':
      return { cages: event.payload.cages, isReshapeAlertActive: false, reshapeAlertTicksLeft: 0 };
    case 'TICK': {
      const ticksLeft = Math.max(0, state.reshapeAlertTicksLeft - 1);
      return {
        elapsedMs: event.payload.elapsedMs,
        botRemainingMs: event.payload.botRemainingMs,
        reshapeAlertTicksLeft: ticksLeft,
        isReshapeAlertActive: state.isReshapeAlertActive && ticksLeft > 0,
      };
    }
    case 'GAME_WON':
    case 'GAME_LOST':
      return {
        gameStatus: event.payload.won ? 'WON' : 'LOST',
        endReason: event.payload.reason,
        elapsedMs: event.payload.finalTimeMs,
        isReshapeAlertActive: false,
        reshapeAlertTicksLeft: 0,
        ...NO_BOT,
      };
    case 'ERROR':
      return { errorMessage: event.payload.message };
    default:
      return {};
  }
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...createInitialState(),

  selectCell: (position) => set({ selectedCell: position ? { ...position } : null, lastErrorCell: null }),

  toggleNotesMode: () => set((state) => ({ notesMode: !state.notesMode })),

  toggleNoteNumber: (value) => {
    const { selectedCell, grid, gameStatus, notes } = get();
    if (gameStatus !== 'PLAYING' || selectedCell === null) {
      return;
    }
    if (!Number.isInteger(value) || value < 1 || value > GRID_SIZE) {
      return;
    }
    const cell = grid[selectedCell.row]?.[selectedCell.col];
    if (!cell || cell.given || cell.currentValue !== 0) {
      return;
    }
    const key = cellKey(selectedCell.row, selectedCell.col);
    const current = notes[key] ?? [];
    const updated = current.includes(value)
      ? current.filter((n) => n !== value)
      : [...current, value].sort((a, b) => a - b);
    const { [key]: _removed, ...rest } = notes;
    set({ notes: updated.length > 0 ? { ...rest, [key]: updated } : rest });
  },

  clearNotes: () => {
    const { selectedCell, notes, gameStatus } = get();
    if (gameStatus !== 'PLAYING' || selectedCell === null) {
      return;
    }
    const key = cellKey(selectedCell.row, selectedCell.col);
    if (!(key in notes)) {
      return;
    }
    const { [key]: _removed, ...rest } = notes;
    set({ notes: rest });
  },

  handleServerEvent: (event) =>
    set((state) => {
      const patch = applyServerEvent(state, event);
      const metrics = extractMetrics(event);
      if (metrics === null) {
        return patch;
      }
      const history = event.type === 'GAME_STARTED' ? [] : state.metricsHistory;
      return {
        ...patch,
        latestMetrics: metrics,
        metricsHistory: [...history, metrics].slice(-MAX_METRICS_HISTORY),
      };
    }),

  resetGame: () => set(createInitialState()),
}));
