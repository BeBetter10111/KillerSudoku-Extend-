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

function comparison(row: MetricRow): string {
  const { naive, optimized } = row;
  if (!(naive > 0) && !(optimized > 0)) {
    return '-';
  }
  if (row.key === 'p50' || row.key === 'p95') {
    const speedup = formatSpeedup(naive, optimized);
    return speedup === 'n/a' ? speedup : `${speedup} faster`;
  }
  if (optimized < naive) {
    return `${formatPercent((1 - optimized / naive) * 100)} fewer`;
  }
  if (optimized > naive) {
    return naive > 0 ? `${formatSpeedup(optimized, naive)} more` : 'only optimized';
  }
  return 'same';
}

function MiniBar({ value, peak, tone, testId }: { value: number; peak: number; tone: string; testId: string }) {
  return (
    <div className="mt-1 h-2 w-full max-w-[9rem] overflow-hidden rounded-full border border-ink/70 bg-white">
      <div data-testid={testId} className={`h-full rounded-full ${tone}`} style={{ width: barWidth(value, peak) }} />
    </div>
  );
}

function HeroBar({ label, value, peak, text, tone }: { label: string; value: number; peak: number; text: string; tone: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{text}</span>
      </div>
      <div className="h-6 overflow-hidden rounded-lg border-2 border-ink bg-white p-0.5">
        <div className={`h-full rounded-md border border-ink/60 ${tone}`} style={{ width: barWidth(value, peak) }} />
      </div>
    </div>
  );
}

