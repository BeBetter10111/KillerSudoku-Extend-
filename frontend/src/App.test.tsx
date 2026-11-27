// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { discardActiveGame, fetchMe } from './services/apiClient';
import { connectAndResumeGame, connectAndStartGame, leaveGame, saveAndExit } from './services/socketClient';
import { useAuthStore } from './store/useAuthStore';
import { useGameStore } from './store/useGameStore';
import { algorithmMetrics, boardState, emit, revealedBot, startGame } from './test/fixtures';

vi.mock('./services/socketClient', () => ({
  connectAndStartGame: vi.fn(() => Promise.resolve('session-1')),
  connectAndResumeGame: vi.fn(() => Promise.resolve('session-2')),
  saveAndExit: vi.fn(() => Promise.resolve()),
  leaveGame: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(() => Promise.resolve()),
  submitCell: vi.fn(() => true),
}));

vi.mock('./services/apiClient', () => ({
  fetchDailySeed: vi.fn(() => Promise.resolve({ date: '2026-11-15', seed: 'daily-2026-11-15' })),
  fetchLeaderboard: vi.fn(() => Promise.resolve([])),
  fetchMe: vi.fn(),
  discardActiveGame: vi.fn(() => Promise.resolve()),
  logOut: vi.fn(() => Promise.resolve()),
  signUp: vi.fn(),
  logIn: vi.fn(),
  ApiError: class ApiError extends Error {
    status = 0;
  },
}));

const unlocked = {
  CLASSIC: { EASY: 3, MEDIUM: 5, HARD: 0 },
  BOT_CHALLENGE: { EASY: 3, MEDIUM: 5, HARD: 0 },
};

beforeEach(() => {
  useGameStore.getState().resetGame();
  useAuthStore.setState({ token: 'tok', username: 'frog' });
  vi.mocked(fetchMe).mockResolvedValue({ username: 'frog', progress: unlocked, activeGame: null });
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
    fireEvent.click(screen.getByRole('radio', { name: /^Easy/ }));
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
    expect(screen.queryByRole('alert')).toBeNull();
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
    expect(connectAndStartGame).toHaveBeenCalledWith('CLASSIC', 'EASY', 'OPTIMIZED_MRV_PRUNING', undefined, undefined);
    expect(screen.getByRole('status').textContent).toContain('Starting a new game');
  });

  it('explains why the game was lost and returns to the dashboard', async () => {
    render(<App />);
    startGame();
    emit({ type: 'GAME_LOST', payload: { won: false, finalTimeMs: 42_000, reason: 'HP_DEPLETED' } });

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Game over');
    expect(dialog.textContent).toContain('You ran out of HP.');

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
    fireEvent.click(screen.getByRole('button', { name: /Save & Exit/ }));
    expect(saveAndExit).not.toHaveBeenCalled();
    expect(useGameStore.getState().gameStatus).toBe('PLAYING');

    confirm.mockReturnValueOnce(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save & Exit/ }));
    });
    await waitFor(() => expect(useGameStore.getState().gameStatus).toBe('IDLE'));
    expect(saveAndExit).toHaveBeenCalledTimes(1);
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
    expect(connectAndStartGame).toHaveBeenCalledWith('CLASSIC', 'EASY', 'NAIVE_ORACLE', undefined, undefined);

    emit({
      type: 'GAME_STARTED',
      payload: boardState(),
      metrics: algorithmMetrics({ operationType: 'PUZZLE_GEN', strategyUsed: 'NAIVE_ORACLE' }),
    });
    expect(screen.getByTestId('engine-chip').textContent).toBe('Naive Oracle');
  });

  it('shows three lives in a classic game and the HP bar plus the reshape countdown in a hard bot game', () => {
    render(<App />);
    emit({ type: 'GAME_STARTED', payload: boardState({ mode: 'CLASSIC', playerHealth: { maxHp: 3, currentHp: 3 }, bot: null }) });
    expect(screen.getByTestId('health-bar').getAttribute('data-variant')).toBe('lives');
    expect(screen.getAllByTestId('life-full')).toHaveLength(3);
    expect(screen.queryByTestId('reshape-timer')).toBeNull();

    emit({
      type: 'GAME_STARTED',
      payload: boardState({ mode: 'BOT_CHALLENGE', difficulty: 'HARD', bot: revealedBot({ row: 4, col: 4 }, 120_000, 120_000) }),
    });
    expect(screen.getByTestId('health-bar').getAttribute('data-variant')).toBe('hp');
    emit({ type: 'TICK', payload: { elapsedMs: 250, botRemainingMs: 119_750, reshapeRemainingMs: 299_750 } });
    expect(screen.getByTestId('reshape-timer-value').textContent).toBe('5:00');
  });

  it('shows the login page when signed out', () => {
    useAuthStore.setState({ token: null, username: null });
    render(<App />);
    expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Start game/ })).toBeNull();
  });

  it('offers to continue a saved game or start a new one', async () => {
    vi.mocked(fetchMe).mockResolvedValue({
      username: 'frog',
      progress: unlocked,
      activeGame: { mode: 'CLASSIC', difficulty: 'MEDIUM', elapsedMs: 83_000, solverStrategy: 'NAIVE_ORACLE' },
    });
    render(<App />);
    expect((await screen.findByTestId('active-game-summary')).textContent).toContain('Classic / Medium');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Continue playing/ }));
    });
    expect(connectAndResumeGame).toHaveBeenCalledWith('NAIVE_ORACLE');

    cleanup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    await screen.findByTestId('active-game-summary');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Start new game/ }));
    });
    expect(discardActiveGame).toHaveBeenCalledWith('tok');
    await waitFor(() => expect(screen.queryByTestId('active-game-summary')).toBeNull());
  });
});
