import { Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';

const HIT_ANIMATION_MS = 600;

const TONES = {
  emerald: { fill: 'bg-emerald-500', text: 'text-emerald-300' },
  amber: { fill: 'bg-amber-500', text: 'text-amber-300' },
  rose: { fill: 'bg-rose-500', text: 'text-rose-300' },
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
        className={`sketch-panel relative w-full px-3 py-2 ${
          isHit ? 'animate-shake motion-reduce:animate-none' : ''
        }`}
      >
        <div className="mb-1 flex items-center justify-between text-sm font-semibold">
          <span className="text-crimson">Lives</span>
          <span className="font-mono tabular-nums text-ink">
            {hp} / {maxHp}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Lives remaining"
          aria-valuemin={0}
          aria-valuemax={maxHp}
          aria-valuenow={hp}
          className="flex items-center gap-1.5"
        >
          {Array.from({ length: maxHp }, (_, index) => (
            <Heart
              key={index}
              data-testid={index < hp ? 'life-full' : 'life-lost'}
              className={`h-7 w-7 transition-colors duration-300 ${
                index < hp ? 'fill-crimson text-ink' : 'fill-transparent text-ink/40 [stroke-dasharray:3_2]'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
        {isHit && (
          <div
            data-testid="health-flash"
            className="pointer-events-none absolute inset-0 animate-hit-flash rounded-xl bg-rose-300 motion-reduce:hidden"
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
      className={`sketch-panel w-full px-3 py-2 ${
        isHit ? 'animate-shake motion-reduce:animate-none' : ''
      }`}
    >
      <div className="mb-1 flex items-center justify-between text-sm font-semibold">
        <span className={`flex items-center gap-1.5 ${tone.text}`}>
          <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
          HP
        </span>
        <span className="font-mono tabular-nums text-ink">
          {hp} / {maxHp}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Player health"
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={hp}
        className="relative h-4 overflow-hidden rounded-full border-[1.5px] border-ink bg-white"
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${tone.fill}`}
          style={{ width: `${ratio * 100}%` }}
        />
        {isHit && (
          <div
            data-testid="health-flash"
            className="absolute inset-0 animate-hit-flash bg-rose-300 motion-reduce:hidden"
          />
        )}
      </div>
    </div>
  );
}
