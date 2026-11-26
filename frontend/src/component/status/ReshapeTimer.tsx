import { Shuffle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { formatClock } from '../../utils/formatTime';

export function ReshapeTimer() {
  const remainingMs = useGameStore((state) => state.reshapeRemainingMs);
  const gameStatus = useGameStore((state) => state.gameStatus);

  if (remainingMs === null || gameStatus !== 'PLAYING') {
    return null;
  }

  return (
    <div
      data-testid="reshape-timer"
      role="timer"
      aria-label="Time until the cage layout reshapes"
      className="doodle-chip"
    >
      <span className="flex items-center gap-1.5 text-muted">
        <Shuffle className="h-4 w-4" aria-hidden="true" />
        Reshape
      </span>
      <span data-testid="reshape-timer-value" className="font-mono font-bold tabular-nums">
        {formatClock(Math.ceil(remainingMs / 1000) * 1000)}
      </span>
    </div>
  );
}
