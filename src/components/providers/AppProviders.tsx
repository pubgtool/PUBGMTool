"use client";

import { useEffect } from "react";
import { useAppStore, useStoreHydration } from "@/lib/store";

const TICK_INTERVAL_MS = 1_000;

/**
 * Rehydrates persisted state after mount (with cross-tab sync), then runs the
 * yield engine. Content stays hidden until hydration so users never see the
 * seed state flash before their saved state.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useStoreHydration();

  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      if (document.visibilityState === "visible") useAppStore.getState().tickYieldEngine();
    };
    tick();
    const interval = setInterval(tick, TICK_INTERVAL_MS);
    // Timers are throttled in background tabs; settle immediately on return.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [hydrated]);

  return (
    <div
      className={`w-full max-w-md transition-opacity duration-200 ${hydrated ? "opacity-100" : "opacity-0"}`}
      aria-busy={!hydrated}
    >
      {children}
    </div>
  );
}
