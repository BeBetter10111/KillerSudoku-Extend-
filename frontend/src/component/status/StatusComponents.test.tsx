// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/useGameStore';
import { emit, revealedBot, startGame } from '../../test/fixtures';
import { BotTimer } from './BotTimer';
import { HealthBar } from './HealthBar';
import { ReshapeTimer } from './ReshapeTimer';

beforeEach(() => {
  useGameStore.getState().resetGame();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HealthBar', () => {
  it('renders nothing without health (classic mode)', () => {
    startGame({ mode: 'CLASSIC', playerHealth: null, bot: null });
    const { container } = render(<HealthBar />);
    expect(container.innerHTML).toBe('');
  });

  it('shows hp, width and an purple -> yellow -> crimson color shift', () => {
    startGame();
    render(<HealthBar />);
    const bar = screen.getByRole('progressbar', { name: 'Player health' });
    const fill = bar.firstElementChild as HTMLElement;

    expect(screen.getByText('100 / 100')).toBeTruthy();
    expect(fill.style.width).toBe('100%');
    expect(fill.className).toContain('bg-cage');

    emit({ type: 'HP_CHANGED', payload: { maxHp: 100, currentHp: 50 } });
    expect(fill.style.width).toBe('50%');
    expect(fill.className).toContain('bg-doodle-yellow');
    expect(bar.getAttribute('aria-valuenow')).toBe('50');

    emit({ type: 'HP_CHANGED', payload: { maxHp: 100, currentHp: 20 } });
    expect(fill.className).toContain('bg-crimson');
    expect(fill.className).toContain('transition-[width,background-color]');
  });

  it('shakes and flashes when hp drops, then settles', () => {
    vi.useFakeTimers();
    startGame();
    render(<HealthBar />);
    const root = screen.getByTestId('health-bar');
    expect(root.className).not.toContain('animate-shake');

    emit({ type: 'HP_CHANGED', payload: { maxHp: 100, currentHp: 75 } });
    expect(root.className).toContain('animate-shake');
    expect(screen.getByTestId('health-flash')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(root.className).not.toContain('animate-shake');
    expect(screen.queryByTestId('health-flash')).toBeNull();
  });

  it('does not shake when hp is restored or a new game resets it', () => {
    startGame();
    render(<HealthBar />);
    emit({ type: 'HP_CHANGED', payload: { maxHp: 100, currentHp: 40 } });
    emit({ type: 'HP_CHANGED', payload: { maxHp: 100, currentHp: 90 } });
    expect(screen.getByTestId('health-bar').className).not.toContain('animate-shake');
  });
});

describe('BotTimer', () => {
  it('is hidden while the bot is hidden', () => {
    startGame();
    const { container } = render(<BotTimer />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the revealed bot countdown and counts down locally between ticks', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
    startGame();
    render(<BotTimer />);
    emit({ type: 'BOT_UPDATED', payload: revealedBot({ row: 4, col: 4 }, 20000, 30000) });

    expect(screen.getByText('20.0s')).toBeTruthy();
    const fill = screen.getByRole('progressbar', { name: 'Bot countdown' }).firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('66.66666666666666%');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('19.0s')).toBeTruthy();

    emit({ type: 'TICK', payload: { elapsedMs: 1250, botRemainingMs: 18750 } });
    expect(screen.getByText('18.8s')).toBeTruthy();

    emit({ type: 'BOT_UPDATED', payload: { active: true, revealed: false, position: null, remainingTimeoutMs: 30000, maxTimeoutMs: 30000 } });
    expect(screen.queryByTestId('bot-timer')).toBeNull();
  });
});

describe('HealthBar lives (classic mode)', () => {
  const classic = () => startGame({ mode: 'CLASSIC', playerHealth: { maxHp: 3, currentHp: 3 }, bot: null });

  it('shows three hearts and removes one per lost life', () => {
    classic();
    render(<HealthBar />);
    const root = screen.getByTestId('health-bar');
    expect(root.getAttribute('data-variant')).toBe('lives');
    expect(screen.getByText('Lives')).toBeTruthy();
    expect(screen.getByText('3 / 3')).toBeTruthy();
    expect(screen.getAllByTestId('life-full')).toHaveLength(3);
    expect(screen.queryAllByTestId('life-lost')).toHaveLength(0);
    expect(screen.getByRole('progressbar', { name: 'Lives remaining' }).getAttribute('aria-valuenow')).toBe('3');

    emit({ type: 'HP_CHANGED', payload: { maxHp: 3, currentHp: 2 } });
    expect(screen.getAllByTestId('life-full')).toHaveLength(2);
    expect(screen.getAllByTestId('life-lost')).toHaveLength(1);
    expect(screen.getByText('2 / 3')).toBeTruthy();

    emit({ type: 'HP_CHANGED', payload: { maxHp: 3, currentHp: 0 } });
    expect(screen.queryAllByTestId('life-full')).toHaveLength(0);
    expect(screen.getAllByTestId('life-lost')).toHaveLength(3);
  });

  it('flashes and shakes when a life is lost, and keeps the HP bar for bot mode', () => {
    vi.useFakeTimers();
    classic();
    render(<HealthBar />);
    expect(screen.getByTestId('health-bar').className).not.toContain('animate-shake');
    emit({ type: 'HP_CHANGED', payload: { maxHp: 3, currentHp: 2 } });
    expect(screen.getByTestId('health-bar').className).toContain('animate-shake');
    expect(screen.getByTestId('health-flash')).toBeTruthy();
    cleanup();

    useGameStore.getState().resetGame();
    startGame();
    render(<HealthBar />);
    expect(screen.getByTestId('health-bar').getAttribute('data-variant')).toBe('hp');
    expect(screen.queryByTestId('life-full')).toBeNull();
  });
});

describe('ReshapeTimer', () => {
  const tick = (reshapeRemainingMs: number | null) =>
    emit({ type: 'TICK', payload: { elapsedMs: 1000, botRemainingMs: null, reshapeRemainingMs } });

  it('is hidden until the server reports a countdown', () => {
    startGame();
    const { container } = render(<ReshapeTimer />);
    expect(container.innerHTML).toBe('');
    tick(null);
    expect(container.innerHTML).toBe('');
  });

  it('counts down in minutes and seconds without any warning styling', () => {
    startGame();
    render(<ReshapeTimer />);
    tick(272_000);
    expect(screen.getByTestId('reshape-timer-value').textContent).toBe('4:32');
    expect(screen.getByTestId('reshape-timer').className).not.toContain('amber');

    tick(8_000);
    expect(screen.getByTestId('reshape-timer').className).not.toContain('rose');
    expect(screen.getByTestId('reshape-timer').className).not.toContain('animate-pulse');
  });

  it('disappears when the game is over', () => {
    startGame();
    render(<ReshapeTimer />);
    tick(120_000);
    expect(screen.getByTestId('reshape-timer')).toBeTruthy();
    emit({ type: 'GAME_LOST', payload: { won: false, finalTimeMs: 5000, reason: 'HP_DEPLETED' } });
    expect(screen.queryByTestId('reshape-timer')).toBeNull();
  });
});
