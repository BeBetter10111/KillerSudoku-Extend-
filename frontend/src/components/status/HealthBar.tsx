import { Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';

const HIT_ANIMATION_MS = 600;

const TONES = {
  healthy: { fill: 'bg-crimson', text: 'text-crimson' },
  warning: { fill: 'bg-[#E0782E]', text: 'text-[#E0782E]' },
  danger: { fill: 'bg-[#7A1016]', text: 'text-[#7A1016]' },
} as const;

function toneFor(ratio: number): keyof typeof TONES {
  if (ratio > 0.6) {
    return 'healthy';
  }
  return ratio > 0.3 ? 'warning' : 'danger';
}

export function HealthBar() {
  const hp = useGameStore((state) => state.hp);
  const maxHp = useGameStore((state) => state.maxHp);
  const mode = useGameStore((state) => state.mode);
  const [isHit, setIsHit] = useState(false);
  const previousHp = useRef(hp);

  useEffect(() => {
    let timer: number | undefined;
    if (hp < previousHp.current && maxHp > 0) {
      setIsHit(true);
      timer = window.setTimeout(() => setIsHit(false), HIT_ANIMATION_MS);
    } else {
      setIsHit(false);
    }
    previousHp.current = hp;
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [hp, maxHp]);

  if (maxHp <= 0) {
    return null;
  }

  if (mode === 'CLASSIC') {
    return (
      <div
        data-testid="health-bar"
        data-variant="lives"
        className={`relative flex items-center gap-2 rounded-full px-1 py-1 text-xs ${
          isHit ? 'animate-shake motion-reduce:animate-none' : ''
        }`}
      >
        <span className="text-muted">Lives</span>
        <div
          role="progressbar"
          aria-label="Lives remaining"
          aria-valuemin={0}
          aria-valuemax={maxHp}
          aria-valuenow={hp}
          className="flex items-center gap-1"
        >
          {Array.from({ length: maxHp }, (_, index) => (
            <Heart
              key={index}
              data-testid={index < hp ? 'life-full' : 'life-lost'}
              className={`h-5 w-5 transition-colors duration-300 ${
                index < hp ? 'fill-crimson text-ink' : 'fill-transparent text-muted/60'
              }`}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="sr-only">
          {hp} / {maxHp}
        </span>
        {isHit && (
          <div
            data-testid="health-flash"
            className="pointer-events-none absolute inset-0 animate-hit-flash rounded-full bg-dusty-rose motion-reduce:hidden"
          />
        )}
      </div>
    );
  }

  const ratio = Math.min(1, Math.max(0, hp / maxHp));
  const tone = TONES[toneFor(ratio)];

  return (
    <div
      data-testid="health-bar"
      data-variant="hp"
      className={`flex min-w-[220px] flex-1 items-center gap-2 px-1 py-1 text-xs ${
        isHit ? 'animate-shake motion-reduce:animate-none' : ''
      }`}
    >
      <span className={`flex shrink-0 items-center gap-1 ${tone.text}`}>
        <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
        <span className="text-ink">HP</span>
      </span>
      <div
        role="progressbar"
        aria-label="Player health"
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={hp}
        className="relative h-4 flex-1 overflow-hidden rounded-full border-2 border-ink bg-white p-px"
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${tone.fill}`}
          style={{ width: `${ratio * 100}%` }}
        />
        {isHit && (
          <div
            data-testid="health-flash"
            className="absolute inset-0 animate-hit-flash bg-dusty-rose motion-reduce:hidden"
          />
        )}
      </div>
      <span className="shrink-0 font-mono tabular-nums">
        {hp} / {maxHp}
      </span>
    </div>
  );
}
