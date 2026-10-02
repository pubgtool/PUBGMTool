import { HORIZONS, MAX_LEVEL, MONTH_DAYS, REALLOCATE_MAX_DAYS, TELEMETRY, seedTiers, type Horizon } from "@/config/nodes";
import { fnv1a } from "@/lib/identity";
import { MS_PER_DAY } from "@/lib/time";
import type { KycTier, Usd, VaultPosition, VipTier, WalletBalances } from "@/types/domain";

export const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Tier and position accessors                                         */
/* ------------------------------------------------------------------ */

export type OutputSpec = Pick<VipTier, "feeUsdt" | "dailyRatePct" | "fixedDailyUsdt">;

export const tierDailyOutput = (t: OutputSpec): Usd => t.fixedDailyUsdt ?? round6((t.feeUsdt * t.dailyRatePct) / 100);

/** Output over the first 30 days, or over the node's whole life if that is shorter. */
export const tierMonthlyOutput = (t: OutputSpec & Pick<VipTier, "durationDays">): Usd =>
  round6(tierDailyOutput(t) * Math.min(MONTH_DAYS, t.durationDays ?? MONTH_DAYS));

export const dailyOutputOf = (p: VaultPosition): Usd => p.dailyOutput ?? (p.principal * p.dailyRatePct) / 100;
export const pendingOf = (p: VaultPosition): Usd => p.pending ?? 0;
export const voucherPortionOf = (p: VaultPosition): Usd => p.voucherPortion ?? (p.fundedBy === "voucher" ? p.principal : 0);

export const totalPending = (positions: readonly VaultPosition[]): Usd =>
  round6(positions.reduce((sum, p) => sum + pendingOf(p), 0));

/** The account's node: the highest active level, and the newest if two share one. */
export function currentNode(positions: readonly VaultPosition[]): VaultPosition | null {
  let best: VaultPosition | null = null;
  for (const p of positions) {
    if (p.status !== "active") continue;
    if (!best || p.tierLevel > best.tierLevel || (p.tierLevel === best.tierLevel && p.openedAt > best.openedAt)) best = p;
  }
  return best;
}

export const hasUsedTrial = (positions: readonly VaultPosition[]): boolean => positions.some((p) => p.tierLevel === 0);

export const isTrialTier = (t: Pick<VipTier, "fixedDailyUsdt" | "durationDays">): boolean =>
  t.fixedDailyUsdt !== undefined && t.durationDays !== undefined;

export const utilizationPct = (t: Pick<VipTier, "activeNodes" | "capacity">): number =>
  t.capacity > 0 ? Math.min(100, (t.activeNodes / t.capacity) * 100) : 0;

/* ------------------------------------------------------------------ */
/* Allocation and upgrade quotes                                       */
/* ------------------------------------------------------------------ */

export type BlockReason = "guest" | "inactive" | "sold_out" | "kyc" | "trial_used" | "same_tier" | "not_upgrade";

export interface AllocationQuote {
  kind: "activate" | "upgrade";
  tier: VipTier;
  /** Level being upgraded from. */
  fromLevel: number | null;
  fee: Usd;
  /** Already paid toward the current node; only the difference is charged. */
  credit: Usd;
  price: Usd;
  voucherApplied: Usd;
  cashDue: Usd;
  available: Usd;
  /** Extra USDT the wallet needs before this can go through. */
  shortfall: Usd;
  blocked: BlockReason | null;
  /** Level the user must reach when blocked by "kyc". */
  kycRequired: KycTier;
}

export interface QuoteInput {
  tier: VipTier;
  positions: readonly VaultPosition[];
  balances: Pick<WalletBalances, "available" | "trialVoucher">;
  kycTier: KycTier;
  isGuest: boolean;
  useVoucher: boolean;
}

