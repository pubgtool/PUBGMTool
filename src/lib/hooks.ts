"use client";

import { useEffect, useState } from "react";

/**
 * Wall-clock time that re-renders every `intervalMs` (pass null to pause) and
 * immediately after the tab becomes visible again, since timers are throttled
 * in background tabs.
 */
export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (intervalMs === null) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
  return now;
}
