import type { PromoCode, TaskId, Usd } from "@/types/domain";

/** Day 1..7 check-in rewards. Day 7 also pays a mystery bonus. */
export const CHECK_IN_REWARDS: readonly Usd[] = [0.5, 0.75, 1, 1.25, 1.5, 2, 5];
export const CHECK_IN_CYCLE = CHECK_IN_REWARDS.length;
export const MYSTERY_BONUSES: readonly Usd[] = [0.5, 1, 1.5, 2, 3];

/** The Daily Node Task pays this share of one day's plan income, with a floor. */
export const COMPUTE_BONUS_PCT = 10;
export const COMPUTE_BONUS_MIN: Usd = 0.1;

/** Swap in the official channel; the concierge handle is a stand-in. */
export const COMMUNITY = {
  telegramChannelUrl: "https://t.me/nexus_support",
} as const;

export const PROMO_RULES = {
  codePattern: /^[A-Z0-9_-]{4,24}$/,
  maxLength: 24,
  maxReward: 10_000 as Usd,
  maxClaims: 1_000_000,
} as const;

export type TaskCategory = "Daily Node Task" | "Community Mission" | "Growth Mission";

export interface TaskDef {
  id: TaskId;
  category: TaskCategory;
  title: string;
  description: string;
  /** "compute": needs an active plan, resets daily. "timed": simulated verification. "invite": tracks referrals. */
  kind: "compute" | "timed" | "invite";
  repeat: "daily" | "once";
  /** Fixed reward; the compute task is computed from the user's plans instead. */
  reward: Usd;
  /** Processing or verification time. */
  durationMs: number;
  /** Invites required (invite task). */
  target: number;
}

export const TASKS: readonly TaskDef[] = [
  {
    id: "daily-compute",
    category: "Daily Node Task",
    title: "Run Daily AI Compute Task",
    description: `Requires an active VIP plan. Earns a bonus of ${COMPUTE_BONUS_PCT}% of your daily plan income.`,
    kind: "compute",
    repeat: "daily",
    reward: COMPUTE_BONUS_MIN,
    durationMs: 3_000,
    target: 1,
  },
  {
    id: "telegram",
    category: "Community Mission",
    title: "Join Official Telegram VIP Channel",
    description: "Open the channel, then verify to unlock your bounty.",
    kind: "timed",
    repeat: "once",
    reward: 1,
    durationMs: 6_000,
    target: 1,
  },
  {
    id: "invite",
    category: "Growth Mission",
    title: "Invite 1 Institutional Node",
    description: "Share your invite link. The bounty unlocks when your first invite signs up.",
    kind: "invite",
    repeat: "once",
    reward: 5,
    durationMs: 0,
    target: 1,
  },
];

export const getTaskDef = (id: string): TaskDef | undefined => TASKS.find((t) => t.id === id);

export function seedPromoCodes(): PromoCode[] {
  return [
    { code: "LUCKY888", rewardUsdt: 8.88, maxClaims: 100, currentClaims: 0, active: true, claimedBy: [] },
    { code: "SHENZHOU2026", rewardUsdt: 18.88, maxClaims: 50, currentClaims: 0, active: true, claimedBy: [] },
  ];
}