/** The single source of truth for what an allocation or upgrade costs and whether it may proceed. */
export function quoteAllocation({ tier, positions, balances, kycTier, isGuest, useVoucher }: QuoteInput): AllocationQuote {
  const current = currentNode(positions);
  const credit = current ? current.principal : 0;
  const price = round6(Math.max(0, tier.feeUsdt - credit));
  const voucherApplied = useVoucher && price > 0 ? round6(Math.min(balances.trialVoucher, price)) : 0;
  const cashDue = round6(price - voucherApplied);
  const shortfall = round6(Math.max(0, cashDue - balances.available));

  let blocked: BlockReason | null = null;
  if (isGuest) blocked = "guest";
  else if (!tier.isActive) blocked = "inactive";
  else if (current && tier.level === current.tierLevel) blocked = "same_tier";
  else if (current && (tier.level < current.tierLevel || price <= 0)) blocked = "not_upgrade";
  else if (isTrialTier(tier) && hasUsedTrial(positions)) blocked = "trial_used";
  else if (tier.activeNodes >= tier.capacity) blocked = "sold_out";
  else if (kycTier < tier.minKycTier) blocked = "kyc";

  return {
    kind: current ? "upgrade" : "activate",
    tier,
    fromLevel: current ? current.tierLevel : null,
    fee: tier.feeUsdt,
    credit,
    price,
    voucherApplied,
    cashDue,
    available: balances.available,
    shortfall,
    blocked,
    kycRequired: tier.minKycTier,
  };
}

export const BLOCK_MESSAGES: Record<BlockReason, string> = {
  guest: "Sign in to allocate a node.",
  inactive: "This node is closed for new allocations.",
  sold_out: "No node slots are left at this level.",
  kyc: "Identity verification is required for this level.",
  trial_used: "The community trial has already been used on this account.",
  same_tier: "This is your current node.",
  not_upgrade: "Choose a higher level than your current node.",
};

/* ------------------------------------------------------------------ */
/* Projection                                                          */
/* ------------------------------------------------------------------ */

export interface Projection {
  total: Usd;
  /** Node value at the end when output is re-allocated into it daily. */
  endValue: Usd;
  endHashrateTh: number;
}

/**
 * Simple output over `days`, or with daily re-allocation (compounding) when
 * `reallocate` is set. The trial node has no principal to grow, and compounding
 * is capped because it diverges quickly at these rates.
 */
export function projectOutput(tier: VipTier, days: number, reallocate: boolean): Projection {
  const lifeDays = tier.durationDays ?? Infinity;
  if (!reallocate || isTrialTier(tier) || tier.feeUsdt <= 0) {
    const effective = Math.min(days, lifeDays);
    return { total: round6(tierDailyOutput(tier) * effective), endValue: tier.feeUsdt, endHashrateTh: tier.hashrateTh };
  }
  const rate = tier.dailyRatePct / 100;
  const n = Math.min(days, REALLOCATE_MAX_DAYS);
  let value = tier.feeUsdt;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const out = value * rate;
    total += out;
    value += out;
  }
  return { total: round6(total), endValue: round6(value), endHashrateTh: round6((tier.hashrateTh * value) / tier.feeUsdt) };
}

export const canReallocate = (tier: VipTier, days: number): boolean =>
  !isTrialTier(tier) && tier.feeUsdt > 0 && days <= REALLOCATE_MAX_DAYS;

export const projectionTable = (tier: VipTier, reallocate: boolean): Array<{ days: Horizon; projection: Projection | null }> =>
  HORIZONS.map((days) => ({ days, projection: reallocate && !canReallocate(tier, days) ? null : projectOutput(tier, days, reallocate) }));

/* ------------------------------------------------------------------ */
/* Cycle settlement                                                    */
/* ------------------------------------------------------------------ */

export const startOfUtcDay = (ms: number): number => Math.floor(ms / MS_PER_DAY) * MS_PER_DAY;

export interface AccrualResult {
  positions: VaultPosition[];
  /** Output distributed because a cycle ended: goes to the wallet. */
  credited: Array<{ position: VaultPosition; amount: Usd }>;
  /** Nodes that reached the end of their life during this step. */
  expired: VaultPosition[];
  changed: boolean;
}

/**
 * Advances every node to `now`. Output earned before 00:00 UTC belongs to a
 * cycle that has ended and is credited; output after it stays pending until the
 * next boundary or a manual collect. Anything pending from an earlier day is
 * credited when the day rolls over, so nothing waits forever.
 *
 * `maxCatchUpMs` bounds how far back a long-offline node is paid.
 */
