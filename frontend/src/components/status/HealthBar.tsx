import { Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';

const HIT_ANIMATION_MS = 600;

const TONES = {
  emerald: { fill: 'bg-emerald-500', text: 'text-emerald-600' },
  amber: { fill: 'bg-amber-500', text: 'text-amber-600' },
  rose: { fill: 'bg-rose-500', text: 'text-red-700' },
} as const;

function toneFor(ratio: number): keyof typeof TONES {
  if (ratio > 0.6) {
    return 'emerald';
  }
  return ratio > 0.3 ? 'amber' : 'rose';
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
        className={`relative flex min-w-[200px] flex-1 items-center gap-3 rounded-full border-2 border-ink bg-white px-4 py-1.5 ${
          isHit ? 'animate-shake motion-reduce:animate-none' : ''
        }`}
      >
        <span className="text-lg text-red-700">Lives</span>
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
              className={`h-6 w-6 transition-colors duration-300 ${
                index < hp ? 'fill-red-700 text-ink' : 'fill-transparent text-ink-faint'
              }`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="ml-auto font-mono text-sm font-bold tabular-nums text-ink">
          {hp} / {maxHp}
        </span>
        {isHit && (
          <div
            data-testid="health-flash"
            className="pointer-events-none absolute inset-0 animate-hit-flash rounded-full bg-red-200 motion-reduce:hidden"
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
      className={`flex min-w-[220px] flex-1 items-center gap-3 rounded-full border-2 border-ink bg-white px-4 py-1.5 ${
        isHit ? 'animate-shake motion-reduce:animate-none' : ''
      }`}
    >
      <span className={`flex items-center gap-1.5 text-lg ${tone.text}`}>
        <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
        HP
      </span>
      <div
        role="progressbar"
        aria-label="Player health"
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={hp}
        className="relative h-4 flex-1 overflow-hidden rounded-full border-2 border-ink bg-blush-50"
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${tone.fill}`}
          style={{ width: `${ratio * 100}%` }}
        />
        {isHit && (
          <div
            data-testid="health-flash"
            className="absolute inset-0 animate-hit-flash bg-red-200 motion-reduce:hidden"
          />
        )}
      </div>
      <span className="font-mono text-sm font-bold tabular-nums text-ink">
        {hp} / {maxHp}
      </span>
    </div>
  );
}
