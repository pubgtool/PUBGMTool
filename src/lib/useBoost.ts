"use client";

import { useCallback } from "react";
import { toast } from "@/components/ui/Toast";
import { FESTIVAL, boostStatus, type BoostStatus } from "@/lib/festival";
import { haptic, playChime } from "@/lib/feedback";
import { useNow, useRequireAuth } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";

/** The festival ticket's state for this account, and the one action that claims it. */
export function useBoost(): { status: BoostStatus; claim: () => boolean; bonusAmount: number } {
  const isGuest = useAppStore((s) => s.user.isGuest);
  const positions = useAppStore((s) => s.positions);
  const boost = useAppStore((s) => s.user.rewards.boost);
  const claimBoostTicket = useAppStore((s) => s.claimBoostTicket);
  const requireAuth = useRequireAuth();
  // A ticket lapses at 00:00 UTC; claiming re-checks the clock itself, so a short lag here is harmless.
  const now = useNow(15_000);

  const claim = useCallback((): boolean => {
    if (!requireAuth("Sign in to claim your boost ticket", "register")) return false;
    const result = claimBoostTicket();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    haptic([16, 40, 24]);
    playChime("collect");
    toast.success(`Boost ticket claimed · +${FESTIVAL.bonusPct}% on your first activation`);
    return true;
  }, [requireAuth, claimBoostTicket]);

  return { status: boostStatus({ isGuest, positions, boost, now }), claim, bonusAmount: boost?.bonusAmount ?? 0 };
}
