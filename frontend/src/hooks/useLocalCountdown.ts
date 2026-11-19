import { useEffect, useState } from 'react';

export function useLocalCountdown(serverRemainingMs: number | null, intervalMs = 100): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(serverRemainingMs);

  useEffect(() => {
    setRemainingMs(serverRemainingMs);
    if (serverRemainingMs === null) {
      return undefined;
    }
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setRemainingMs(Math.max(0, serverRemainingMs - (performance.now() - startedAt)));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [serverRemainingMs, intervalMs]);

  return remainingMs;
}
