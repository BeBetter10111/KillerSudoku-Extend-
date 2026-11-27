// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDailySeed, fetchLeaderboard } from '../../services/apiClient';
import type { LeaderboardEntry } from '../../types/game';
import { Dashboard, modifierBadges } from './Dashboard';

vi.mock('../../services/apiClient', () => ({
  fetchDailySeed: vi.fn(),
  fetchLeaderboard: vi.fn(),
  runAlgorithmBenchmark: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const entries: LeaderboardEntry[] = [
  { playerName: 'Frog', finalTimeMs: 90_250, mode: 'CLASSIC', difficulty: 'MEDIUM', date: '2026-11-15', completedAt: '2026-11-15T10:00:00Z' },
  { playerName: 'Toad', finalTimeMs: 125_000, mode: 'CLASSIC', difficulty: 'MEDIUM', date: '2026-11-15', completedAt: '2026-11-15T10:05:00Z' },
];

const radio = (name: RegExp | string) => screen.getByRole('radio', { name });

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(fetchDailySeed).mockResolvedValue({ date: '2026-11-15', seed: 'daily-2026-11-15' });
  vi.mocked(fetchLeaderboard).mockResolvedValue(entries);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('modifierBadges', () => {
  it('describes the modifiers of every mode and difficulty', () => {
    expect(modifierBadges('CLASSIC', 'HARD').map((b) => b.label)).toEqual([
      'No modifiers',
      'Empty board: no given numbers',
    ]);
    expect(modifierBadges('BOT_CHALLENGE', 'EASY').map((b) => b.label)).toEqual([
      'Bot HP pressure: -15 HP',
      'First bot timer 2 min',
      'Then bot timer 45s',
    ]);
    expect(modifierBadges('BOT_CHALLENGE', 'MEDIUM')[0].label).toBe('Bot HP pressure: Random (10 - 25) HP');
    expect(modifierBadges('BOT_CHALLENGE', 'HARD').map((b) => b.label)).toEqual([
      'Bot HP pressure: Random (5 - 30) HP',
      'First bot timer 3 min',
      'Then bot timer 60s',
      'Empty board: no given numbers',
      'Cage Reshape every 5 min',
    ]);
  });
});

describe('Dashboard', () => {
  it('starts a classic game with the chosen difficulty and no seed', () => {
    const onStart = vi.fn();
    render(<Dashboard onStart={onStart} isStarting={false} errorMessage={null} />);

    fireEvent.click(radio(/Hard/));
    fireEvent.click(screen.getByRole('button', { name: /Start game/ }));

    expect(onStart).toHaveBeenCalledWith({ mode: 'CLASSIC', difficulty: 'HARD', solverStrategy: 'OPTIMIZED_MRV_PRUNING' });
  });

  it('shows the modifier badges that match the selected mode', () => {
    render(<Dashboard onStart={vi.fn()} isStarting={false} errorMessage={null} />);
    expect(within(screen.getByTestId('badges-HARD')).getByText('No modifiers')).toBeTruthy();

    fireEvent.click(radio(/Bot Challenge/));
    expect(within(screen.getByTestId('badges-EASY')).getByText('Bot HP pressure: -15 HP')).toBeTruthy();
    expect(within(screen.getByTestId('badges-EASY')).queryByText(/Cage Reshape/)).toBeNull();
    expect(within(screen.getByTestId('badges-MEDIUM')).queryByText(/Cage Reshape/)).toBeNull();
    expect(within(screen.getByTestId('badges-HARD')).getByText('Cage Reshape every 5 min')).toBeTruthy();
  });

  it('starts the daily seed challenge with the server seed and a trimmed name', async () => {
    const onStart = vi.fn();
    render(<Dashboard onStart={onStart} isStarting={false} errorMessage={null} />);
    await waitFor(() => expect(screen.getByTestId('daily-seed').textContent).toBe('daily-2026-11-15'));

    fireEvent.click(radio(/Bot Challenge/));
    fireEvent.click(radio(/Medium/));
    fireEvent.click(screen.getByRole('switch', { name: 'Daily Seed Challenge' }));
    fireEvent.change(screen.getByLabelText(/Name on the leaderboard/), { target: { value: '  Mr Frog ' } });
    fireEvent.click(screen.getByRole('button', { name: /Start Daily Challenge/ }));

    expect(onStart).toHaveBeenCalledWith({
      mode: 'BOT_CHALLENGE',
      difficulty: 'MEDIUM',
      solverStrategy: 'OPTIMIZED_MRV_PRUNING',
      seed: 'daily-2026-11-15',
      playerName: 'Mr Frog',
    });
    expect(window.localStorage.getItem('killer-sudoku:player-name')).toBe('Mr Frog');
  });

  it('blocks the daily challenge when the seed cannot be loaded but still allows normal play', async () => {
    vi.mocked(fetchDailySeed).mockRejectedValue(new Error('offline'));
    const onStart = vi.fn();
    render(<Dashboard onStart={onStart} isStarting={false} errorMessage={null} />);
    await waitFor(() => expect(screen.getByTestId('daily-seed').textContent).toBe('Daily seed unavailable'));

    fireEvent.click(screen.getByRole('switch', { name: 'Daily Seed Challenge' }));
    const start = screen.getByRole('button', { name: /Start Daily Challenge/ }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);

    fireEvent.click(screen.getByRole('switch', { name: 'Daily Seed Challenge' }));
    fireEvent.click(screen.getByRole('button', { name: /Start game/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('disables starting while a game is starting and shows errors', () => {
    render(<Dashboard onStart={vi.fn()} isStarting errorMessage="Cannot reach the game server" />);
    expect((screen.getByRole('button', { name: /Starting/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Cannot reach the game server')).toBeTruthy();
  });

  it('remembers the player name between visits', () => {
    window.localStorage.setItem('killer-sudoku:player-name', 'Frog');
    render(<Dashboard onStart={vi.fn()} isStarting={false} errorMessage={null} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Daily Seed Challenge' }));
    expect((screen.getByLabelText(/Name on the leaderboard/) as HTMLInputElement).value).toBe('Frog');
  });
});

describe('Leaderboard', () => {
  it('lists verified runs for the selected mode and difficulty and refetches on change', async () => {
    render(<Dashboard onStart={vi.fn()} isStarting={false} errorMessage={null} />);

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText('Frog')).toBeTruthy();
    expect(within(rows[1]).getByText('01:30.2')).toBeTruthy();
    expect(within(rows[2]).getByText('02:05.0')).toBeTruthy();
    expect(fetchLeaderboard).toHaveBeenLastCalledWith(
      { mode: 'CLASSIC', difficulty: 'MEDIUM', limit: 10 },
      expect.any(AbortSignal),
    );

    fireEvent.click(radio(/Bot Challenge/));
    fireEvent.click(radio(/Hard/));
    await waitFor(() =>
      expect(fetchLeaderboard).toHaveBeenLastCalledWith(
        { mode: 'BOT_CHALLENGE', difficulty: 'HARD', limit: 10 },
        expect.any(AbortSignal),
      ),
    );
  });

  it('shows an empty state and an error state with retry', async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValueOnce([]);
    render(<Dashboard onStart={vi.fn()} isStarting={false} errorMessage={null} />);
    expect(await screen.findByText(/No verified runs yet today/)).toBeTruthy();

    vi.mocked(fetchLeaderboard).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh leaderboard' }));
    expect(await screen.findByText(/Could not load the leaderboard/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh leaderboard' }));
    expect(await screen.findByRole('table')).toBeTruthy();
  });

  it('lets the player choose the solver engine and sends it with the start request', () => {
    const onStart = vi.fn();
    render(<Dashboard onStart={onStart} isStarting={false} errorMessage={null} />);
    expect(radio(/Optimized \(MRV/).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(radio(/Naive Oracle/));
    expect(radio(/Naive Oracle/).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Start game/ }));

    expect(onStart).toHaveBeenCalledWith({ mode: 'CLASSIC', difficulty: 'MEDIUM', solverStrategy: 'NAIVE_ORACLE' });
  });

  it('forces the optimized engine for the daily challenge and says why', async () => {
    const onStart = vi.fn();
    render(<Dashboard onStart={onStart} isStarting={false} errorMessage={null} />);
    await waitFor(() => expect(screen.getByTestId('daily-seed').textContent).toBe('daily-2026-11-15'));

    fireEvent.click(radio(/Naive Oracle/));
    fireEvent.click(screen.getByRole('switch', { name: 'Daily Seed Challenge' }));

    expect(screen.getByTestId('solver-locked').textContent).toMatch(/Optimized engine/);
    expect(radio(/Naive Oracle/).hasAttribute('disabled')).toBe(true);
    expect(radio(/Optimized \(MRV/).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Start Daily Challenge/ }));
    expect(onStart.mock.calls[0][0].solverStrategy).toBe('OPTIMIZED_MRV_PRUNING');

    fireEvent.click(screen.getByRole('switch', { name: 'Daily Seed Challenge' }));
    expect(radio(/Naive Oracle/).getAttribute('aria-checked')).toBe('true');
  });

  it('switches between the Play and Benchmark Lab tabs without losing the setup', () => {
    render(<Dashboard onStart={vi.fn()} isStarting={false} errorMessage={null} />);
    const play = screen.getByRole('tab', { name: 'Play' });
    const lab = screen.getByRole('tab', { name: 'Benchmark Lab' });
    expect(play.getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('region', { name: 'Algorithm Benchmark Lab' })).toBeNull();

    fireEvent.click(radio(/Bot Challenge/));
    fireEvent.click(lab);

    expect(lab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('region', { name: 'Algorithm Benchmark Lab' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Start game/ })).toBeNull();

    fireEvent.click(play);
    expect(screen.getByRole('button', { name: /Start game/ })).toBeTruthy();
    expect(radio(/Bot Challenge/).getAttribute('aria-checked')).toBe('true');
  });
});
