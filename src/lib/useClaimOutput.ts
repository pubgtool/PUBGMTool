"use client";

import { useCallback, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { formatAmount } from "@/lib/format";
import { useRequireAuth } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";

/**
 * Claims pending compute output. Sound and vibration come from the global distribution
 * listener, so they play once per payout on whichever screen is open.
 */
export function useClaimOutput(): { claim: () => boolean; burst: number } {
  const collectOutput = useAppStore((s) => s.collectOutput);
  const requireAuth = useRequireAuth();
  const [burst, setBurst] = useState(0);

  const claim = useCallback((): boolean => {
    if (!requireAuth("Sign in to claim your compute output")) return false;
    const result = collectOutput();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setBurst((n) => n + 1);
    toast.success(`+${formatAmount(result.amount, result.amount < 1 ? 4 : 2)} USDT Added to Balance`);
    return true;
  }, [requireAuth, collectOutput]);

  return { claim, burst };
}
