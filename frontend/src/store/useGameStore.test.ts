import { beforeEach, describe, expect, it } from 'vitest';
import type {
  BoardStateDTO,
  BotDTO,
  CageDTO,
  CellDTO,
  GameEventMessage,
  Position,
} from '../types/game';
import { algorithmMetrics } from '../test/fixtures';
import { MAX_METRICS_HISTORY, cellKey, useGameStore } from './useGameStore';

const SESSION = 'session-1';

function emptyGrid(): CellDTO[][] {
  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => ({
      row,
      col,
      currentValue: row === 0 && col === 0 ? 5 : 0,
      given: row === 0 && col === 0,
      solved: row === 0 && col === 0,
    })),
  );
}

function boardState(overrides: Partial<BoardStateDTO> = {}): BoardStateDTO {
  return {
    sessionId: SESSION,
    seed: 'seed-1',
    mode: 'BOT_CHALLENGE',
    difficulty: 'MEDIUM',
    cells: emptyGrid(),
    cages: [{ id: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], targetSum: 9 }],
    emptyCellsCount: 80,
    playerHealth: { maxHp: 100, currentHp: 100 },
    bot: { active: true, revealed: false, position: null, remainingTimeoutMs: 30000, maxTimeoutMs: 30000 },
    ...overrides,
  };
}

function send(event: Omit<GameEventMessage, 'sessionId' | 'timestamp'>): void {
  useGameStore.getState().handleServerEvent({ ...event, sessionId: SESSION, timestamp: 0 } as GameEventMessage);
}

function startGame(overrides: Partial<BoardStateDTO> = {}): void {
  send({ type: 'GAME_STARTED', payload: boardState(overrides) });
}

