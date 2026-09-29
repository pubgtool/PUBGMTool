"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/Toast";
import { hasBrowserSession, markBrowserSession } from "@/lib/session";
import { useAppStore, useStoreHydration } from "@/lib/store";

const TICK_INTERVAL_MS = 1_000;
const REFERRAL_PARAMS = ["ref", "invite"] as const;
const REFERRAL_PATTERN = /^\d{4,12}$/;

/**
 * Runs once per page load, after the saved state is in:
 *  - ends a session that was not remembered once the browser has been restarted
 *  - captures an invite code from the URL and opens registration for guests
 */
function useAuthBoot(hydrated: boolean) {
  const booted = useRef(false);
  useEffect(() => {
    if (!hydrated || booted.current) return;
    booted.current = true;

    const store = useAppStore.getState();
    if (!store.user.isGuest && !store.session.remember && !hasBrowserSession()) {
      store.logout();
      toast.info("You were signed out because this device wasn't remembered.");
    }
    markBrowserSession();

    const url = new URL(window.location.href);
    const param = REFERRAL_PARAMS.find((name) => url.searchParams.has(name));
    if (!param) return;
    const code = (url.searchParams.get(param) ?? "").trim();
    for (const name of REFERRAL_PARAMS) url.searchParams.delete(name);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);

    const current = useAppStore.getState();
    if (!current.user.isGuest || !REFERRAL_PATTERN.test(code)) return;
    current.setPendingReferral(code);
    current.openAuthModal("register", "You've been invited. Create an account to claim your trial voucher.");
  }, [hydrated]);
}

/**
 * Rehydrates persisted state after mount (with cross-tab sync), then runs the
 * yield engine. Content stays hidden until hydration so users never see the
 * seed state flash before their saved state.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useStoreHydration();
  useAuthBoot(hydrated);

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
