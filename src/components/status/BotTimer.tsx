import { Bot } from 'lucide-react';
import { useLocalCountdown } from '../../hooks/useLocalCountdown';
import { useGameStore } from '../../store/useGameStore';

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
  const remainingMs = useLocalCountdown(botPosition !== null ? botRemainingMs : null);

  if (botPosition === null || remainingMs === null || botMaxMs === null || botMaxMs <= 0) {
    return null;
  }

  const ratio = Math.min(1, Math.max(0, remainingMs / botMaxMs));

  return (
    <div
      data-testid="bot-timer"
      className="w-full rounded-xl border border-fuchsia-500/60 bg-slate-800/80 px-3 py-2"
    >
      <div className="mb-1 flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-1.5 text-fuchsia-300">
          <Bot className="h-4 w-4" aria-hidden="true" />
          Bot revealed
        </span>
        <span className="tabular-nums text-slate-200">{(remainingMs / 1000).toFixed(1)}s</span>
      </div>
      <div
        role="progressbar"
        aria-label="Bot countdown"
        aria-valuemin={0}
        aria-valuemax={Math.round(botMaxMs / 1000)}
        aria-valuenow={Math.round(remainingMs / 1000)}
        className="h-2.5 overflow-hidden rounded-full bg-slate-700"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${fillFor(ratio)}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