const revealedBot = (position: Position, remaining = 30000, max = 30000): BotDTO => ({
  active: true,
  revealed: true,
  position,
  remainingTimeoutMs: remaining,
  maxTimeoutMs: max,
});

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('starts idle with an empty board', () => {
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('IDLE');
    expect(state.grid).toEqual([]);
    expect(state.sessionId).toBeNull();
    expect(state.notesMode).toBe(false);
  });

  it('hydrates from GAME_STARTED and keeps a hidden bot invisible', () => {
    startGame();
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('PLAYING');
    expect(state.sessionId).toBe(SESSION);
    expect(state.seed).toBe('seed-1');
    expect(state.mode).toBe('BOT_CHALLENGE');
    expect(state.grid).toHaveLength(9);
    expect(state.cages).toHaveLength(1);
    expect(state.hp).toBe(100);
    expect(state.maxHp).toBe(100);
    expect(state.botPosition).toBeNull();
    expect(state.botRemainingMs).toBeNull();
  });

  it('has no HP or bot in classic mode', () => {
    startGame({ mode: 'CLASSIC', playerHealth: null, bot: null });
    const state = useGameStore.getState();
    expect(state.hp).toBe(0);
    expect(state.maxHp).toBe(0);
    expect(state.botPosition).toBeNull();
  });

  it('resets everything when a new game starts', () => {
    startGame();
    useGameStore.getState().selectCell({ row: 2, col: 2 });
    useGameStore.getState().toggleNotesMode();
    startGame();
    const state = useGameStore.getState();
    expect(state.selectedCell).toBeNull();
    expect(state.notesMode).toBe(false);
    expect(state.errorMessage).toBeNull();
  });

  it('applies a correct cell, clears its notes and prunes the value from peers', () => {
    startGame();
    const store = useGameStore.getState();
    store.selectCell({ row: 4, col: 4 });
    store.toggleNoteNumber(3);
    store.toggleNoteNumber(7);
    store.selectCell({ row: 4, col: 8 });
    store.toggleNoteNumber(7);
    store.toggleNoteNumber(2);
    store.selectCell({ row: 8, col: 0 });
    store.toggleNoteNumber(7);

    send({ type: 'CELL_UPDATED', payload: { position: { row: 4, col: 4 }, value: 7, correct: true } });

    const state = useGameStore.getState();
    expect(state.grid[4][4].currentValue).toBe(7);
    expect(state.grid[4][4].solved).toBe(true);
    expect(state.notes[cellKey(4, 4)]).toBeUndefined();
    expect(state.notes[cellKey(4, 8)]).toEqual([2]);
    expect(state.notes[cellKey(8, 0)]).toEqual([7]);
  });

  it('shows a wrong move as an unsolved value, marks the error and clears the mark on selection', () => {
    startGame();
    send({ type: 'MOVE_REJECTED', payload: { position: { row: 1, col: 1 }, value: 4, correct: false } });
    const first = useGameStore.getState().lastErrorCell;
    expect(first).toEqual({ row: 1, col: 1 });
    expect(useGameStore.getState().grid[1][1]).toMatchObject({ currentValue: 4, solved: false, given: false });
    expect(useGameStore.getState().grid[0][0]).toMatchObject({ currentValue: 5, solved: true, given: true });

    send({ type: 'MOVE_REJECTED', payload: { position: { row: 1, col: 1 }, value: 5, correct: false } });
    expect(useGameStore.getState().lastErrorCell).not.toBe(first);
    expect(useGameStore.getState().grid[1][1]).toMatchObject({ currentValue: 5, solved: false });

    useGameStore.getState().selectCell({ row: 3, col: 3 });
    expect(useGameStore.getState().lastErrorCell).toBeNull();
  });

  it('shows the bot only while it is revealed and active', () => {
    startGame();
    send({ type: 'BOT_UPDATED', payload: revealedBot({ row: 6, col: 2 }, 27000, 27000) });
    let state = useGameStore.getState();
    expect(state.botPosition).toEqual({ row: 6, col: 2 });
    expect(state.botRemainingMs).toBe(27000);
    expect(state.botMaxMs).toBe(27000);

    send({ type: 'BOT_UPDATED', payload: { active: true, revealed: false, position: null, remainingTimeoutMs: 30000, maxTimeoutMs: 30000 } });
    state = useGameStore.getState();
    expect(state.botPosition).toBeNull();
    expect(state.botRemainingMs).toBeNull();

    send({ type: 'BOT_UPDATED', payload: { ...revealedBot({ row: 1, col: 1 }), active: false } });
    expect(useGameStore.getState().botPosition).toBeNull();
  });

  it('updates the clock, bot countdown and HP', () => {
    startGame();
    send({ type: 'BOT_UPDATED', payload: revealedBot({ row: 6, col: 2 }) });
    send({ type: 'TICK', payload: { elapsedMs: 1250, botRemainingMs: 28750 } });
    send({ type: 'HP_CHANGED', payload: { maxHp: 100, currentHp: 75 } });
    const state = useGameStore.getState();
    expect(state.elapsedMs).toBe(1250);
    expect(state.botRemainingMs).toBe(28750);
    expect(state.hp).toBe(75);
  });

  it('keeps the reshape alert up for its countdown and drops it on reshape', () => {
    startGame();
    send({ type: 'ALERT_WARNING', payload: { secondsRemaining: 10 } });
    expect(useGameStore.getState().isReshapeAlertActive).toBe(true);

    for (let i = 0; i < 39; i++) {
      send({ type: 'TICK', payload: { elapsedMs: i * 250, botRemainingMs: null } });
    }
    expect(useGameStore.getState().isReshapeAlertActive).toBe(true);

    const reshaped: CageDTO[] = [{ id: 0, cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }], targetSum: 7 }];
    send({ type: 'CAGE_RESHAPED', payload: { cages: reshaped, metrics: algorithmMetrics() } });
    const state = useGameStore.getState();
    expect(state.cages).toEqual(reshaped);
    expect(state.isReshapeAlertActive).toBe(false);
  });

  it('clears the alert by itself when the reshape produced no change', () => {
    startGame();
    send({ type: 'ALERT_WARNING', payload: { secondsRemaining: 10 } });
    for (let i = 0; i < 40; i++) {
      send({ type: 'TICK', payload: { elapsedMs: i * 250, botRemainingMs: null } });
    }
    expect(useGameStore.getState().isReshapeAlertActive).toBe(false);
  });

  it('finishes the game on GAME_WON and GAME_LOST and hides the bot', () => {
    startGame();
    send({ type: 'BOT_UPDATED', payload: revealedBot({ row: 6, col: 2 }) });
    send({ type: 'GAME_LOST', payload: { won: false, finalTimeMs: 42000, reason: 'HP_DEPLETED' } });
    let state = useGameStore.getState();
    expect(state.gameStatus).toBe('LOST');
    expect(state.endReason).toBe('HP_DEPLETED');
    expect(state.elapsedMs).toBe(42000);
    expect(state.botPosition).toBeNull();

    startGame();
    send({ type: 'GAME_WON', payload: { won: true, finalTimeMs: 90000, reason: 'COMPLETED' } });
    state = useGameStore.getState();
    expect(state.gameStatus).toBe('WON');
    expect(state.endReason).toBe('COMPLETED');
  });

  it('stores server errors without changing the game status', () => {
    send({ type: 'ERROR', payload: { message: 'Session already exists' } });
    const state = useGameStore.getState();
    expect(state.errorMessage).toBe('Session already exists');
    expect(state.gameStatus).toBe('IDLE');
  });

  describe('notes', () => {
    beforeEach(() => startGame());

    it('toggles and sorts numbers for the selected empty cell', () => {
      const store = useGameStore.getState();
      store.selectCell({ row: 2, col: 2 });
      store.toggleNoteNumber(5);
      store.toggleNoteNumber(2);
      store.toggleNoteNumber(9);
      expect(useGameStore.getState().notes[cellKey(2, 2)]).toEqual([2, 5, 9]);

      store.toggleNoteNumber(5);
      expect(useGameStore.getState().notes[cellKey(2, 2)]).toEqual([2, 9]);

      store.toggleNoteNumber(2);
      store.toggleNoteNumber(9);
      expect(useGameStore.getState().notes).toEqual({});
    });

    it('ignores invalid targets and values', () => {
      const store = useGameStore.getState();
      store.toggleNoteNumber(4);
      store.selectCell({ row: 0, col: 0 });
      store.toggleNoteNumber(4);
      store.selectCell({ row: 2, col: 2 });
      store.toggleNoteNumber(0);
      store.toggleNoteNumber(10);
      store.toggleNoteNumber(2.5);
      expect(useGameStore.getState().notes).toEqual({});

      send({ type: 'CELL_UPDATED', payload: { position: { row: 2, col: 2 }, value: 4, correct: true } });
      useGameStore.getState().toggleNoteNumber(6);
      expect(useGameStore.getState().notes).toEqual({});
    });

    it('does not edit notes after the game ended', () => {
      useGameStore.getState().selectCell({ row: 2, col: 2 });
      send({ type: 'GAME_LOST', payload: { won: false, finalTimeMs: 1, reason: 'HP_DEPLETED' } });
      useGameStore.getState().toggleNoteNumber(3);
      expect(useGameStore.getState().notes).toEqual({});
    });

    it('clears all notes of the selected cell only', () => {
      const store = useGameStore.getState();
      store.selectCell({ row: 2, col: 2 });
      store.toggleNoteNumber(1);
      store.toggleNoteNumber(2);
      store.selectCell({ row: 3, col: 3 });
      store.toggleNoteNumber(4);

      store.selectCell({ row: 2, col: 2 });
      store.clearNotes();
      expect(useGameStore.getState().notes).toEqual({ [cellKey(3, 3)]: [4] });

      store.clearNotes();
      store.selectCell(null);
      store.clearNotes();
      expect(useGameStore.getState().notes).toEqual({ [cellKey(3, 3)]: [4] });
    });

    it('toggles notes mode', () => {
      useGameStore.getState().toggleNotesMode();
      expect(useGameStore.getState().notesMode).toBe(true);
      useGameStore.getState().toggleNotesMode();
      expect(useGameStore.getState().notesMode).toBe(false);
    });
  });

  it('resetGame returns to the initial state', () => {
    startGame();
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().resetGame();
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('IDLE');
    expect(state.grid).toEqual([]);
    expect(state.selectedCell).toBeNull();
    expect(state.sessionId).toBeNull();
  });
});

