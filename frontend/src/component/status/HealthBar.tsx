import { Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';

const HIT_ANIMATION_MS = 600;

const TONES = {
  healthy: { fill: 'bg-cage', text: 'text-cage' },
  hurt: { fill: 'bg-doodle-yellow', text: 'text-ink' },
  critical: { fill: 'bg-crimson', text: 'text-crimson' },
} as const;

function toneFor(ratio: number): keyof typeof TONES {
  if (ratio > 0.6) {
    return 'healthy';
  }
  return ratio > 0.3 ? 'hurt' : 'critical';
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
        className={`relative flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 ${
          isHit ? 'animate-shake motion-reduce:animate-none' : ''
        }`}
      >
        <span className="text-lg text-ink">Lives</span>
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
              className={`h-6 w-6 transition-colors duration-300 ${
                index < hp ? 'fill-crimson text-ink' : 'fill-transparent text-muted/50'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="font-mono text-sm tabular-nums text-muted">
          {hp} / {maxHp}
        </span>
        {isHit && (
          <div
            data-testid="health-flash"
            className="pointer-events-none absolute inset-0 animate-hit-flash rounded-xl bg-dusty motion-reduce:hidden"
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
      className={`flex min-w-0 flex-1 items-center gap-3 px-1 py-1 ${
        isHit ? 'animate-shake motion-reduce:animate-none' : ''
      }`}
    >
      <span className="flex shrink-0 items-center gap-1.5 text-lg text-ink">
        <Heart className={`h-5 w-5 fill-current ${tone.text}`} aria-hidden="true" />
        HP
      </span>
      <div
        role="progressbar"
        aria-label="Player health"
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={hp}
        className="relative h-4 min-w-[6rem] flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper"
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${tone.fill}`}
          style={{ width: `${ratio * 100}%` }}
        />
        {isHit && (
          <div
            data-testid="health-flash"
            className="absolute inset-0 animate-hit-flash bg-dusty motion-reduce:hidden"
          />
        )}
      </div>
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted">
        {hp} / {maxHp}
      </span>
    </div>
  );
}
