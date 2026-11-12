import { useCallback, useEffect, useState } from 'react';

/** Seconds left, counting down once a second after `restart()`; 0 means the action is available again. */
export function useCountdown(seconds: number): { left: number; restart: (to?: number) => void } {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);
  const restart = useCallback((to?: number) => setLeft(to ?? seconds), [seconds]);
  return { left, restart };
}

/** `0:24` */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The wait as words for a screen reader: `4 minutes`, `30 seconds`. */
export function spokenWait(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.max(1, totalSeconds)} ${totalSeconds === 1 ? 'second' : 'seconds'}`;
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
