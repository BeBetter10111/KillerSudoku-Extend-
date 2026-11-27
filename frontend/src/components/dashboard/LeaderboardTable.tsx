import { Loader2, RefreshCw, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../../services/apiClient';
import type { Difficulty, GameMode, LeaderboardEntry } from '../../types/game';
import { formatPrecise } from '../../utils/formatTime';

interface LeaderboardTableProps {
  mode: GameMode;
  difficulty: Difficulty;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: LeaderboardEntry[] };

const MEDAL_COLORS = ['fill-doodle-yellow text-ink', 'fill-lavender text-ink', 'fill-dusty-rose text-ink'] as const;

function completedAt(entry: LeaderboardEntry): string {
  const date = new Date(entry.completedAt);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function LeaderboardTable({ mode, difficulty }: LeaderboardTableProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchLeaderboard({ mode, difficulty, limit: 10 }, controller.signal)
      .then((entries) => setState({ status: 'ready', entries }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' });
        }
      });
    return () => controller.abort();
  }, [mode, difficulty, reloadKey]);

  return (
    <div data-testid="leaderboard">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Trophy className="h-5 w-5 fill-doodle-yellow text-ink" aria-hidden="true" />
          Daily leaderboard
        </h3>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          aria-label="Refresh leaderboard"
          className="sketch-btn p-2"
        >
          <RefreshCw className={`h-4 w-4 ${state.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {state.status === 'loading' && (
        <p className="flex items-center gap-2 py-6 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading leaderboard…
        </p>
      )}

      {state.status === 'error' && (
        <p role="alert" className="py-6 text-crimson">
          Could not load the leaderboard. Is the server running?
        </p>
      )}

      {state.status === 'ready' && state.entries.length === 0 && (
        <p className="py-6 text-muted">No verified runs yet today. Be the first!</p>
      )}

      {state.status === 'ready' && state.entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border-[1.5px] border-ink">
          <table className="w-full text-left">
            <caption className="sr-only">
              Verified daily seed results for {mode} {difficulty}
            </caption>
            <thead className="text-sm text-muted">
              <tr>
                <th scope="col" className="w-12 py-2 pl-3 pr-2">#</th>
                <th scope="col" className="py-2 pr-2">Player</th>
                <th scope="col" className="py-2 pr-2 text-right">Time</th>
                <th scope="col" className="py-2 pr-3 text-right">Finished</th>
              </tr>
            </thead>
            <tbody>
              {state.entries.map((entry, index) => (
                <tr key={`${entry.playerName}-${entry.completedAt}`} className="border-t border-ink/30 odd:bg-blush/70">
                  <td className="py-2 pl-3 pr-2 font-semibold tabular-nums">
                    {index < MEDAL_COLORS.length ? (
                      <span className={`inline-flex items-center gap-1 ${MEDAL_COLORS[index]}`}>
                        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                        {index + 1}
                      </span>
                    ) : (
                      <span className="text-muted">{index + 1}</span>
                    )}
                  </td>
                  <td className="max-w-[10rem] truncate py-2 pr-2 text-ink">{entry.playerName}</td>
                  <td className="py-2 pr-2 text-right font-mono tabular-nums text-ink">
                    {formatPrecise(entry.finalTimeMs)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted">{completedAt(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
