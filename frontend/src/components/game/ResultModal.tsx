import { Cloud, Heart, Sun, Trophy } from 'lucide-react';
import type { Difficulty, GameMode } from '../../types/game';
import { formatPrecise } from '../../utils/formatTime';

interface ResultModalProps {
  won: boolean;
  reason: string | null;
  finalTimeMs: number;
  mode: GameMode | null;
  difficulty: Difficulty | null;
  seed: string | null;
  hp?: number;
  maxHp?: number;
  onPlayAgain: () => void;
  onBackToDashboard: () => void;
}

const LOSS_MESSAGES: Record<string, string> = {
  HP_DEPLETED: 'You ran out of HP.',
  FORFEIT: 'You left the game.',
  SESSION_EXPIRED: 'The session expired after two hours.',
};

const MAX_HEART_ICONS = 10;

function HealthRemaining({ hp, maxHp }: { hp: number; maxHp: number }) {
  if (maxHp <= 0) {
    return <span>-</span>;
  }
  if (maxHp > MAX_HEART_ICONS) {
    return (
      <span className="flex items-center gap-1 font-mono">
        <Heart className="h-4 w-4 fill-crimson text-ink" strokeWidth={1.5} aria-hidden="true" />
        {hp}/{maxHp}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1" aria-label={`${hp} of ${maxHp}`}>
      {Array.from({ length: maxHp }, (_, index) => (
        <Heart
          key={index}
          className={`h-4 w-4 ${index < hp ? 'fill-crimson text-ink' : 'fill-transparent text-ink'}`}
          strokeWidth={1.5}
          strokeDasharray={index < hp ? undefined : '2 2'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function ResultModal({
  won,
  reason,
  finalTimeMs,
  mode,
  difficulty,
  seed,
  hp = 0,
  maxHp = 0,
  onPlayAgain,
  onBackToDashboard,
}: ResultModalProps) {
  const isDaily = seed !== null && seed.startsWith('daily-');
  const message = won
    ? 'Every cage is solved.'
    : (reason === 'HP_DEPLETED' && mode === 'CLASSIC' ? 'You ran out of lives.' : reason && LOSS_MESSAGES[reason]) ||
      'The game ended.';
  const difficultyLabel = difficulty ? difficulty.charAt(0) + difficulty.slice(1).toLowerCase() : '-';
  const modeLabel = mode === 'BOT_CHALLENGE' ? 'Bot' : 'Killer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pale-blush/70 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="w-full max-w-sm rounded-2xl border-2 border-ink bg-white p-6 font-doodle text-ink shadow-doodle"
      >
        <div className="flex items-center justify-center gap-4" aria-hidden="true">
          {won ? (
            <>
              <Sun className="h-8 w-8 fill-doodle-yellow text-ink" strokeWidth={1.5} />
              <Trophy className="h-8 w-8 fill-doodle-yellow text-ink" strokeWidth={1.5} />
            </>
          ) : (
            <Cloud className="h-10 w-10 fill-doodle-sky text-ink" strokeWidth={1.5} />
          )}
        </div>
        <h2 id="result-title" className="mt-3 text-center font-hand text-4xl">
          {won ? 'You Win!' : 'Game Over'}
        </h2>
        <p className="mt-1 text-center text-xs text-muted">{message}</p>

        <dl className="mt-5 text-xs">
          <div className="flex items-center justify-between border-b border-dashed border-dusty-rose py-2.5">
            <dt className="text-muted">Time Taken</dt>
            <dd className="font-mono font-bold tabular-nums">{formatPrecise(finalTimeMs)}</dd>
          </div>
          <div className="flex items-center justify-between border-b border-dashed border-dusty-rose py-2.5">
            <dt className="text-muted">Health Remaining</dt>
            <dd>
              <HealthRemaining hp={hp} maxHp={maxHp} />
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted">Difficulty / Mode</dt>
            <dd>
              {difficultyLabel} • {modeLabel}
            </dd>
          </div>
        </dl>

        {won && isDaily && (
          <p className="mt-2 text-center text-[11px] text-cage-purple">
            Daily run: the server verifies your replay before it appears on the leaderboard.
          </p>
        )}
        {won && <p className="mt-1 text-center text-[11px] text-muted">Time includes +5s for each wrong answer.</p>}

        <div className="mt-5 flex flex-col gap-3">
          <button type="button" autoFocus onClick={onPlayAgain} className="btn-doodle bg-lavender px-4 py-2.5 text-sm">
            Play Again
          </button>
          <button type="button" onClick={onBackToDashboard} className="btn-doodle px-4 py-2.5 text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