describe('useGameStore algorithm evidence', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('starts with no metrics and no strategy', () => {
    const state = useGameStore.getState();
    expect(state.solverStrategy).toBeNull();
    expect(state.latestMetrics).toBeNull();
    expect(state.metricsHistory).toEqual([]);
  });

  it('takes the strategy and generation metrics from GAME_STARTED', () => {
    const metrics = algorithmMetrics({ operationType: 'PUZZLE_GEN', strategyUsed: 'NAIVE_ORACLE' });
    send({ type: 'GAME_STARTED', payload: boardState(), metrics });

    const state = useGameStore.getState();
    expect(state.solverStrategy).toBe('NAIVE_ORACLE');
    expect(state.latestMetrics).toEqual(metrics);
    expect(state.metricsHistory).toEqual([metrics]);
  });

  it('keeps the requested strategy when the start event carries no metrics', () => {
    useGameStore.setState({ solverStrategy: 'NAIVE_ORACLE' });
    startGame();
    expect(useGameStore.getState().solverStrategy).toBe('NAIVE_ORACLE');
    expect(useGameStore.getState().latestMetrics).toBeNull();
  });

  it('appends reshape metrics from the payload when the envelope has none', () => {
    const generation = algorithmMetrics({ operationType: 'PUZZLE_GEN' });
    const reshape = algorithmMetrics({ operationType: 'CAGE_RESHAPE', nodesVisited: 999 });
    send({ type: 'GAME_STARTED', payload: boardState(), metrics: generation });
    send({ type: 'CAGE_RESHAPED', payload: { cages: [], metrics: reshape } });

    const state = useGameStore.getState();
    expect(state.latestMetrics).toEqual(reshape);
    expect(state.metricsHistory).toEqual([generation, reshape]);
    expect(state.cages).toEqual([]);
  });

  it('prefers the envelope metrics and ignores events without any', () => {
    const generation = algorithmMetrics({ operationType: 'PUZZLE_GEN' });
    const envelope = algorithmMetrics({ operationType: 'CAGE_RESHAPE', nodesVisited: 1 });
    const payloadCopy = algorithmMetrics({ operationType: 'CAGE_RESHAPE', nodesVisited: 2 });
    send({ type: 'GAME_STARTED', payload: boardState(), metrics: generation });
    send({ type: 'CAGE_RESHAPED', payload: { cages: [], metrics: payloadCopy }, metrics: envelope });
    send({ type: 'TICK', payload: { elapsedMs: 250, botRemainingMs: null }, metrics: null });

    const state = useGameStore.getState();
    expect(state.latestMetrics).toEqual(envelope);
    expect(state.metricsHistory).toHaveLength(2);
  });

  it('caps the history and starts a new one for every game', () => {
    send({ type: 'GAME_STARTED', payload: boardState(), metrics: algorithmMetrics() });
    for (let i = 0; i < MAX_METRICS_HISTORY + 10; i += 1) {
      send({ type: 'CAGE_RESHAPED', payload: { cages: [], metrics: algorithmMetrics({ nodesVisited: i }) } });
    }
    const history = useGameStore.getState().metricsHistory;
    expect(history).toHaveLength(MAX_METRICS_HISTORY);
    expect(history[history.length - 1].nodesVisited).toBe(MAX_METRICS_HISTORY + 9);

    send({ type: 'GAME_STARTED', payload: boardState(), metrics: algorithmMetrics({ nodesVisited: 7 }) });
    expect(useGameStore.getState().metricsHistory).toHaveLength(1);

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().latestMetrics).toBeNull();
    expect(useGameStore.getState().metricsHistory).toEqual([]);
    expect(useGameStore.getState().solverStrategy).toBeNull();
  });
});

