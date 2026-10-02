import { CHECK_IN_CYCLE, COMPUTE_BONUS_MIN, COMPUTE_BONUS_PCT, MYSTERY_BONUSES, PROMO_RULES, TASKS, type TaskDef } from "@/config/rewards";
import { fnv1a } from "@/lib/identity";
import { dailyOutputOf } from "@/lib/nodes";
import { MS_PER_DAY, utcDay } from "@/lib/time";
import type { CheckInState, TaskProgress, UserProfile, VaultPosition } from "@/types/domain";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Deterministic per user and cycle, so the reveal is stable across reloads. */
export function mysteryBonus(userId: string, cycle: number): number {
  const index = fnv1a(`mystery:${userId}:${cycle}`) % MYSTERY_BONUSES.length;
  return MYSTERY_BONUSES[index] ?? MYSTERY_BONUSES[0] ?? 0;
}

export interface CheckInView {
  /** Days already claimed in the cycle being shown (0..7). */
  claimed: number;
  doneToday: boolean;
  /** Day index (1..7) the next check-in will earn, or null when none applies. */
  nextDay: number;
}

/** Derives what the grid should show for a UTC moment; a missed day breaks the streak. */
export function checkInView(ci: CheckInState, now: number): CheckInView {
  const today = utcDay(now);
  const yesterday = utcDay(now - MS_PER_DAY);
  const cycleDone = ci.streak >= CHECK_IN_CYCLE;

  if (ci.lastDay !== null && ci.lastDay >= today) {
    return { claimed: ci.streak, doneToday: true, nextDay: cycleDone ? 1 : ci.streak + 1 };
  }
  if (ci.lastDay === yesterday && !cycleDone) {
    return { claimed: ci.streak, doneToday: false, nextDay: ci.streak + 1 };
  }
  return { claimed: 0, doneToday: false, nextDay: 1 };
}

/** One day of income across active plans, times the bonus share; never below the floor. */
export function computeTaskBonus(positions: readonly VaultPosition[]): number {
  const daily = positions.reduce(
    (sum, p) => (p.status === "active" ? sum + dailyOutputOf(p) : sum),
    0,
  );
  return Math.max(COMPUTE_BONUS_MIN, round2((daily * COMPUTE_BONUS_PCT) / 100));
}

export type TaskStatus = "locked" | "idle" | "processing" | "ready" | "claimed";

export interface TaskView {
  status: TaskStatus;
  /** 0..1 */
  progress: number;
  remainingMs: number;
  reward: number;
}

export interface TaskContext {
  now: number;
  hasActivePlan: boolean;
  invites: number;
  /** Reward the compute task would pay right now. */
  computeReward: number;
}

export function taskView(def: TaskDef, progress: TaskProgress | undefined, ctx: TaskContext): TaskView {
  const today = utcDay(ctx.now);
  const preview = def.kind === "compute" ? ctx.computeReward : def.reward;
  const locked = progress?.reward ?? preview;

  const claimed =
    progress?.claimedAt != null &&
    (def.repeat === "once" || utcDay(Date.parse(progress.claimedAt)) === today);
  if (claimed) return { status: "claimed", progress: 1, remainingMs: 0, reward: locked };

  if (def.kind === "invite") {
    const fraction = Math.min(1, ctx.invites / def.target);
    return { status: fraction >= 1 ? "ready" : "idle", progress: fraction, remainingMs: 0, reward: def.reward };
  }

  if (def.kind === "compute" && !ctx.hasActivePlan) {
    return { status: "locked", progress: 0, remainingMs: 0, reward: preview };
  }

  const startedAt = progress?.startedAt ?? null;
  const started = startedAt !== null && (def.repeat === "once" || utcDay(startedAt) === today);
  if (!started || startedAt === null) return { status: "idle", progress: 0, remainingMs: 0, reward: preview };

  const elapsed = ctx.now - startedAt;
  if (elapsed < def.durationMs) {
    return {
      status: "processing",
      progress: Math.max(0, elapsed / def.durationMs),
      remainingMs: def.durationMs - elapsed,
      reward: locked,
    };
  }
  return { status: "ready", progress: 1, remainingMs: 0, reward: locked };
}

export const normalizeCode = (raw: string): string =>
  raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, PROMO_RULES.maxLength);

export interface RewardsSummary {
  checkInAvailable: boolean;
  readyTasks: number;
}

export function summarizeRewards(user: UserProfile, positions: readonly VaultPosition[], now: number): RewardsSummary {
  if (user.isGuest) return { checkInAvailable: false, readyTasks: 0 };
  const ctx: TaskContext = {
    now,
    hasActivePlan: positions.some((p) => p.status === "active"),
    invites: user.referral.invites,
    computeReward: computeTaskBonus(positions),
  };
  return {
    checkInAvailable: !checkInView(user.rewards.checkIn, now).doneToday,
    readyTasks: TASKS.filter((def) => taskView(def, user.rewards.tasks[def.id], ctx).status === "ready").length,
  };
}
