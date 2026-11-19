import { act } from '@testing-library/react';
import { useGameStore } from '../store/useGameStore';
import type {
  AlgorithmMetrics,
  BoardStateDTO,
  BotDTO,
  CageDTO,
  CellDTO,
  GameEventMessage,
  Position,
} from '../types/game';

export const SESSION = 'session-1';

export function gridWith(values: Record<string, number> = {}, givens: string[] = ['0,0']): CellDTO[][] {
  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => {
      const key = `${row},${col}`;
      const given = givens.includes(key);
      return {
        row,
        col,
        currentValue: values[key] ?? (given ? 5 : 0),
        given,
        solved: given || key in values,
      };
    }),
  );
}

export function boardState(overrides: Partial<BoardStateDTO> = {}): BoardStateDTO {
  const cages: CageDTO[] = [
    { id: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], targetSum: 9 },
    { id: 1, cells: [{ row: 2, col: 3 }, { row: 3, col: 3 }, { row: 3, col: 4 }], targetSum: 14 },
  ];
  return {
    sessionId: SESSION,
    seed: 'seed-1',
    mode: 'BOT_CHALLENGE',
    difficulty: 'MEDIUM',
    cells: gridWith(),
    cages,
    emptyCellsCount: 80,
    playerHealth: { maxHp: 100, currentHp: 100 },
    bot: { active: true, revealed: false, position: null, remainingTimeoutMs: 30000, maxTimeoutMs: 30000 },
    ...overrides,
  };
}

export const algorithmMetrics = (overrides: Partial<AlgorithmMetrics> = {}): AlgorithmMetrics => ({
  strategyUsed: 'OPTIMIZED_MRV_PRUNING',
  operationType: 'CAGE_RESHAPE',
  executionTimeMs: 3.2,
  nodesVisited: 120,
  prunedBranches: 45,
  unionFindOps: 310,
  memoryBytes: 65536,
  oracleVerified: true,
  ...overrides,
});

export function emit(event: Omit<GameEventMessage, 'sessionId' | 'timestamp'>): void {
  act(() => {
    useGameStore.getState().handleServerEvent({ ...event, sessionId: SESSION, timestamp: 0 } as GameEventMessage);
  });
}

export function startGame(overrides: Partial<BoardStateDTO> = {}): void {
  emit({ type: 'GAME_STARTED', payload: boardState(overrides) });
}

export const revealedBot = (position: Position, remainingTimeoutMs = 30000, maxTimeoutMs = 30000): BotDTO => ({
  active: true,
  revealed: true,
  position,
  remainingTimeoutMs,
  maxTimeoutMs,
});
