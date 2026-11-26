import { CircleCheck, FlaskConical, Loader2, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError, runAlgorithmBenchmark } from '../../services/apiClient';
import type { BenchmarkResultDTO, Difficulty, StrategyBenchmarkStats } from '../../types/game';
import {
  formatCount,
  formatMemory,
  formatMillis,
  formatPercent,
  formatSpeedup,
} from '../../utils/formatMetrics';

export const BATCH_SIZES = [100, 500, 1000] as const;
const DIFFICULTIES: readonly Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const MIN_BAR_PERCENT = 2;

type RunState = 'idle' | 'running' | 'done' | 'error';

interface MetricRow {
  key: string;
  label: string;
  naive: number;
  optimized: number;
  format: (value: number) => string;
}

function metricRows(result: BenchmarkResultDTO): MetricRow[] {
  const { naive, optimized } = result;
  return [
    { key: 'p50', label: 'p50 latency', naive: naive.p50LatencyMs, optimized: optimized.p50LatencyMs, format: formatMillis },
    { key: 'p95', label: 'p95 latency', naive: naive.p95LatencyMs, optimized: optimized.p95LatencyMs, format: formatMillis },
    { key: 'nodes', label: 'Avg nodes visited', naive: naive.avgNodesVisited, optimized: optimized.avgNodesVisited, format: formatCount },
    { key: 'pruned', label: 'Avg pruned branches', naive: naive.avgPrunedBranches, optimized: optimized.avgPrunedBranches, format: formatCount },
    { key: 'memory', label: 'Peak RAM (allocated)', naive: naive.peakMemoryBytes, optimized: optimized.peakMemoryBytes, format: formatMemory },
  ];
}

function barWidth(value: number, peak: number): string {
  if (!(value > 0) || !(peak > 0)) {
    return '0%';
  }
  return `${Math.max(MIN_BAR_PERCENT, (value / peak) * 100)}%`;
}

function Bar({ value, peak, text, tone, testId }: { value: number; peak: number; text: string; tone: string; testId: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper">
        <div data-testid={testId} className={`h-full rounded-full ${tone}`} style={{ width: barWidth(value, peak) }} />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums text-ink">{text}</span>
    </div>
  );
}

