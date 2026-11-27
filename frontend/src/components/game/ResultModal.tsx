import { Skull, Sun, Trophy } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pale-blush/80 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="sketch-card w-full max-w-sm p-6 text-center shadow-sketch-lg"
      >
        <div className="flex items-center justify-center gap-3">
          <Sun className="h-9 w-9 fill-doodle-yellow text-ink" strokeWidth={1.75} aria-hidden="true" />
          <Icon
            className={`h-10 w-10 text-ink ${won ? 'fill-doodle-yellow' : 'fill-dusty-rose'}`}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>
        <h2 id="result-title" className="mt-3 text-4xl font-bold text-ink">
          {won ? 'Puzzle solved!' : 'Game over'}
        </h2>
        <p className="mt-1 text-muted">{message}</p>

        <dl className="mt-5 divide-y divide-dashed divide-ink/30 text-left">
          <div className="flex items-center justify-between py-2">
            <dt className="text-muted">Time Taken</dt>
            <dd className="font-mono text-lg font-bold tabular-nums">{formatPrecise(finalTimeMs)}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-muted">Difficulty / Mode</dt>
            <dd className="font-bold">
              {difficulty ?? ''} · {mode === 'BOT_CHALLENGE' ? 'Bot' : 'Classic'}
            </dd>
          </div>
        </dl>
        {won && isDaily && (
          <p className="mt-3 text-sm text-muted">
            Daily run: the server verifies your replay before it appears on the leaderboard.
          </p>
        )}
        {won && <p className="mt-1 text-sm text-muted">Time includes +5s for each wrong answer.</p>}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            autoFocus
            onClick={onPlayAgain}
            className="sketch-btn-primary px-4 py-2.5"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="sketch-btn px-4 py-2.5"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
