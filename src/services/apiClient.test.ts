import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  MAX_BENCHMARK_BATCH_SIZE,
  fetchDailySeed,
  fetchLeaderboard,
  runAlgorithmBenchmark,
} from './apiClient';
import type { BenchmarkResultDTO } from '../types/game';

const fetchMock = vi.fn();

const stats = (strategy: 'NAIVE_ORACLE' | 'OPTIMIZED_MRV_PRUNING') => ({
  strategy,
  p50LatencyMs: 1,
  p95LatencyMs: 2,
  avgNodesVisited: 100,
  avgPrunedBranches: strategy === 'NAIVE_ORACLE' ? 0 : 40,
  peakMemoryBytes: 2048,
});

const benchmark: BenchmarkResultDTO = {
  difficulty: 'HARD',
  batchSize: 100,
  comparedCount: 100,
  inconclusiveCount: 0,
  seedPrefix: 'benchmark',
  naive: stats('NAIVE_ORACLE'),
  optimized: stats('OPTIMIZED_MRV_PRUNING'),
  nodeReductionPercent: 99,
  oracleAgreementPercent: 100,
  generatedAt: 1,
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiClient', () => {
  it('fetches the daily seed through the same-origin proxy path', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ date: '2026-11-16', seed: 'daily-2026-11-16' }));

    await expect(fetchDailySeed()).resolves.toEqual({ date: '2026-11-16', seed: 'daily-2026-11-16' });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/daily-seed');
  });

  it('builds the leaderboard query string from the provided filters only', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([])));

    await fetchLeaderboard({ date: '2026-11-16', mode: 'BOT_CHALLENGE', difficulty: 'HARD', limit: 5 });
    await fetchLeaderboard();

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/leaderboard?date=2026-11-16&mode=BOT_CHALLENGE&difficulty=HARD&limit=5',
    );
    expect(fetchMock.mock.calls[1][0]).toBe('/api/leaderboard');
  });

  it('turns a failed GET into an ApiError carrying the status', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 503 }));

    await expect(fetchDailySeed()).rejects.toMatchObject({ name: 'ApiError', status: 503 });
  });

  it('posts the benchmark request and returns the parsed result', async () => {
    fetchMock.mockResolvedValue(jsonResponse(benchmark));
    const controller = new AbortController();

    const result = await runAlgorithmBenchmark(100, 'HARD', controller.signal);

    expect(result).toEqual(benchmark);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/benchmark/run');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ difficulty: 'HARD', batchSize: 100 });
    expect(init.signal).toBe(controller.signal);
  });

  it('explains a busy server (429) and a rejected request (400)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
    const busy = await runAlgorithmBenchmark(10, 'EASY').catch((error: unknown) => error);
    expect(busy).toBeInstanceOf(ApiError);
    expect((busy as ApiError).status).toBe(429);
    expect((busy as ApiError).message).toMatch(/already running/i);

    fetchMock.mockResolvedValueOnce(new Response('', { status: 400 }));
    await expect(runAlgorithmBenchmark(10, 'EASY')).rejects.toMatchObject({ status: 400 });

    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(runAlgorithmBenchmark(10, 'EASY')).rejects.toThrow(/status 500/);
  });

  it('rejects an invalid batch size before touching the network', async () => {
    for (const size of [0, -5, 1.5, Number.NaN, MAX_BENCHMARK_BATCH_SIZE + 1]) {
      await expect(runAlgorithmBenchmark(size, 'MEDIUM')).rejects.toBeInstanceOf(RangeError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
