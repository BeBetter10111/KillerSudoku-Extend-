import { Bot } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useLocalCountdown } from '../../hooks/useLocalCountdown';
import { useGameStore } from '../../store/useGameStore';
import type { Position } from '../../types/game';

export type CellHighlight = 'selected' | 'same' | 'peer' | 'none';

export interface CellProps {
  row: number;
  col: number;
  value: number;
  given: boolean;
  wrong?: boolean;
  notes: number[] | undefined;
  highlight: CellHighlight;
  highlightValue: number;
  errorSignal: Position | null;
  isBot: boolean;
  onSelect: (row: number, col: number) => void;
}

const NOTE_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const HIGHLIGHT_BACKGROUND: Record<CellHighlight, string> = {
  selected: 'bg-doodle-sky ring-2 ring-inset ring-cage',
  same: 'bg-lavender/45',
  peer: 'bg-blush',
  none: 'bg-paper',
};

function borderClasses(row: number, col: number): string {
  const classes = ['border-muted/25'];
  if (col < 8) {
    classes.push(col % 3 === 2 ? 'border-r-2 border-r-ink' : 'border-r');
  }
  if (row < 8) {
    classes.push(row % 3 === 2 ? 'border-b-2 border-b-ink' : 'border-b');
  }
  return classes.join(' ');
}

function BotBadge() {
  const botRemainingMs = useGameStore((state) => state.botRemainingMs);
  const remainingMs = useLocalCountdown(botRemainingMs);
  if (remainingMs === null) {
    return null;
  }
  return (
    <span
      data-testid="bot-badge"
      className="absolute bottom-0.5 right-0.5 rounded border border-ink bg-cage px-1 font-mono text-[8px] font-bold leading-tight tabular-nums text-paper sm:text-[10px]"
    >
      {Math.ceil(remainingMs / 1000)}s
    </span>
  );
}

export const Cell = memo(function Cell({
  row,
  col,
  value,
  given,
  wrong = false,
  notes,
  highlight,
  highlightValue,
  errorSignal,
  isBot,
  onSelect,
}: CellProps) {
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (errorSignal !== null) {
      setShakeKey((key) => key + 1);
    }
  }, [errorSignal]);

  const isError = errorSignal !== null;
  const background = isError && highlight !== 'selected' ? 'bg-dusty' : HIGHLIGHT_BACKGROUND[highlight];
  const description = [
    `Row ${row + 1}, column ${col + 1}`,
    value !== 0 ? String(value) : 'empty',
    given ? 'given' : null,
    wrong ? 'wrong' : null,
    isBot ? 'bot here' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      aria-label={description}
      aria-current={highlight === 'selected' ? 'true' : undefined}
      data-row={row}
      data-col={col}
      data-highlight={highlight}
      data-error={isError}
      data-wrong={wrong}
      data-bot={isBot}
      onClick={() => onSelect(row, col)}
      className={`relative aspect-square min-w-0 select-none outline-none transition-colors duration-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cage ${background} ${borderClasses(row, col)}`}
    >
      <span
        key={shakeKey}
        className={`absolute inset-0 flex items-center justify-center ${
          shakeKey > 0 ? 'animate-shake motion-reduce:animate-none' : ''
        }`}
      >
        {value !== 0 && (
          <span
            className={`text-2xl leading-none sm:text-4xl ${
              given ? 'text-ink' : wrong ? 'text-crimson' : 'text-cage'
            }`}
          >
            {value}
          </span>
        )}
        {value === 0 && notes !== undefined && notes.length > 0 && (
          <span className="absolute inset-x-1 bottom-0.5 top-2.5 grid grid-cols-3 grid-rows-3 place-items-center text-[9px] leading-none sm:text-xs">
            {NOTE_DIGITS.map((digit) => (
              <span
                key={digit}
                className={
                  !notes.includes(digit)
                    ? 'invisible'
                    : digit === highlightValue
                      ? 'font-bold text-cage'
                      : 'text-muted'
                }
              >
                {digit}
              </span>
            ))}
          </span>
        )}
        {isBot && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0.5 rounded-md ring-2 ring-cage animate-bot-glow motion-reduce:animate-none"
            />
            <Bot
              className="absolute right-0.5 top-0.5 h-3 w-3 text-cage sm:h-4 sm:w-4"
              aria-hidden="true"
            />
            <BotBadge />
          </>
        )}
      </span>
    </button>
  );
});
