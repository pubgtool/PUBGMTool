import { BPS, ENGINE } from "@/config/protocol";
import type { Bps, LockOption, TierId, TierSchema, Usd } from "@/types/domain";

/** Launch economics for the simulation; all tier parameters live in this file. */
const FLEX: LockOption = { days: 0, label: "Flexible", bonusApyBps: 0 };
const D30: LockOption = { days: 30, label: "30 days", bonusApyBps: 50 };
const D90: LockOption = { days: 90, label: "90 days", bonusApyBps: 125 };
const D180: LockOption = { days: 180, label: "180 days", bonusApyBps: 225 };
const D365: LockOption = { days: 365, label: "365 days", bonusApyBps: 350 };

export const TIERS = [
  {
    id: "bronze",
    name: "Bronze",
    rank: 1,
    minStake: 100,
    maxStake: 5_000,
    baseApyBps: 400,
    lockOptions: [FLEX, D30, D90],
    performanceFeeBps: 1_500,
    earlyExitPenaltyBps: 500,
    accent: "#B45F2B",
    perks: [
      { id: "dashboard", label: "Yield dashboard", description: "Real-time accrual tracking." },
    ],
  },
  {
    id: "silver",
    name: "Silver",
    rank: 2,
    minStake: 5_000,
    maxStake: 25_000,
    baseApyBps: 600,
    lockOptions: [FLEX, D30, D90, D180],
    performanceFeeBps: 1_200,
    earlyExitPenaltyBps: 450,
    accent: "#8A94A6",
    perks: [
      { id: "dashboard", label: "Yield dashboard", description: "Real-time accrual tracking." },
      { id: "reports", label: "Statements", description: "Exportable monthly statements." },
    ],
  },
  {
    id: "gold",
    name: "Gold",
    rank: 3,
    minStake: 25_000,
    maxStake: 100_000,
    baseApyBps: 800,
    lockOptions: [FLEX, D30, D90, D180, D365],
    performanceFeeBps: 900,
    earlyExitPenaltyBps: 400,
    accent: "#C9A227",
    perks: [
      { id: "dashboard", label: "Yield dashboard", description: "Real-time accrual tracking." },
      { id: "reports", label: "Statements", description: "Exportable monthly statements." },
      { id: "priority", label: "Priority queue", description: "Priority unstake processing." },
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    rank: 4,
    minStake: 100_000,
    maxStake: 500_000,
    baseApyBps: 1_000,
    lockOptions: [FLEX, D30, D90, D180, D365],
    performanceFeeBps: 600,
    earlyExitPenaltyBps: 350,
    accent: "#5B7C99",
    perks: [
      { id: "dashboard", label: "Yield dashboard", description: "Real-time accrual tracking." },
      { id: "reports", label: "Statements", description: "Exportable monthly statements." },
      { id: "priority", label: "Priority queue", description: "Priority unstake processing." },
      { id: "manager", label: "Account manager", description: "Dedicated relationship manager." },
    ],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    rank: 5,
    minStake: 500_000,
    maxStake: null,
    baseApyBps: 1_250,
    lockOptions: [FLEX, D30, D90, D180, D365],
    performanceFeeBps: 300,
    earlyExitPenaltyBps: 300,
    accent: "#0F172A",
    perks: [
      { id: "dashboard", label: "Yield dashboard", description: "Real-time accrual tracking." },
      { id: "reports", label: "Statements", description: "Exportable monthly statements." },
      { id: "priority", label: "Priority queue", description: "Priority unstake processing." },
      { id: "manager", label: "Account manager", description: "Dedicated relationship manager." },
      { id: "bespoke", label: "Bespoke terms", description: "Negotiated lock and fee schedules." },
    ],
  },
] as const satisfies readonly TierSchema[];

const TIER_LIST: readonly TierSchema[] = TIERS;

/** Throws on malformed tier config: gaps, overlaps, unordered ranks, bad locks. */
export function validateTiers(tiers: readonly TierSchema[] = TIER_LIST): void {
  if (tiers.length === 0) throw new Error("Tier config is empty");
  const ids = new Set<TierId>();
  tiers.forEach((t, i) => {
    if (ids.has(t.id)) throw new Error(`Duplicate tier id: ${t.id}`);
    ids.add(t.id);
    if (t.rank !== i + 1) throw new Error(`Tier ${t.id} rank must be ${i + 1}`);
    if (t.maxStake !== null && t.maxStake <= t.minStake)
      throw new Error(`Tier ${t.id} maxStake must exceed minStake`);
    if (t.maxStake === null && i !== tiers.length - 1)
      throw new Error(`Only the last tier may be unbounded (${t.id})`);
    const prev = tiers[i - 1];
    if (prev && prev.maxStake !== t.minStake)
      throw new Error(`Tier ${t.id} must start where ${prev.id} ends`);
    if (t.lockOptions.length === 0 || t.lockOptions[0]?.days !== 0)
      throw new Error(`Tier ${t.id} must offer a flexible option first`);
    if (t.performanceFeeBps < 0 || t.performanceFeeBps > BPS)
      throw new Error(`Tier ${t.id} performance fee out of range`);
  });
  if (tiers[0] && tiers[0].minStake !== ENGINE.minStakeAmount)
    throw new Error("First tier minStake must equal ENGINE.minStakeAmount");
}

validateTiers();

export function getTier(id: TierId): TierSchema {
  const tier = TIER_LIST.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown tier: ${id}`);
  return tier;
}

/** Returns the tier for a total staked value, or null below the minimum. */
export function resolveTier(totalStaked: Usd): TierSchema | null {
  for (let i = TIER_LIST.length - 1; i >= 0; i--) {
    const t = TIER_LIST[i];
    if (t && totalStaked >= t.minStake) return t;
  }
  return null;
}

export function getNextTier(tier: TierSchema): TierSchema | null {
  return TIER_LIST.find((t) => t.rank === tier.rank + 1) ?? null;
}

export function getLockOption(tier: TierSchema, lockDays: number): LockOption {
  const opt = tier.lockOptions.find((o) => o.days === lockDays);
  if (!opt) throw new Error(`Tier ${tier.id} has no ${lockDays}-day lock`);
  return opt;
}

export function getEffectiveApyBps(tier: TierSchema, lockDays: number): Bps {
  return tier.baseApyBps + getLockOption(tier, lockDays).bonusApyBps;
}

/** Simple (non-compounding) yield accrued over an elapsed period. */
export function accrueYield(amount: Usd, apyBps: Bps, elapsedMs: number): Usd {
  const years = elapsedMs / ENGINE.msPerDay / ENGINE.daysPerYear;
  return amount * (apyBps / BPS) * years;
}

export const ALL_TIERS: readonly TierSchema[] = TIER_LIST;
