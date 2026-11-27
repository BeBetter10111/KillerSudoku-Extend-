import { Activity, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { AlgorithmMetrics } from '../../types/game';
import { formatCount, formatKilobytes, formatMillis } from '../../utils/formatMetrics';

const HISTORY_ROWS = 5;
const SPARKLINE_BARS = 12;
const FRESH_HIGHLIGHT_MS = 1200;
const MIN_BAR_PERCENT = 8;

function Metric({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-ink/25 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd data-testid={testId} className="font-mono text-sm font-bold tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}

function OracleBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span
        data-testid="oracle-badge"
        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-blush px-2.5 py-0.5 text-sm text-ink"
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Oracle Verified (100% Match)
      </span>
    );
  }
  return (
    <span
      data-testid="oracle-badge"
      className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink/40 bg-white px-2.5 py-0.5 text-sm text-muted"
    >
      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
      Not oracle-verified
    </span>
  );
}

function Sparkline({ history }: { history: AlgorithmMetrics[] }) {
  const recent = history.slice(-SPARKLINE_BARS);
  const peak = Math.max(...recent.map((run) => run.executionTimeMs), Number.EPSILON);
  return (
    <div
      data-testid="metrics-sparkline"
      role="img"
      aria-label="Execution time of recent algorithm runs"
      className="flex h-10 items-end gap-1"
    >
      {recent.map((run, index) => (
        <div
          key={history.length - recent.length + index}
          title={`${run.operationType}: ${formatMillis(run.executionTimeMs)}`}
          className={`min-w-[6px] flex-1 rounded-t-sm border-[1.5px] border-b-0 border-ink ${
            run.strategyUsed === 'NAIVE_ORACLE' ? 'bg-blush' : 'bg-lavender'
          }`}
          style={{ height: `${Math.max(MIN_BAR_PERCENT, (run.executionTimeMs / peak) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function AlgorithmEvidencePanel() {
  const latest = useGameStore((state) => state.latestMetrics);
  const history = useGameStore((state) => state.metricsHistory);
  const [isFresh, setIsFresh] = useState(false);

  useEffect(() => {
    if (latest === null) {
      setIsFresh(false);
      return undefined;
    }
    setIsFresh(true);
    const timer = window.setTimeout(() => setIsFresh(false), FRESH_HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [latest]);

  const rows = history.slice(-HISTORY_ROWS).reverse();

  return (
    <section
      aria-label="Algorithm evidence"
      data-testid="algorithm-evidence"
      className={`w-full rounded-2xl border-2 bg-white p-4 shadow-sketch transition-colors duration-500 ${
        isFresh ? 'border-emerald-400/70' : 'border-ink'
      }`}
    >
      <header className="mb-2 flex items-center justify-between gap-2 border-b border-dashed border-ink/30 pb-2">
        <h2 className="flex items-center gap-1.5 text-xl font-bold text-ink">
          <Activity className="h-4 w-4 text-cage" aria-hidden="true" />
          Algorithm Evidence
        </h2>
        {latest !== null && (
          <span className="flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-blush px-2 text-sm text-ink">
            <span
              className={`h-2 w-2 rounded-full bg-crimson ${isFresh ? 'animate-pulse motion-reduce:animate-none' : ''}`}
              aria-hidden="true"
            />
            Live
          </span>
        )}
      </header>

      {latest === null ? (
        <p data-testid="evidence-empty" className="py-4 text-center text-muted">
          Waiting for algorithm telemetry...
        </p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span
              data-testid="strategy-badge"
              className="rounded-full border-[1.5px] border-ink bg-white px-2 py-0.5 font-mono text-xs font-bold text-ink"
            >
              {latest.strategyUsed}
            </span>
            <span
              data-testid="operation-badge"
              className="rounded-full border-[1.5px] border-ink bg-lavender/40 px-2 py-0.5 font-mono text-xs font-bold text-ink"
            >
              {latest.operationType}
            </span>
          </div>

          <dl className="flex flex-col">
            <Metric label="Execution time" value={formatMillis(latest.executionTimeMs)} testId="metric-time" />
            <Metric label="Memory" value={formatKilobytes(latest.memoryBytes)} testId="metric-memory" />
            <Metric label="Nodes visited" value={formatCount(latest.nodesVisited)} testId="metric-nodes" />
            <Metric label="Pruned branches" value={formatCount(latest.prunedBranches)} testId="metric-pruned" />
            <Metric label="Union-Find ops" value={formatCount(latest.unionFindOps)} testId="metric-unionfind" />
          </dl>

          <div className="mt-2">
            <OracleBadge verified={latest.oracleVerified} />
          </div>

          {history.length > 0 && (
            <div className="mt-3 border-t border-dashed border-ink/30 pt-2">
              <p className="mb-1 flex items-center justify-between text-sm text-muted">
                <span>Run history</span>
                <span data-testid="history-count">{history.length} {history.length === 1 ? 'run' : 'runs'}</span>
              </p>
              <Sparkline history={history} />
              <ol data-testid="metrics-history" className="mt-2 space-y-1 text-xs">
                {rows.map((run, index) => (
                  <li
                    key={history.length - index}
                    className="flex items-center justify-between gap-2 rounded-md bg-pale-blush px-2 py-1"
                  >
                    <span className="font-mono text-ink">{run.operationType}</span>
                    <span className="text-muted">
                      {run.strategyUsed === 'NAIVE_ORACLE' ? 'Naive' : 'Optimized'}
                    </span>
                    <span className="font-mono tabular-nums text-ink">{formatMillis(run.executionTimeMs)}</span>
                    <span className="font-mono tabular-nums text-muted">{formatCount(run.nodesVisited)} nodes</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}
