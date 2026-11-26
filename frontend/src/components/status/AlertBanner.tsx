import { TriangleAlert } from 'lucide-react';
import { TICKS_PER_SECOND, useGameStore } from '../../store/useGameStore';

export function AlertBanner() {
  const isActive = useGameStore((state) => state.isReshapeAlertActive);
  const ticksLeft = useGameStore((state) => state.reshapeAlertTicksLeft);

  if (!isActive) {
    return null;
  }

  const seconds = Math.max(1, Math.ceil(ticksLeft / TICKS_PER_SECOND));

  return (
    <div
      role="alert"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-500/25 via-rose-500/25 to-amber-500/25 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-amber-100 animate-alert-ring motion-reduce:animate-none sm:text-base"
    >
      <TriangleAlert className="h-5 w-5 shrink-0 animate-pulse text-amber-300 motion-reduce:animate-none" aria-hidden="true" />
      <p>
        WARNING: Cage layout reshaping in {seconds} {seconds === 1 ? 'second' : 'seconds'}!
      </p>
    </div>
  );
}