function StatsCard({ title, subtitle, stats, tone }: { title: string; subtitle: string; stats: StrategyBenchmarkStats; tone: string }) {
  return (
    <div data-testid={`card-${stats.strategy}`} className="rounded-xl border-2 border-ink/80 bg-paleblush/60 p-3">
      <h3 className="font-mono text-sm font-bold text-ink">{title}</h3>
      <p className="mb-2 text-xs text-muted">{subtitle}</p>
      <dl className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="rounded-md border border-ink/20 bg-paper px-2 py-1">
          <dt className="text-muted">p50</dt>
          <dd className={`font-mono font-bold ${tone}`}>{formatMillis(stats.p50LatencyMs)}</dd>
        </div>
        <div className="rounded-md border border-ink/20 bg-paper px-2 py-1">
          <dt className="text-muted">p95</dt>
          <dd className={`font-mono font-bold ${tone}`}>{formatMillis(stats.p95LatencyMs)}</dd>
        </div>
        <div className="rounded-md border border-ink/20 bg-paper px-2 py-1">
          <dt className="text-muted">Avg nodes</dt>
          <dd className={`font-mono font-bold ${tone}`}>{formatCount(stats.avgNodesVisited)}</dd>
        </div>
        <div className="rounded-md border border-ink/20 bg-paper px-2 py-1">
          <dt className="text-muted">Peak RAM</dt>
          <dd className={`font-mono font-bold ${tone}`}>{formatMemory(stats.peakMemoryBytes)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Correctness({ result }: { result: BenchmarkResultDTO }) {
  const perfect = result.comparedCount > 0 && result.oracleAgreementPercent >= 100;
  return (
    <div
      data-testid="correctness"
      className={`flex flex-wrap items-center gap-2 rounded-xl border-2 px-3 py-2 text-base ${
        perfect
          ? 'border-ink bg-blush text-ink'
          : 'border-crimson bg-paleblush text-crimson'
      }`}
    >
      {perfect ? (
        <CircleCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
      ) : (
        <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
      )}
      <span>
        {perfect
          ? `Correctness verified: ${formatPercent(result.oracleAgreementPercent, 0)} match with the oracle`
          : `Correctness mismatch: only ${formatPercent(result.oracleAgreementPercent)} agreement with the oracle`}
      </span>
      <span className="text-xs opacity-80">
        {result.comparedCount} compared
        {result.inconclusiveCount > 0 ? `, ${result.inconclusiveCount} inconclusive (oracle budget)` : ''}
      </span>
    </div>
  );
}

function ResultView({ result, wallMs }: { result: BenchmarkResultDTO; wallMs: number | null }) {
  const rows = metricRows(result);
  return (
    <div data-testid="benchmark-result" className="flex flex-col gap-4">
      <Correctness result={result} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-ink/80 bg-paleblush/60 p-3 text-center">
          <p className="text-xs text-muted">Node reduction</p>
          <p data-testid="node-reduction" className="font-mono text-2xl text-cage">
            {formatPercent(result.nodeReductionPercent)}
          </p>
        </div>
        <div className="rounded-xl border-2 border-ink/80 bg-paleblush/60 p-3 text-center">
          <p className="text-xs text-muted">p50 speedup</p>
          <p data-testid="speedup-p50" className="font-mono text-2xl text-cage">
            {formatSpeedup(result.naive.p50LatencyMs, result.optimized.p50LatencyMs)}
          </p>
        </div>
        <div className="rounded-xl border-2 border-ink/80 bg-paleblush/60 p-3 text-center">
          <p className="text-xs text-muted">p95 speedup</p>
          <p data-testid="speedup-p95" className="font-mono text-2xl text-cage">
            {formatSpeedup(result.naive.p95LatencyMs, result.optimized.p95LatencyMs)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatsCard
          title="NaiveBacktrackingSolver"
          subtitle="Reference oracle: row-major exhaustive backtracking"
          stats={result.naive}
          tone="text-muted"
        />
        <StatsCard
          title="OptimizedBacktrackingSolver"
          subtitle="MRV + forward checking + cage-sum pruning"
          stats={result.optimized}
          tone="text-cage"
        />
      </div>

      <div className="rounded-xl border-2 border-ink/80 bg-paleblush/60 p-3">
        <div className="mb-2 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-ink bg-doodle-yellow" aria-hidden="true" /> Naive (oracle)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-ink bg-cage" aria-hidden="true" /> Optimized
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const peak = Math.max(row.naive, row.optimized);
            return (
              <div key={row.key} data-testid={`row-${row.key}`}>
                <p className="mb-1 text-sm text-ink">{row.label}</p>
                <div className="flex flex-col gap-1">
                  <Bar value={row.naive} peak={peak} text={row.format(row.naive)} tone="bg-doodle-yellow" testId={`bar-${row.key}-naive`} />
                  <Bar value={row.optimized} peak={peak} text={row.format(row.optimized)} tone="bg-cage" testId={`bar-${row.key}-optimized`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted">
        {result.batchSize} {result.difficulty} puzzles (seed prefix "{result.seedPrefix}"), same puzzles for both solvers.
        {wallMs !== null ? ` Wall time ${(wallMs / 1000).toFixed(1)}s.` : ''}
      </p>
    </div>
  );
}

export function BenchmarkLab() {
  const [batchSize, setBatchSize] = useState<number>(BATCH_SIZES[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [state, setState] = useState<RunState>('idle');
  const [result, setResult] = useState<BenchmarkResultDTO | null>(null);
  const [wallMs, setWallMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = async (): Promise<void> => {
    if (state === 'running') {
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setState('running');
    setError(null);
    const startedAt = performance.now();
    try {
      const response = await runAlgorithmBenchmark(batchSize, difficulty, abort.signal);
      if (abort.signal.aborted) {
        return;
      }
      setResult(response);
      setWallMs(performance.now() - startedAt);
      setState('done');
    } catch (cause) {
      if (abort.signal.aborted) {
        setState(result === null ? 'idle' : 'done');
        setError('Stopped waiting. The server may still be finishing the run.');
        return;
      }
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : 'Benchmark failed');
      setState('error');
    }
  };

  const cancel = (): void => {
    controller.current?.abort();
  };

  const running = state === 'running';

  return (
    <section
      aria-label="Algorithm Benchmark Lab"
      className="flex flex-col gap-5 doodle-card p-4 sm:p-6"
    >
      <header>
        <h2 className="flex items-center gap-2 text-2xl">
          <FlaskConical className="h-5 w-5 text-cage" aria-hidden="true" />
          Algorithm Benchmark Lab
        </h2>
        <p className="mt-1 text-sm text-muted">
          Generates puzzles, solves each one with the naive oracle and the optimized solver, and checks that both
          return the generated solution.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xl text-ink">Batch size</h3>
          <div role="radiogroup" aria-label="Batch size" className="grid grid-cols-3 gap-2">
            {BATCH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={batchSize === size}
                disabled={running}
                onClick={() => setBatchSize(size)}
                className={`rounded-xl border-2 px-3 py-2 font-mono text-sm transition-colors disabled:opacity-50 ${
                  batchSize === size
                    ? 'border-ink bg-lavender/35 shadow-doodle'
                    : 'border-ink/30 bg-paper hover:border-ink hover:bg-paleblush'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xl text-ink">Difficulty</h3>
          <div role="radiogroup" aria-label="Benchmark difficulty" className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={difficulty === value}
                disabled={running}
                onClick={() => setDifficulty(value)}
                className={`rounded-xl border-2 px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                  difficulty === value
                    ? 'border-ink bg-lavender/35 shadow-doodle'
                    : 'border-ink/30 bg-paper hover:border-ink hover:bg-paleblush'
                }`}
              >
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="flex items-center gap-2 rounded-xl border-2 border-ink bg-lavender px-5 py-2.5 text-lg text-ink shadow-doodle transition-[transform,box-shadow,background-color] hover:bg-cage hover:text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {running ? 'Running benchmark…' : 'Run benchmark'}
        </button>
        {running && (
          <button
            type="button"
            onClick={cancel}
            className="doodle-key px-4 py-2.5 text-base"
          >
            Stop waiting
          </button>
        )}
        {running && (
          <p role="status" className="text-sm text-muted">
            {batchSize} {difficulty.toLowerCase()} puzzles can take up to ~25 s.
          </p>
        )}
      </div>

      {error !== null && (
        <p role="alert" className="rounded-xl border-2 border-crimson bg-paleblush px-3 py-2 text-base text-crimson">
          {error}
        </p>
      )}

      {result !== null && <ResultView result={result} wallMs={wallMs} />}
    </section>
  );
}
