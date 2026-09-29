"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { AuthTab } from "@/types/domain";

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

/**
 * Returns a guard for guest-locked actions: true when signed in, otherwise it
 * opens the auth modal (with `reason` shown) and returns false.
 */
export function useRequireAuth(): (reason: string, tab?: AuthTab) => boolean {
  const guest = useAppStore((s) => s.user.isGuest);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  return useCallback(
    (reason, tab = "login") => {
      if (!guest) return true;
      openAuthModal(tab, reason);
      return false;
    },
    [guest, openAuthModal],
  );
}
