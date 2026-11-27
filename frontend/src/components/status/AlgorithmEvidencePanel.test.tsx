// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/useGameStore';
import { algorithmMetrics, boardState, emit } from '../../test/fixtures';
import { AlgorithmEvidencePanel } from './AlgorithmEvidencePanel';

beforeEach(() => {
  useGameStore.getState().resetGame();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const startWith = (metrics = algorithmMetrics({ operationType: 'PUZZLE_GEN' })) =>
  emit({ type: 'GAME_STARTED', payload: boardState(), metrics });

const reshape = (nodesVisited: number, executionTimeMs = 2) =>
  emit({
    type: 'CAGE_RESHAPED',
    payload: {
      cages: [],
      metrics: algorithmMetrics({ operationType: 'CAGE_RESHAPE', nodesVisited, executionTimeMs }),
    },
  });

describe('AlgorithmEvidencePanel', () => {
  it('waits for telemetry before the first metrics arrive', () => {
    render(<AlgorithmEvidencePanel />);
    expect(screen.getByTestId('evidence-empty').textContent).toMatch(/waiting/i);
    expect(screen.queryByTestId('strategy-badge')).toBeNull();
  });

  it('shows every telemetry field of the latest metrics', () => {
    startWith(
      algorithmMetrics({
        strategyUsed: 'NAIVE_ORACLE',
        operationType: 'PUZZLE_GEN',
        executionTimeMs: 3.256,
        nodesVisited: 12_345,
        prunedBranches: 678,
        unionFindOps: 910,
        memoryBytes: 65_536,
      }),
    );
    render(<AlgorithmEvidencePanel />);

    expect(screen.getByTestId('strategy-badge').textContent).toBe('NAIVE_ORACLE');
    expect(screen.getByTestId('operation-badge').textContent).toBe('PUZZLE_GEN');
    expect(screen.getByTestId('metric-time').textContent).toBe('3.26 ms');
    expect(screen.getByTestId('metric-nodes').textContent).toBe('12,345');
    expect(screen.getByTestId('metric-pruned').textContent).toBe('678');
    expect(screen.getByTestId('metric-unionfind').textContent).toBe('910');
    expect(screen.getByTestId('metric-memory').textContent).toBe('64.0 KB');
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('badges oracle-verified results with the 100% match label', () => {
    startWith(algorithmMetrics({ oracleVerified: true }));
    render(<AlgorithmEvidencePanel />);
    expect(screen.getByTestId('oracle-badge').textContent).toBe('Oracle Verified (100% Match)');
  });

  it('does not claim verification when the oracle was inconclusive', () => {
    startWith(algorithmMetrics({ oracleVerified: false }));
    render(<AlgorithmEvidencePanel />);
    expect(screen.getByTestId('oracle-badge').textContent).toBe('Not oracle-verified');
    expect(screen.queryByText(/100% Match/)).toBeNull();
  });

  it('updates live when a cage reshape reports new metrics and lists history newest first', () => {
    startWith();
    render(<AlgorithmEvidencePanel />);
    expect(screen.getByTestId('history-count').textContent).toBe('1 run');

    reshape(777);

    expect(screen.getByTestId('operation-badge').textContent).toBe('CAGE_RESHAPE');
    expect(screen.getByTestId('metric-nodes').textContent).toBe('777');
    expect(screen.getByTestId('history-count').textContent).toBe('2 runs');
    const rows = within(screen.getByTestId('metrics-history')).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('CAGE_RESHAPE');
    expect(rows[1].textContent).toContain('PUZZLE_GEN');
  });

  it('caps the visible history rows and sparkline bars while counting every run', () => {
    startWith();
    render(<AlgorithmEvidencePanel />);
    for (let i = 0; i < 14; i += 1) {
      reshape(i + 1);
    }

    expect(screen.getByTestId('history-count').textContent).toBe('15 runs');
    expect(within(screen.getByTestId('metrics-history')).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByTestId('metrics-sparkline').children).toHaveLength(12);
  });

  it('highlights fresh telemetry briefly and then settles', () => {
    vi.useFakeTimers();
    startWith();
    render(<AlgorithmEvidencePanel />);
    const panel = screen.getByTestId('algorithm-evidence');
    expect(panel.className).toContain('border-cage-purple');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(panel.className).toContain('border-ink');

    reshape(5);
    expect(panel.className).toContain('border-cage-purple');
  });

  it('returns to the waiting state when the game is reset', () => {
    startWith();
    render(<AlgorithmEvidencePanel />);
    act(() => {
      useGameStore.getState().resetGame();
    });
    expect(screen.getByTestId('evidence-empty')).toBeTruthy();
  });
});
