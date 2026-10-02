import { seedTiers } from "@/config/nodes";
import { fnv1a } from "@/lib/identity";
import { round2, tierDailyOutput } from "@/lib/nodes";
import { MS_PER_DAY, msUntilNextUtcDay, utcDay } from "@/lib/time";
import type { BoostState, Usd, VaultPosition } from "@/types/domain";

export const FESTIVAL = {
  eyebrow: "GLOBAL AIRDROP & REWARD EVENT",
  title: "VIP STAKING FESTIVAL",
  headline: "+50% FIRST ACTIVATION BONUS",
  bonusPct: 50,
  /** Largest bonus one account can receive. */
  maxBonus: 2_500,
  poolTotal: 1_000_000,
} as const;

/** A festival round is one UTC day and ends when the compute cycle settles. */
export const msUntilRoundEnd = (now: number): number => msUntilNextUtcDay(now);

export function countdownParts(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** The round's allocation fills along a fixed curve and starts over with the next round. */
export function poolAllocated(now: number): Usd {
  const f = Math.min(1, Math.max(0, 1 - msUntilNextUtcDay(now) / MS_PER_DAY));
  return Math.round(FESTIVAL.poolTotal * (0.06 + 0.904 * Math.pow(f, 0.7)));
}

/** Only nodes that cost something count; the free trial does not use up the first activation. */
export const hasPaidNode = (positions: readonly VaultPosition[]): boolean => positions.some((p) => p.tierLevel >= 1);

export type BoostStatus = "guest" | "available" | "held" | "paid" | "ineligible";

export function boostStatus(input: {
  isGuest: boolean;
  positions: readonly VaultPosition[];
  boost: BoostState | undefined;
  now: number;
}): BoostStatus {
  if (input.isGuest) return "guest";
  if (input.boost?.bonusPaid) return "paid";
  if (hasPaidNode(input.positions)) return "ineligible";
  return input.boost?.ticketDay === utcDay(input.now) ? "held" : "available";
}

/** A ticket is good for the round it was claimed in, until the bonus is paid. */
export const ticketValid = (boost: BoostState | undefined, now: number): boolean =>
  boost !== undefined && !boost.bonusPaid && boost.ticketDay === utcDay(now);

export const bonusFor = (fee: Usd): Usd => Math.min(FESTIVAL.maxBonus, round2((fee * FESTIVAL.bonusPct) / 100));

/* ------------------------------------------------------------------ */
/* Payout ticker                                                       */
/* ------------------------------------------------------------------ */

export interface Payout {
  id: string;
  address: string;
  amount: Usd;
  at: number;
  level: number;
}

const EPOCH_MS = 5 * 60_000;
const SLOT_MS = 20_000;
/** Cheaper nodes are more common, so their payouts are too. */
const WEIGHTS: readonly number[] = [0, 22, 26, 18, 12, 8, 4, 1.5, 0.5];
const WEIGHT_TOTAL = WEIGHTS.reduce((a, b) => a + b, 0);
const DAILY = seedTiers().map(tierDailyOutput);
const hex2 = (n: number) => (n & 255).toString(16).padStart(2, "0");

function levelFor(hash: number): number {
  let roll = ((hash % 10_000) / 10_000) * WEIGHT_TOTAL;
  for (let level = 0; level < WEIGHTS.length; level++) {
    roll -= WEIGHTS[level] ?? 0;
    if (roll < 0) return level;
  }
  return 1;
}

/**
 * Generated on this device from a fixed formula: the same moment always gives the same list,
 * and it only changes every few minutes so a scrolling ticker never jumps. Nothing in it is an
 * actual user or payment.
 */
export function payoutFeed(now: number, count: number = 16): Payout[] {
  const epoch = Math.floor(now / EPOCH_MS) * EPOCH_MS;
  const first = Math.floor(epoch / SLOT_MS) - 1;
  return Array.from({ length: count }, (_, i) => {
    const slot = first - i;
    const h = fnv1a(`payout:${slot}`);
    const level = levelFor(fnv1a(`plevel:${slot}`));
    const days = 1 + (fnv1a(`pdays:${slot}`) % 6);
    const fraction = 0.85 + (fnv1a(`pfrac:${slot}`) % 150) / 1000;
    return {
      id: `pay_${slot}`,
      address: `0x${hex2(h >>> 8)}…${hex2(h >>> 16)}`,
      amount: Math.max(0.01, round2((DAILY[level] ?? 1) * days * fraction)),
      at: slot * SLOT_MS + (h % SLOT_MS),
      level,
    };
  });
}

/** Changes only when the ticker's list does, so a scrolling marquee is never re-mounted mid-loop. */
export const payoutEpoch = (now: number): number => Math.floor(now / EPOCH_MS) * EPOCH_MS;
