import { Heart, Skull, Trophy } from 'lucide-react';
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

const MAX_HEART_ICONS = 5;

function label(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function HealthRemaining({ hp, maxHp }: { hp: number; maxHp: number }) {
  const hearts = maxHp <= MAX_HEART_ICONS * 2 ? maxHp : MAX_HEART_ICONS;
  const filled = hearts === maxHp ? hp : Math.ceil((Math.max(0, hp) / maxHp) * hearts);
  return (
    <span className="flex items-center gap-1" aria-label={`${hp} of ${maxHp}`}>
      {Array.from({ length: hearts }, (_, index) => (
        <Heart
          key={index}
          className={`h-4 w-4 ${index < filled ? 'fill-red-700 text-ink' : 'fill-transparent text-ink-faint'}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ))}
      {hearts !== maxHp && <span className="ml-1 font-mono text-xs font-bold tabular-nums">{hp}/{maxHp}</span>}
    </span>
  );
}

function Sun() {
  const rays = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4);
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      {rays.map((angle) => (
        <line
          key={angle}
          x1={24 + Math.cos(angle) * 14}
          y1={24 + Math.sin(angle) * 14}
          x2={24 + Math.cos(angle) * 20}
          y2={24 + Math.sin(angle) * 20}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      <circle cx="24" cy="24" r="10" fill="#fde68a" stroke="currentColor" strokeWidth="2" />
      <circle cx="20.5" cy="22" r="1.2" fill="currentColor" />
      <circle cx="27.5" cy="22" r="1.2" fill="currentColor" />
      <path d="M20 26.5 Q24 30 28 26.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
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
  const Icon = won ? Trophy : Skull;
  const message = won
    ? 'Puzzle solved! Every cage is filled.'
    : (reason === 'HP_DEPLETED' && mode === 'CLASSIC' ? 'You ran out of lives.' : reason && LOSS_MESSAGES[reason]) ||
      'The game ended.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blush-50/70 p-4 backdrop-blur-[3px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="w-full max-w-sm rounded-2xl border-2 border-ink bg-white p-6 text-center text-ink shadow-sketch-lg"
      >
        <div className="flex items-center justify-center gap-3 text-ink">
          {won && <Sun />}
          <Icon
            className={`h-9 w-9 ${won ? 'fill-sunny-300 text-ink' : 'fill-blush-100 text-ink'}`}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>
        <h2 id="result-title" className="mt-2 text-4xl leading-tight">
          {won ? 'You Win!' : 'Game over'}
        </h2>
        <p className="mt-1 text-lg text-ink-soft">{message}</p>

        <dl className="mt-5 text-left">
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-ink/20 py-2">
            <dt className="text-ink-soft">Time Taken</dt>
            <dd className="font-mono text-base font-bold tabular-nums">{formatPrecise(finalTimeMs)}</dd>
          </div>
          {maxHp > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-ink/20 py-2">
              <dt className="text-ink-soft">Health Remaining</dt>
              <dd>
                <HealthRemaining hp={hp} maxHp={maxHp} />
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-ink-soft">Difficulty / Mode</dt>
            <dd className="font-mono text-sm font-bold">
              {difficulty ? label(difficulty) : '-'} • {mode === 'BOT_CHALLENGE' ? 'Bot' : 'Classic'}
            </dd>
          </div>
        </dl>
        {won && isDaily && (
          <p className="mt-3 rounded-lg bg-lilac-50 px-2 py-1 text-sm text-lilac-600">
            Daily run: the server verifies your replay before it appears on the leaderboard.
          </p>
        )}
        {won && <p className="mt-2 text-sm text-ink-faint">Time includes +5s for each wrong answer.</p>}

        <div className="mt-6 flex flex-col gap-3">
          <button type="button" autoFocus onClick={onPlayAgain} className="sketch-btn sketch-btn-primary w-full py-2.5">
            Play Again
          </button>
          <button type="button" onClick={onBackToDashboard} className="sketch-btn w-full py-2.5">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
