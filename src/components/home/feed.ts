import { useMemo } from "react";
import { payoutEpoch, payoutFeed, type Payout } from "@/lib/festival";
import { useLiveNow } from "@/lib/hooks";
import type { MessageKey, MessageVars } from "@/lib/i18n";

type Translate = (key: MessageKey, vars?: MessageVars) => string;

/** The simulated payout list. Empty until mounted so server and client markup match. */
export function useFeed(): { now: number | null; payouts: Payout[] } {
  const now = useLiveNow(1_000);
  const epoch = now === null ? null : payoutEpoch(now);
  const payouts = useMemo(() => (epoch === null ? [] : payoutFeed(epoch)), [epoch]);
  return { now, payouts };
}

/** Localised counterpart of relativeAge() with the same thresholds. */
export function formatAge(t: Translate, ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) return t("home.age.now");
  if (s < 60) return t("home.age.s", { n: s });
  const m = Math.floor(s / 60);
  if (m < 60) return t("home.age.m", { n: m });
  return t("home.age.h", { n: Math.floor(m / 60) });
}
