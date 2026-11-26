// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAlgorithmBenchmark } from '../../services/apiClient';
import type { BenchmarkResultDTO, StrategyBenchmarkStats } from '../../types/game';
import { BenchmarkLab } from './BenchmarkLab';

vi.mock('../../services/apiClient', () => ({
  runAlgorithmBenchmark: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const naive: StrategyBenchmarkStats = {
  strategy: 'NAIVE_ORACLE',
  p50LatencyMs: 3.5,
  p95LatencyMs: 92,
  avgNodesVisited: 34_322,
  avgPrunedBranches: 0,
  peakMemoryBytes: 23_572 * 1024,
  bitmaskOverheadBytes: 0,
};

const optimized: StrategyBenchmarkStats = {
  strategy: 'OPTIMIZED_MRV_PRUNING',
  p50LatencyMs: 0.24,
  p95LatencyMs: 3.6,
  avgNodesVisited: 311,
  avgPrunedBranches: 187,
  peakMemoryBytes: 3 * 1024,
  bitmaskOverheadBytes: 0,
};

const result = (overrides: Partial<BenchmarkResultDTO> = {}): BenchmarkResultDTO => ({
  difficulty: 'HARD',
  batchSize: 500,
  comparedCount: 500,
  inconclusiveCount: 0,
  seedPrefix: 'benchmark',
  naive,
  optimized,
  nodeReductionPercent: 99.09,
  oracleAgreementPercent: 100,
  generatedAt: 1,
  ...overrides,
});

const radio = (name: string | RegExp) => screen.getByRole('radio', { name });

beforeEach(() => {
  vi.mocked(runAlgorithmBenchmark).mockReset();
});

afterEach(() => {
  cleanup();
});

describe('BenchmarkLab', () => {
  it('offers the three batch sizes and difficulties with sensible defaults', () => {
    render(<BenchmarkLab />);
    expect(['100', '500', '1000'].map((size) => radio(size).getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(radio('Medium').getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByTestId('benchmark-result')).toBeNull();
  });

  it('runs the benchmark with the selected batch size and difficulty', async () => {
    vi.mocked(runAlgorithmBenchmark).mockResolvedValue(result());
    render(<BenchmarkLab />);

    fireEvent.click(radio('500'));
    fireEvent.click(radio('Hard'));
    fireEvent.click(screen.getByRole('button', { name: 'Run benchmark' }));

    await screen.findByTestId('benchmark-result');
    expect(runAlgorithmBenchmark).toHaveBeenCalledWith(500, 'HARD', expect.any(AbortSignal));
  });

  it('shows both solvers side by side with node reduction, speedups and verified correctness', async () => {
    vi.mocked(runAlgorithmBenchmark).mockResolvedValue(result());
    render(<BenchmarkLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Run benchmark' }));
    await screen.findByTestId('benchmark-result');

    const naiveCard = screen.getByTestId('card-NAIVE_ORACLE');
    const optimizedCard = screen.getByTestId('card-OPTIMIZED_MRV_PRUNING');
    expect(within(naiveCard).getByText('NaiveBacktrackingSolver')).toBeTruthy();
    expect(within(naiveCard).getByText('3.50 ms')).toBeTruthy();
    expect(within(naiveCard).getByText('92.00 ms')).toBeTruthy();
    expect(within(naiveCard).getByText('23.0 MB')).toBeTruthy();
    expect(within(optimizedCard).getByText('OptimizedBacktrackingSolver')).toBeTruthy();
    expect(within(optimizedCard).getByText('0.24 ms')).toBeTruthy();
    expect(within(optimizedCard).getByText('311')).toBeTruthy();
    expect(within(optimizedCard).getByText('3.0 KB')).toBeTruthy();

    expect(screen.getByTestId('node-reduction').textContent).toBe('99.1%');
    expect(screen.getByTestId('speedup-p50').textContent).toBe('15x');
    expect(screen.getByTestId('speedup-p95').textContent).toBe('26x');
    expect(screen.getByTestId('correctness').textContent).toContain('Correctness verified: 100% match with the oracle');
    expect(screen.getByTestId('correctness').textContent).toContain('500 compared');
  });

  it('draws bars proportional to the larger of the two solvers', async () => {
    vi.mocked(runAlgorithmBenchmark).mockResolvedValue(result());
    render(<BenchmarkLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Run benchmark' }));
    await screen.findByTestId('benchmark-result');

    expect(screen.getByTestId('bar-nodes-naive').style.width).toBe('100%');
    const optimizedNodes = parseFloat(screen.getByTestId('bar-nodes-optimized').style.width);
    expect(optimizedNodes).toBeGreaterThanOrEqual(2);
    expect(optimizedNodes).toBeLessThan(5);
    expect(screen.getByTestId('bar-pruned-naive').style.width).toBe('0%');
    expect(screen.getByTestId('bar-pruned-optimized').style.width).toBe('100%');
  });

  it('flags a correctness mismatch and reports inconclusive puzzles', async () => {
    vi.mocked(runAlgorithmBenchmark).mockResolvedValue(
      result({ oracleAgreementPercent: 98.5, comparedCount: 198, inconclusiveCount: 2 }),
    );
    render(<BenchmarkLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Run benchmark' }));
    await screen.findByTestId('benchmark-result');

    const correctness = screen.getByTestId('correctness').textContent ?? '';
    expect(correctness).toContain('Correctness mismatch: only 98.5% agreement');
    expect(correctness).toContain('2 inconclusive');
    expect(correctness).not.toContain('verified');
  });

  it('disables the controls while running and lets the user stop waiting', async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(runAlgorithmBenchmark).mockImplementation(
      (_size, _difficulty, signal) =>
        new Promise((_resolve, reject) => {
          capturedSignal = signal;
          signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    render(<BenchmarkLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Run benchmark' }));

    expect(screen.getByRole('button', { name: /Running benchmark/ }).hasAttribute('disabled')).toBe(true);
    expect(radio('1000').hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/~25 s/);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop waiting' }));
    });

    expect(capturedSignal?.aborted).toBe(true);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run benchmark' })).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/Stopped waiting/);
  });

  it('shows the server message when the benchmark fails', async () => {
    vi.mocked(runAlgorithmBenchmark).mockRejectedValue(new Error('A benchmark is already running, try again in a moment'));
    render(<BenchmarkLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Run benchmark' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/already running/);
    expect(screen.getByRole('button', { name: 'Run benchmark' }).hasAttribute('disabled')).toBe(false);
  });

  it('keeps the previous result visible while a new error is shown', async () => {
    vi.mocked(runAlgorithmBenchmark).mockResolvedValueOnce(result());
    render(<BenchmarkLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Run benchmark' }));
    await screen.findByTestId('benchmark-result');

    vi.mocked(runAlgorithmBenchmark).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByRole('button', { name: 'Run benchmark' }));

    expect((await screen.findByRole('alert')).textContent).toBe('boom');
    expect(screen.getByTestId('benchmark-result')).toBeTruthy();
  });
});
