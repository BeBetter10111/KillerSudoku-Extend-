import { Skull, Trophy } from 'lucide-react';
import type { Difficulty, GameMode } from '../../types/game';
import { formatPrecise } from '../../utils/formatTime';

interface ResultModalProps {
  won: boolean;
  reason: string | null;
  finalTimeMs: number;
  mode: GameMode | null;
  difficulty: Difficulty | null;
  seed: string | null;
  onPlayAgain: () => void;
  onBackToDashboard: () => void;
}

const LOSS_MESSAGES: Record<string, string> = {
  HP_DEPLETED: 'You ran out of HP.',
  FORFEIT: 'You left the game.',
  SESSION_EXPIRED: 'The session expired after two hours.',
};

export function ResultModal({
  won,
  reason,
  finalTimeMs,
  mode,
  difficulty,
  seed,
  onPlayAgain,
  onBackToDashboard,
}: ResultModalProps) {
  const isDaily = seed !== null && seed.startsWith('daily-');
  const Icon = won ? Trophy : Skull;
  const message = won ? 'Every cage is solved.' : (reason === 'HP_DEPLETED' && mode === 'CLASSIC' ? 'You ran out of lives.' : reason && LOSS_MESSAGES[reason]) || 'The game ended.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className={`w-full max-w-sm rounded-2xl border bg-slate-800 p-6 text-center shadow-2xl ${
          won ? 'border-emerald-400/60' : 'border-rose-400/60'
        }`}
      >
        <Icon className={`mx-auto h-12 w-12 ${won ? 'text-emerald-300' : 'text-rose-300'}`} aria-hidden="true" />
        <h2 id="result-title" className="mt-3 text-2xl font-extrabold">
          {won ? 'Puzzle solved!' : 'Game over'}
        </h2>
        <p className="mt-1 text-slate-300">{message}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-900/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Time</dt>
            <dd className="mt-1 font-mono text-lg font-bold tabular-nums">{formatPrecise(finalTimeMs)}</dd>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Mode</dt>
            <dd className="mt-1 text-lg font-bold">
              {mode === 'BOT_CHALLENGE' ? 'Bot' : 'Classic'} · {difficulty ?? ''}
            </dd>
          </div>
        </dl>
        {won && isDaily && (
          <p className="mt-3 text-xs text-amber-200">
            Daily run: the server verifies your replay before it appears on the leaderboard.
          </p>
        )}
        {won && <p className="mt-1 text-xs text-slate-500">Time includes +5s for each wrong answer.</p>}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            autoFocus
            onClick={onPlayAgain}
            className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 font-bold text-white transition-colors hover:bg-sky-500"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex-1 rounded-xl bg-slate-700 px-4 py-2.5 font-bold text-slate-100 transition-colors hover:bg-slate-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