describe('useGameStore wrong answers and reshape countdown', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('turns a corrected cell back into a solved one', () => {
    startGame();
    send({ type: 'MOVE_REJECTED', payload: { position: { row: 2, col: 2 }, value: 9, correct: false } });
    expect(useGameStore.getState().grid[2][2].solved).toBe(false);

    send({ type: 'CELL_UPDATED', payload: { position: { row: 2, col: 2 }, value: 3, correct: true } });

    expect(useGameStore.getState().grid[2][2]).toMatchObject({ currentValue: 3, solved: true });
    expect(useGameStore.getState().lastErrorCell).toBeNull();
  });

  it('keeps the grid when a rejection carries no usable value', () => {
    startGame();
    const before = useGameStore.getState().grid;
    send({ type: 'MOVE_REJECTED', payload: { position: { row: 1, col: 1 }, value: 0, correct: false } });
    expect(useGameStore.getState().grid).toBe(before);
    expect(useGameStore.getState().lastErrorCell).toEqual({ row: 1, col: 1 });
  });

  it('tracks the lives of a classic game through HP_CHANGED', () => {
    startGame({ mode: 'CLASSIC', playerHealth: { maxHp: 3, currentHp: 3 }, bot: null });
    expect(useGameStore.getState().maxHp).toBe(3);
    send({ type: 'HP_CHANGED', payload: { maxHp: 3, currentHp: 2 } });
    expect(useGameStore.getState().hp).toBe(2);
  });

  it('reads the reshape countdown from every tick and forgets it on reset', () => {
    startGame();
    expect(useGameStore.getState().reshapeRemainingMs).toBeNull();
    send({ type: 'TICK', payload: { elapsedMs: 250, botRemainingMs: 100_000, reshapeRemainingMs: 299_750 } });
    expect(useGameStore.getState().reshapeRemainingMs).toBe(299_750);
    send({ type: 'TICK', payload: { elapsedMs: 500, botRemainingMs: 99_750 } });
    expect(useGameStore.getState().reshapeRemainingMs).toBeNull();
    send({ type: 'TICK', payload: { elapsedMs: 750, botRemainingMs: null, reshapeRemainingMs: 10_000 } });
    useGameStore.getState().resetGame();
    expect(useGameStore.getState().reshapeRemainingMs).toBeNull();
  });
});
