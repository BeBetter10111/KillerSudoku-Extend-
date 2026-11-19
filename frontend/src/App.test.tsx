// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { connectAndStartGame, leaveGame } from './services/socketClient';
import { useGameStore } from './store/useGameStore';
import { algorithmMetrics, boardState, emit, revealedBot, startGame } from './test/fixtures';

vi.mock('./services/socketClient', () => ({
  connectAndStartGame: vi.fn(() => Promise.resolve('session-1')),
  leaveGame: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(() => Promise.resolve()),
  submitCell: vi.fn(() => true),
}));

vi.mock('./services/apiClient', () => ({
  fetchDailySeed: vi.fn(() => Promise.resolve({ date: '2026-11-15', seed: 'daily-2026-11-15' })),
  fetchLeaderboard: vi.fn(() => Promise.resolve([])),
}));

beforeEach(() => {
  useGameStore.getState().resetGame();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

const clickStart = (name: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

describe('App', () => {
  it('shows the dashboard while idle and starts a game through the socket client', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Killer Sudoku' })).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /Bot Challenge/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Easy/ }));
    await act(async () => {
      clickStart(/Start game/);
    });

    expect(connectAndStartGame).toHaveBeenCalledWith('BOT_CHALLENGE', 'EASY', 'OPTIMIZED_MRV_PRUNING', undefined, undefined);
    expect(screen.getByRole('button', { name: /Starting/ })).toBeTruthy();
  });

  it('switches to the arena with HUD, clock and board once the server confirms the game', () => {
    render(<App />);
    startGame();

    expect(screen.queryByRole('heading', { name: 'Killer Sudoku' })).toBeNull();
    expect(screen.getByTestId('health-bar')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Killer Sudoku board' })).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('0:00');
    expect(screen.getByText('Bot Challenge')).toBeTruthy();

    emit({ type: 'TICK', payload: { elapsedMs: 65_250, botRemainingMs: null } });
    expect(screen.getByRole('timer').textContent).toBe('1:05');

    emit({ type: 'BOT_UPDATED', payload: revealedBot({ row: 3, col: 3 }) });
    expect(screen.getByTestId('bot-timer')).toBeTruthy();

    emit({ type: 'ALERT_WARNING', payload: { secondsRemaining: 10 } });
    expect(screen.getByRole('alert').textContent).toContain('reshaping in 10 seconds');
  });

  it('hides survival HUD in classic mode', () => {
    render(<App />);
    startGame({ mode: 'CLASSIC', playerHealth: null, bot: null });
    expect(screen.queryByTestId('health-bar')).toBeNull();
    expect(screen.queryByTestId('bot-timer')).toBeNull();
    expect(screen.getByText('Classic')).toBeTruthy();
  });

  it('shows a win summary and lets the player replay with the same setup', async () => {
    render(<App />);
    await act(async () => {
      clickStart(/Start game/);
    });
    startGame({ mode: 'CLASSIC', playerHealth: null, bot: null });
    emit({ type: 'GAME_WON', payload: { won: true, finalTimeMs: 95_500, reason: 'COMPLETED' } });

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Puzzle solved!');
    expect(dialog.textContent).toContain('01:35.5');

    vi.mocked(connectAndStartGame).mockClear();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
    });
    expect(connectAndStartGame).toHaveBeenCalledWith('CLASSIC', 'MEDIUM', 'OPTIMIZED_MRV_PRUNING', undefined, undefined);
    expect(screen.getByRole('status').textContent).toContain('Starting a new game');
  });

  it('explains why the game was lost and returns to the dashboard', async () => {
    render(<App />);
    startGame();
    emit({ type: 'GAME_LOST', payload: { won: false, finalTimeMs: 42_000, reason: 'HP_DEPLETED' } });

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Game over');
    expect(dialog.textContent).toContain('The bot drained all of your HP.');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back to Dashboard' }));
    });
    expect(leaveGame).toHaveBeenCalled();
    expect(useGameStore.getState().gameStatus).toBe('IDLE');
    expect(screen.getByRole('heading', { name: 'Killer Sudoku' })).toBeTruthy();
  });

  it('asks for confirmation before quitting a running game', async () => {
    render(<App />);
    startGame();
    const confirm = vi.spyOn(window, 'confirm');

    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /Quit/ }));
    expect(leaveGame).not.toHaveBeenCalled();
    expect(useGameStore.getState().gameStatus).toBe('PLAYING');

    confirm.mockReturnValueOnce(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Quit/ }));
    });
    await waitFor(() => expect(useGameStore.getState().gameStatus).toBe('IDLE'));
    expect(leaveGame).toHaveBeenCalledTimes(1);
  });

  it('shows connection problems inside the arena with a way out', () => {
    render(<App />);
    startGame();
    act(() => {
      useGameStore.setState({ errorMessage: 'Connection to the game server was lost' });
    });
    expect(screen.getByText('Connection to the game server was lost')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Back to Dashboard' })).toHaveLength(1);
  });

  it('surfaces start failures on the dashboard', async () => {
    vi.mocked(connectAndStartGame).mockRejectedValueOnce(new Error('Cannot reach the game server'));
    render(<App />);
    await act(async () => {
      clickStart(/Start game/);
    });
    expect(await screen.findByText('Cannot reach the game server')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Start game/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('gives up with a message when the server never confirms the game', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<App />);
    await act(async () => {
      clickStart(/Start game/);
    });
    expect(screen.getByRole('button', { name: /Starting/ })).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(10_500);
    });
    expect(screen.getByText(/did not respond/)).toBeTruthy();
    expect(leaveGame).toHaveBeenCalled();
  });

  it('shows the algorithm evidence sidebar next to the board and keeps it live', () => {
    render(<App />);
    emit({
      type: 'GAME_STARTED',
      payload: boardState(),
      metrics: algorithmMetrics({ operationType: 'PUZZLE_GEN', strategyUsed: 'OPTIMIZED_MRV_PRUNING' }),
    });

    const panel = screen.getByTestId('algorithm-evidence');
    expect(panel.closest('aside')).not.toBeNull();
    expect(screen.getByTestId('strategy-badge').textContent).toBe('OPTIMIZED_MRV_PRUNING');
    expect(screen.getByTestId('oracle-badge').textContent).toBe('Oracle Verified (100% Match)');

    emit({
      type: 'CAGE_RESHAPED',
      payload: { cages: [], metrics: algorithmMetrics({ operationType: 'CAGE_RESHAPE', nodesVisited: 4242 }) },
    });
    expect(screen.getByTestId('operation-badge').textContent).toBe('CAGE_RESHAPE');
    expect(screen.getByTestId('metric-nodes').textContent).toBe('4,242');
  });

  it('starts the game with the solver engine picked on the dashboard and shows it in the arena', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: /Naive Oracle/ }));
    await act(async () => {
      clickStart(/Start game/);
    });
    expect(connectAndStartGame).toHaveBeenCalledWith('CLASSIC', 'MEDIUM', 'NAIVE_ORACLE', undefined, undefined);

    emit({
      type: 'GAME_STARTED',
      payload: boardState(),
      metrics: algorithmMetrics({ operationType: 'PUZZLE_GEN', strategyUsed: 'NAIVE_ORACLE' }),
    });
    expect(screen.getByTestId('engine-chip').textContent).toBe('Naive Oracle');
  });
});
