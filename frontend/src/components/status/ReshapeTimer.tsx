import { Shuffle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { formatClock } from '../../utils/formatTime';

const WARNING_MS = 30_000;
const URGENT_MS = 10_000;

export function ReshapeTimer() {
  const remainingMs = useGameStore((state) => state.reshapeRemainingMs);
  const gameStatus = useGameStore((state) => state.gameStatus);

  if (remainingMs === null || gameStatus !== 'PLAYING') {
    return null;
  }

  const urgent = remainingMs <= URGENT_MS;
  const warning = remainingMs <= WARNING_MS;
  const tone = urgent
    ? 'border-rose-500/70 bg-rose-500/10 text-rose-200'
    : warning
      ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
      : 'border-slate-700 bg-slate-800/80 text-slate-200';

  return (
    <div
      data-testid="reshape-timer"
      role="timer"
      aria-label="Time until the cage layout reshapes"
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold sm:col-span-2 ${tone} ${
        urgent ? 'animate-pulse motion-reduce:animate-none' : ''
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Shuffle className="h-4 w-4" aria-hidden="true" />
        Cages reshape in
      </span>
      <span data-testid="reshape-timer-value" className="font-mono tabular-nums">
        {formatClock(Math.ceil(remainingMs / 1000) * 1000)}
      </span>
    </div>
  );
}
