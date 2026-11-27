import { Bot, Clock3 } from 'lucide-react';
import { useLocalCountdown } from '../../hooks/useLocalCountdown';
import { useGameStore } from '../../store/useGameStore';
import { formatClock } from '../../utils/formatTime';

function fillFor(ratio: number): string {
  if (ratio > 0.5) {
    return 'bg-fuchsia-500';
  }
  return ratio > 0.25 ? 'bg-amber-500' : 'bg-rose-500';
}

export function BotTimer() {
  const botPosition = useGameStore((state) => state.botPosition);
  const botRemainingMs = useGameStore((state) => state.botRemainingMs);
  const botMaxMs = useGameStore((state) => state.botMaxMs);
  const botSpawnRemainingMs = useGameStore((state) => state.botSpawnRemainingMs);
  const remainingMs = useLocalCountdown(botPosition !== null ? botRemainingMs : null);
  const spawnRemainingMs = useLocalCountdown(botPosition === null ? botSpawnRemainingMs : null);

  if (botPosition === null) {
    if (spawnRemainingMs === null) {
      return null;
    }
    return (
      <div
        data-testid="bot-spawn-timer"
        className="sketch-panel w-full px-3 py-2"
      >
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-1.5 text-ink">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            Bot arrives in
          </span>
          <span className="sketch-pill py-0 font-mono tabular-nums">{formatClock(spawnRemainingMs)}</span>
        </div>
      </div>
    );
  }

  if (remainingMs === null || botMaxMs === null || botMaxMs <= 0) {
    return null;
  }

  const ratio = Math.min(1, Math.max(0, remainingMs / botMaxMs));

  return (
    <div
      data-testid="bot-timer"
      className="sketch-panel w-full border-cage px-3 py-2"
    >
      <div className="mb-1 flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-1.5 text-cage">
          <Bot className="h-4 w-4" aria-hidden="true" />
          Bot revealed
        </span>
        <span className="sketch-pill py-0 font-mono tabular-nums">{(remainingMs / 1000).toFixed(1)}s</span>
      </div>
      <div
        role="progressbar"
        aria-label="Bot countdown"
        aria-valuemin={0}
        aria-valuemax={Math.round(botMaxMs / 1000)}
        aria-valuenow={Math.round(remainingMs / 1000)}
        className="h-3 overflow-hidden rounded-full border-[1.5px] border-ink bg-white"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${fillFor(ratio)}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
