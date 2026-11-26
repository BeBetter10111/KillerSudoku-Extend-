import { Bot, Clock3 } from 'lucide-react';
import { useLocalCountdown } from '../../hooks/useLocalCountdown';
import { useGameStore } from '../../store/useGameStore';
import { formatClock } from '../../utils/formatTime';

function fillFor(ratio: number): string {
  if (ratio > 0.5) {
    return 'bg-fuchsia-400';
  }
  return ratio > 0.25 ? 'bg-amber-400' : 'bg-rose-500';
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
        className="sketch-chip font-normal"
      >
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        Bot arrives in
        <span className="font-mono font-bold tabular-nums">{formatClock(spawnRemainingMs)}</span>
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
      className="sketch-chip min-w-[190px] font-normal"
    >
      <Bot className="h-4 w-4 shrink-0 text-fuchsia-600" aria-hidden="true" />
      Bot
      <div
        role="progressbar"
        aria-label="Bot countdown"
        aria-valuemin={0}
        aria-valuemax={Math.round(botMaxMs / 1000)}
        aria-valuenow={Math.round(remainingMs / 1000)}
        className="h-2.5 min-w-[48px] flex-1 overflow-hidden rounded-full border border-ink bg-white"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${fillFor(ratio)}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className="font-mono font-bold tabular-nums">{(remainingMs / 1000).toFixed(1)}s</span>
    </div>
  );
}
