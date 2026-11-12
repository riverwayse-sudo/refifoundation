"use client";

import { useEffect, useState } from "react";

/**
 * Stopwatch for a round. Counts seconds while `active` is true and holds the
 * value when the round ends, so a finished round keeps its time on screen.
 */
export function useElapsed(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return seconds;
}

/** Countdown for a round. Stops at zero and calls `onExpire` once. */
export function useCountdown(active: boolean, from: number, onExpire?: () => void): number {
  const [seconds, setSeconds] = useState(from);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          onExpire?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // onExpire is read once per round; depending on it would restart the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, from]);
  return seconds;
}
