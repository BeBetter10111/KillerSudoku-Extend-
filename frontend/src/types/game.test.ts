import { describe, expect, it } from 'vitest';
import type {
  AlgorithmMetrics,
  BenchmarkRequest,
  BenchmarkResultDTO,
  GameEventMessage,
  StartGameRequest,
  StrategyBenchmarkStats,
} from './game';

const stats = (strategy: StrategyBenchmarkStats['strategy'], p50: number, p95: number): StrategyBenchmarkStats => ({
  strategy,
  p50LatencyMs: p50,
  p95LatencyMs: p95,
  avgNodesVisited: 1000,
  avgPrunedBranches: strategy === 'NAIVE_ORACLE' ? 0 : 250,
  peakMemoryBytes: 4096,
  bitmaskOverheadBytes: 0,
});

const metrics: AlgorithmMetrics = {
  strategyUsed: 'NAIVE_ORACLE',
  operationType: 'SOLVE',
  executionTimeMs: 1.5,
  nodesVisited: 100,
  prunedBranches: 0,
  unionFindOps: 0,
  memoryBytes: 1024,
  oracleVerified: true,
  bitmaskOverheadBytes: 0,
};

describe('algorithm evidence types', () => {
  it('models a naive-vs-optimized benchmark request and result', () => {
    const request: BenchmarkRequest = { difficulty: 'HARD', batchSize: 100 };
    const result: BenchmarkResultDTO = {
      difficulty: request.difficulty,
      batchSize: 100,
      comparedCount: 100,
      inconclusiveCount: 0,
      seedPrefix: 'benchmark',
      naive: stats('NAIVE_ORACLE', 3.5, 92),
      optimized: stats('OPTIMIZED_MRV_PRUNING', 0.24, 3.6),
      nodeReductionPercent: 98.7,
      oracleAgreementPercent: 100,
      generatedAt: 1_760_000_000_000,
    };
    expect(result.optimized.p95LatencyMs).toBeLessThan(result.naive.p95LatencyMs);
    expect(result.oracleAgreementPercent).toBe(100);
  });

  it('describes per-operation metrics with the backend field names', () => {
    expect(Object.keys(metrics).sort()).toEqual([
      'bitmaskOverheadBytes',
      'executionTimeMs',
      'memoryBytes',
      'nodesVisited',
      'operationType',
      'oracleVerified',
      'prunedBranches',
      'strategyUsed',
      'unionFindOps',
    ]);
  });

  it('lets the start request pick a solver and event messages carry metrics', () => {
    const start: StartGameRequest = { mode: 'BOT_CHALLENGE', difficulty: 'HARD', solverStrategy: 'NAIVE_ORACLE' };
    const tick: GameEventMessage<'TICK'> = {
      type: 'TICK',
      sessionId: 'session-1',
      timestamp: 1,
      payload: { elapsedMs: 250, botRemainingMs: null },
      metrics: null,
    };
    const started: GameEventMessage = { ...tick, type: 'TICK', metrics };
    expect(start.solverStrategy).toBe('NAIVE_ORACLE');
    expect(tick.metrics).toBeNull();
    expect(started.metrics?.operationType).toBe('SOLVE');
  });
});
