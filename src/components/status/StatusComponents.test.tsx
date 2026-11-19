// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/useGameStore';
import { algorithmMetrics, emit, revealedBot, startGame } from '../../test/fixtures';
import { AlertBanner } from './AlertBanner';
import { BotTimer } from './BotTimer';
import { HealthBar } from './HealthBar';

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

  it('shows hp, width and an emerald -> amber -> rose color shift', () => {
    startGame();
    render(<HealthBar />);
    const bar = screen.getByRole('progressbar', { name: 'Player health' });
    const fill = bar.firstElementChild as HTMLElement;

    expect(screen.getByText('100 / 100')).toBeTruthy();
    expect(fill.style.width).toBe('100%');
    expect(fill.className).toContain('bg-emerald-500');

    emit({ type: 'HP_CHANGED', payload: { maxHp: 100, currentHp: 50 } });
    expect(fill.style.width).toBe('50%');
    expect(fill.className).toContain('bg-amber-500');
    expect(bar.getAttribute('aria-valuenow')).toBe('50');

    emit({ type: 'HP_CHANGED', payload: { maxHp: 100, currentHp: 20 } });
    expect(fill.className).toContain('bg-rose-500');
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

describe('AlertBanner', () => {
  it('is hidden until the reshape alert starts', () => {
    startGame();
    const { container } = render(<AlertBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('warns with the remaining seconds and updates as ticks arrive', () => {
    startGame();
    render(<AlertBanner />);
    emit({ type: 'ALERT_WARNING', payload: { secondsRemaining: 10 } });

    const banner = screen.getByRole('alert');
    expect(banner.textContent).toContain('WARNING: Cage layout reshaping in 10 seconds!');

    for (let i = 0; i < 36; i++) {
      emit({ type: 'TICK', payload: { elapsedMs: i, botRemainingMs: null } });
    }
    expect(banner.textContent).toContain('in 1 second!');

    emit({ type: 'CAGE_RESHAPED', payload: { cages: [], metrics: algorithmMetrics() } });
    expect(screen.queryByRole('alert')).toBeNull();
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
