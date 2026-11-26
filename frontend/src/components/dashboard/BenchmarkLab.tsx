import { CircleCheck, Loader2, Play, TriangleAlert } from 'lucide-react';
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

const NAIVE_FILL = 'bg-blush-200';
const OPTIMIZED_FILL = 'bg-lilac-300';

function label(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function Bar({ value, peak, text, tone, testId }: { value: number; peak: number; text: string; tone: string; testId: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-5 flex-1 rounded-lg border-2 border-ink bg-white p-0.5">
        <div
          data-testid={testId}
          className={`h-full rounded-[5px] border-ink/70 ${tone} ${value > 0 ? 'border' : ''}`}
          style={{ width: barWidth(value, peak) }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums text-ink">{text}</span>
    </div>
  );
}

function StatsCard({ title, subtitle, stats, swatch }: { title: string; subtitle: string; stats: StrategyBenchmarkStats; swatch: string }) {
  const rows = [
    { label: 'p50 latency', value: formatMillis(stats.p50LatencyMs) },
    { label: 'p95 latency', value: formatMillis(stats.p95LatencyMs) },
    { label: 'Avg nodes', value: formatCount(stats.avgNodesVisited) },
    { label: 'Peak RAM', value: formatMemory(stats.peakMemoryBytes) },
  ];
  return (
    <div data-testid={`card-${stats.strategy}`} className="overflow-hidden rounded-xl border-2 border-ink bg-white">
      <div className="flex items-start gap-2 border-b-2 border-ink px-3 py-2">
        <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-[4px] border-2 border-ink ${swatch}`} aria-hidden="true" />
        <div className="min-w-0">
          <h4 className="truncate text-lg leading-tight">{title}</h4>
          <p className="text-sm leading-snug text-ink-soft">{subtitle}</p>
        </div>
      </div>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 px-3 py-1.5 odd:bg-blush-50">
            <dt className="text-ink-soft">{row.label}</dt>
            <dd className="font-mono text-sm font-bold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Correctness({ result }: { result: BenchmarkResultDTO }) {
  const perfect = result.comparedCount > 0 && result.oracleAgreementPercent >= 100;
  return (
    <div
      data-testid="correctness"
      className={`flex flex-wrap items-center gap-2 rounded-xl border-2 px-3 py-2 ${
        perfect ? 'border-emerald-600/50 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-700'
      }`}
    >
      {perfect ? (
        <CircleCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
      ) : (
        <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
      )}
      <span className="text-lg">
        {perfect
          ? `Correctness verified: ${formatPercent(result.oracleAgreementPercent, 0)} match with the oracle`
          : `Correctness mismatch: only ${formatPercent(result.oracleAgreementPercent)} agreement with the oracle`}
      </span>
      <span className="text-sm opacity-80">
        {result.comparedCount} compared
        {result.inconclusiveCount > 0 ? `, ${result.inconclusiveCount} inconclusive (oracle budget)` : ''}
      </span>
    </div>
  );
}

function SummaryTile({ title, value, suffix, testId }: { title: string; value: string; suffix: string; testId: string }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-white px-3 py-2 text-center">
      <p className="section-label text-xs">{title}</p>
      <p className="mt-0.5">
        <span data-testid={testId} className="font-mono text-2xl font-bold text-lilac-600">
          {value}
        </span>
        <span className="ml-1 text-ink-soft">{suffix}</span>
      </p>
    </div>
  );
}

function ResultView({ result, wallMs }: { result: BenchmarkResultDTO; wallMs: number | null }) {
  const rows = metricRows(result);
  return (
    <div data-testid="benchmark-result" className="flex flex-col gap-5">
      <Correctness result={result} />

      <div className="sketch-card p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-dashed border-ink/20 pb-3">
          <h3 className="text-2xl">Naive Backtracking vs Optimized Backtracking</h3>
          <p className="font-mono text-xs text-ink-soft">
            {label(result.difficulty)} • {result.batchSize} puzzles • 9x9 Killer
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryTile title="Node reduction" value={formatPercent(result.nodeReductionPercent)} suffix="fewer" testId="node-reduction" />
          <SummaryTile
            title="p50 speedup"
            value={formatSpeedup(result.naive.p50LatencyMs, result.optimized.p50LatencyMs)}
            suffix="faster"
            testId="speedup-p50"
          />
          <SummaryTile
            title="p95 speedup"
            value={formatSpeedup(result.naive.p95LatencyMs, result.optimized.p95LatencyMs)}
            suffix="faster"
            testId="speedup-p95"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className={`h-3.5 w-3.5 rounded-[4px] border-2 border-ink ${NAIVE_FILL}`} aria-hidden="true" /> Naive (oracle)
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`h-3.5 w-3.5 rounded-[4px] border-2 border-ink ${OPTIMIZED_FILL}`} aria-hidden="true" /> Optimized (MRV +
            pruning)
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-4">
          {rows.map((row) => {
            const peak = Math.max(row.naive, row.optimized);
            return (
              <div key={row.key} data-testid={`row-${row.key}`}>
                <p className="mb-1 text-lg">{row.label}</p>
                <div className="flex flex-col gap-1.5">
                  <Bar value={row.naive} peak={peak} text={row.format(row.naive)} tone={NAIVE_FILL} testId={`bar-${row.key}-naive`} />
                  <Bar
                    value={row.optimized}
                    peak={peak}
                    text={row.format(row.optimized)}
                    tone={OPTIMIZED_FILL}
                    testId={`bar-${row.key}-optimized`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          title="NaiveBacktrackingSolver"
          subtitle="Reference oracle: row-major exhaustive backtracking"
          stats={result.naive}
          swatch={NAIVE_FILL}
        />
        <StatsCard
          title="OptimizedBacktrackingSolver"
          subtitle="MRV + forward checking + cage-sum pruning"
          stats={result.optimized}
          swatch={OPTIMIZED_FILL}
        />
      </div>

      <p className="text-sm text-ink-faint">
        {result.batchSize} {result.difficulty} puzzles (seed prefix "{result.seedPrefix}"), same puzzles for both solvers.
        {wallMs !== null ? ` Wall time ${(wallMs / 1000).toFixed(1)}s.` : ''}
      </p>
    </div>
  );
}

function pillClass(selected: boolean): string {
  return `rounded-full border-2 border-ink px-3.5 py-1 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
    selected ? 'bg-blush-100 shadow-sketch-sm' : 'bg-white hover:bg-blush-50'
  }`;
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
    <section aria-label="Algorithm Benchmark Lab" className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl leading-tight sm:text-4xl">Algorithm Benchmark Lab</h2>
          <p className="mt-1 max-w-xl text-lg leading-snug text-ink-soft">
            Generates puzzles, solves each one with the naive oracle and the optimized solver, and checks that both
            return the generated solution.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="sketch-btn sketch-btn-primary self-start shadow-sketch lg:self-auto"
        >
          {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {running ? 'Running benchmark…' : 'Run benchmark'}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="section-label mr-1 text-xs">Batch size</h3>
          <div role="radiogroup" aria-label="Batch size" className="flex gap-2">
            {BATCH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={batchSize === size}
                disabled={running}
                onClick={() => setBatchSize(size)}
                className={`font-mono font-bold ${pillClass(batchSize === size)}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="section-label mr-1 text-xs">Difficulty</h3>
          <div role="radiogroup" aria-label="Benchmark difficulty" className="flex gap-2">
            {DIFFICULTIES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={difficulty === value}
                disabled={running}
                onClick={() => setDifficulty(value)}
                className={pillClass(difficulty === value)}
              >
                {label(value)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {running && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-ink-soft">
            {batchSize} {difficulty.toLowerCase()} puzzles can take up to ~25 s.
          </p>
          <button type="button" onClick={cancel} className="sketch-btn px-3 py-1 text-sm">
            Stop waiting
          </button>
        </div>
      )}

      {error !== null && (
        <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}

      {result !== null ? (
        <ResultView result={result} wallMs={wallMs} />
      ) : (
        !running && (
          <div className="sketch-card border-dashed px-4 py-10 text-center text-lg text-ink-soft shadow-none">
            Pick a batch size and difficulty, then press <span className="text-ink">Run benchmark</span> to compare both
            solvers.
          </div>
        )
      )}
    </section>
  );
}
