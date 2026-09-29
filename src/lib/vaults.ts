import { floor6 } from "@/lib/amount";
import type { VipTier } from "@/types/domain";

export const PROJECTION_DAYS = 30;

export const remainingCapacity = (tier: VipTier) => Math.max(0, tier.capacity - tier.filled);

export const utilizationPct = (tier: VipTier) =>
  tier.capacity > 0 ? Math.min(100, (tier.filled / tier.capacity) * 100) : 0;

/** Simple (non-compounding) reward: rewards are credited to available balance, not restaked. */
export const projectReward = (amount: number, dailyRatePct: number, days = 1) =>
  amount * (dailyRatePct / 100) * days;

/** Trial voucher can open a position only if it covers the tier minimum. */
export function isVoucherEligible(tier: VipTier, voucher: number): boolean {
  return (
    tier.isActive &&
    voucher > 0 &&
    voucher >= tier.minDeposit &&
    remainingCapacity(tier) >= tier.minDeposit
  );
}

/** Largest single position a funding source can open in this tier. */
export const maxStakeFor = (tier: VipTier, sourceBalance: number) =>
  floor6(Math.max(0, Math.min(sourceBalance, tier.maxDeposit, remainingCapacity(tier))));