function StatsCard({ title, subtitle, stats }: { title: string; subtitle: string; stats: StrategyBenchmarkStats }) {
  return (
    <div data-testid={`card-${stats.strategy}`} className="rounded-xl border-2 border-ink bg-white p-3">
      <h3 className="font-hand text-lg leading-tight">{title}</h3>
      <p className="mb-2 text-[11px] text-muted">{subtitle}</p>
      <dl className="grid grid-cols-2 gap-1.5 text-xs">
        {[
          ['p50', formatMillis(stats.p50LatencyMs)],
          ['p95', formatMillis(stats.p95LatencyMs)],
          ['Avg nodes', formatCount(stats.avgNodesVisited)],
          ['Peak RAM', formatMemory(stats.peakMemoryBytes)],
        ].map(([term, value]) => (
          <div key={term} className="rounded-md bg-pale-blush px-2 py-1">
            <dt className="text-muted">{term}</dt>
            <dd className="font-mono">{value}</dd>
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
      className={`flex flex-wrap items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm ${
        perfect ? 'border-ink bg-lavender/40 text-ink' : 'border-crimson bg-blush text-crimson'
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
  const heroPeak = Math.max(result.naive.p50LatencyMs, result.optimized.p50LatencyMs);
  return (
    <div data-testid="benchmark-result" className="card-doodle flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-dashed border-dusty-rose pb-3">
        <h3 className="font-hand text-xl sm:text-2xl">Naive Backtracking vs Optimized Backtracking</h3>
        <span className="text-xs text-muted">
          {result.difficulty.charAt(0) + result.difficulty.slice(1).toLowerCase()} • {result.batchSize} puzzles • 9x9 Killer
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <HeroBar
          label="Naive Backtracking (p50)"
          value={result.naive.p50LatencyMs}
          peak={heroPeak}
          text={`${formatMillis(result.naive.p50LatencyMs)} • ${formatCount(result.naive.avgNodesVisited)} nodes`}
          tone="bg-blush"
        />
        <HeroBar
          label="Optimized Backtracking (MRV + Cage Pruning)"
          value={result.optimized.p50LatencyMs}
          peak={heroPeak}
          text={`${formatMillis(result.optimized.p50LatencyMs)} • ${formatCount(result.optimized.avgNodesVisited)} nodes`}
          tone="bg-lavender"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border-2 border-ink">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="border-b-2 border-ink text-[11px] text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-normal">Metric</th>
              <th scope="col" className="px-3 py-2 font-normal">Naive Backtracking</th>
              <th scope="col" className="px-3 py-2 font-normal">Optimized Backtracking</th>
              <th scope="col" className="px-3 py-2 text-right font-normal">Comparison</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const peak = Math.max(row.naive, row.optimized);
              return (
                <tr
                  key={row.key}
                  data-testid={`row-${row.key}`}
                  className={`border-t border-dusty-rose ${index % 2 === 0 ? 'bg-blush' : 'bg-white'}`}
                >
                  <td className="px-3 py-2.5">{row.label}</td>
                  <td className="px-3 py-2.5 font-mono">
                    {row.format(row.naive)}
                    <MiniBar value={row.naive} peak={peak} tone="bg-dusty-rose" testId={`bar-${row.key}-naive`} />
                  </td>
                  <td className="px-3 py-2.5 font-mono">
                    {row.format(row.optimized)}
                    <MiniBar value={row.optimized} peak={peak} tone="bg-lavender" testId={`bar-${row.key}-optimized`} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{comparison(row)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Node reduction', 'node-reduction', formatPercent(result.nodeReductionPercent)],
          ['p50 speedup', 'speedup-p50', formatSpeedup(result.naive.p50LatencyMs, result.optimized.p50LatencyMs)],
          ['p95 speedup', 'speedup-p95', formatSpeedup(result.naive.p95LatencyMs, result.optimized.p95LatencyMs)],
        ].map(([title, testId, value]) => (
          <div key={testId} className="rounded-xl border-2 border-ink bg-pale-blush p-3 text-center">
            <p className="text-[11px] text-muted">{title}</p>
            <p data-testid={testId} className="font-hand text-3xl">
              {value}
            </p>
          </div>
        ))}
      </div>

      <Correctness result={result} />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatsCard
          title="NaiveBacktrackingSolver"
          subtitle="Reference oracle: row-major exhaustive backtracking"
          stats={result.naive}
        />
        <StatsCard
          title="OptimizedBacktrackingSolver"
          subtitle="MRV + forward checking + cage-sum pruning"
          stats={result.optimized}
        />
      </div>

      <p className="text-[11px] text-muted">
        {result.batchSize} {result.difficulty} puzzles (seed prefix "{result.seedPrefix}"), same puzzles for both solvers.
        {wallMs !== null ? ` Wall time ${(wallMs / 1000).toFixed(1)}s.` : ''}
      </p>
    </div>
  );
}

const PILL = 'rounded-full border-2 border-ink px-3 py-1 text-xs transition-colors disabled:opacity-50';
const PILL_ON = 'bg-blush shadow-doodle-sm';
const PILL_OFF = 'bg-white hover:bg-pale-blush';

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
    <section aria-label="Algorithm Benchmark Lab" className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 font-hand text-3xl">
          <FlaskConical className="h-6 w-6 text-cage-purple" aria-hidden="true" />
          Algorithm Benchmark Lab
        </h2>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="btn-doodle flex items-center justify-center gap-2 bg-lavender px-5 py-2 text-sm"
        >
          {running && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {running ? 'Running benchmark…' : 'Run benchmark'}
        </button>
      </header>
      <p className="-mt-2 text-xs leading-relaxed text-muted">
        Generates puzzles, solves each one with the naive oracle and the optimized solver, and checks that both return
        the generated solution.
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Difficulty</span>
          <div role="radiogroup" aria-label="Benchmark difficulty" className="flex gap-2">
            {DIFFICULTIES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={difficulty === value}
                disabled={running}
                onClick={() => setDifficulty(value)}
                className={`${PILL} ${difficulty === value ? PILL_ON : PILL_OFF}`}
              >
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Batch</span>
          <div role="radiogroup" aria-label="Batch size" className="flex gap-2">
            {BATCH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={batchSize === size}
                disabled={running}
                onClick={() => setBatchSize(size)}
                className={`${PILL} font-mono ${batchSize === size ? PILL_ON : PILL_OFF}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {running && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={cancel} className="btn-doodle px-4 py-1.5 text-xs">
            Stop waiting
          </button>
          <p role="status" className="text-xs text-muted">
            {batchSize} {difficulty.toLowerCase()} puzzles can take up to ~25 s.
          </p>
        </div>
      )}

      {error !== null && (
        <p role="alert" className="rounded-xl border-2 border-crimson bg-blush px-3 py-2 text-sm text-crimson">
          {error}
        </p>
      )}

      {result === null && !running && error === null && (
        <div className="card-doodle p-8 text-center text-sm text-muted">
          Pick a difficulty and batch size, then press <span className="text-ink">Run benchmark</span>.
        </div>
      )}

      {result !== null && <ResultView result={result} wallMs={wallMs} />}
    </section>
  );
}