export function accruePositions(
  positions: readonly VaultPosition[],
  now: number,
  dayRolled: boolean,
  maxCatchUpMs: number,
): AccrualResult {
  const boundary = startOfUtcDay(now);
  const credited: AccrualResult["credited"] = [];
  const expired: VaultPosition[] = [];
  let changed = false;

  const next = positions.map((p) => {
    let pre = 0;
    let post = 0;
    let updated = p;

    if (p.status === "active") {
      const from = Math.max(Date.parse(p.lastAccruedAt), now - maxCatchUpMs);
      const expiry = p.expiresAt ? Date.parse(p.expiresAt) : Infinity;
      const end = Math.min(now, expiry);
      const perMs = dailyOutputOf(p) / MS_PER_DAY;
      if (end > from) {
        const cut = Math.min(Math.max(boundary, from), end);
        pre = (cut - from) * perMs;
        post = (end - cut) * perMs;
      }
      const ended = now >= expiry;
      if (end > from || ended) {
        updated = {
          ...p,
          accrued: p.accrued + pre + post,
          lastAccruedAt: new Date(Math.max(end, from)).toISOString(),
          ...(ended ? { status: "closed" as const, closedAt: new Date(expiry).toISOString() } : {}),
        };
        if (ended) expired.push(updated);
        changed = true;
      }
    }

    const carried = pendingOf(p);
    const credit = pre + (dayRolled ? carried : 0);
    const pending = (dayRolled ? 0 : carried) + post;
    if (credit > 0) credited.push({ position: updated, amount: credit });
    if (pending !== carried) {
      updated = { ...updated, pending };
      changed = true;
    }
    return updated;
  });

  return { positions: next, credited, expired, changed: changed || credited.length > 0 };
}

/* ------------------------------------------------------------------ */
/* Network activity feed                                               */
/* ------------------------------------------------------------------ */

export interface TelemetryEvent {
  id: string;
  at: number;
  maskedId: string;
  level: number;
  kind: "activate" | "claim";
  /** USDT paid out; 0 for activations. */
  amount: Usd;
}

/** Relative popularity of each level; cheaper nodes appear more often. */
const WEIGHTS = [8, 22, 26, 18, 12, 8, 4, 1.5, 0.5] as const;
const WEIGHT_TOTAL = WEIGHTS.reduce((a, b) => a + b, 0);
const CLAIM_SHARE = 0.45;

function levelFor(hash: number): number {
  let roll = (hash % 10_000) / 10_000 * WEIGHT_TOTAL;
  for (let level = 0; level <= MAX_LEVEL; level++) {
    roll -= WEIGHTS[level] ?? 0;
    if (roll < 0) return level;
  }
  return 1;
}

const DAILY_BY_LEVEL: readonly Usd[] = seedTiers().map(tierDailyOutput);

/**
 * Deterministic activity for the feed: the same moment always yields the same
 * list, and it never includes a time in the future. Generated on the device.
 */
export function telemetryEvents(now: number, count: number = TELEMETRY.visible): TelemetryEvent[] {
  const events: TelemetryEvent[] = [];
  let bucket = Math.floor(now / TELEMETRY.bucketMs);
  for (let guard = 0; events.length < count && guard < count * 4; guard++, bucket--) {
    const hash = fnv1a(`telemetry:${bucket}`);
    const at = bucket * TELEMETRY.bucketMs + (hash % TELEMETRY.bucketMs);
    if (at > now) continue;
    const level = levelFor(fnv1a(`level:${bucket}`));
    const claim = fnv1a(`kind:${bucket}`) % 100 < CLAIM_SHARE * 100;
    const share = 0.35 + ((fnv1a(`amount:${bucket}`) % 1000) / 1000) * 0.65;
    events.push({
      id: `tel_${bucket}`,
      at,
      maskedId: `#${100 + (fnv1a(`node:${bucket}`) % 900)}***`,
      level,
      kind: claim ? "claim" : "activate",
      amount: claim ? round2((DAILY_BY_LEVEL[level] ?? 0) * share) : 0,
    });
  }
  return events;
}

export function relativeAge(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
