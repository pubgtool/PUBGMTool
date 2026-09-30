import type { KycTier, VipTier } from "@/types/domain";

/** Cycle boundaries are UTC days; output is distributed when one ends. */
export const CYCLE_LABEL = "00:00 UTC";
/** Below this, "Collect Compute Output" says there is nothing to collect yet. */
export const MIN_COLLECT_USDT = 0.01;
export const REALLOCATE_MAX_DAYS = 30;
export const HORIZONS = [1, 7, 30, 365] as const;
export type Horizon = (typeof HORIZONS)[number];
/** Days used for "monthly projected output". */
export const MONTH_DAYS = 30;

export const TELEMETRY = {
  /** One simulated activation per bucket. */
  bucketMs: 20_000,
  visible: 6,
} as const;

/** Shown wherever figures are projected; the app is a sandbox and nothing is guaranteed. */
export const PROJECTION_NOTE = "Simulated projection for a sandbox. Not a guarantee of future output.";

interface TierSeed {
  level: number;
  title: string;
  feeUsdt: number;
  dailyRatePct: number;
  hashrateTh: number;
  minKycTier: KycTier;
  capacity: number;
  activeNodes: number;
  fixedDailyUsdt?: number;
  durationDays?: number;
}

const SEEDS: readonly TierSeed[] = [
  { level: 0, title: "Community Node", feeUsdt: 0, dailyRatePct: 0, fixedDailyUsdt: 0.1, durationDays: 3, hashrateTh: 0.5, minKycTier: 0, capacity: 20_000, activeNodes: 12_480 },
  { level: 1, title: "Edge Compute Node", feeUsdt: 100, dailyRatePct: 2.5, hashrateTh: 5, minKycTier: 0, capacity: 12_000, activeNodes: 8_214 },
  { level: 2, title: "Growth Cluster Node", feeUsdt: 500, dailyRatePct: 2.8, hashrateTh: 28, minKycTier: 0, capacity: 6_000, activeNodes: 4_102 },
  { level: 3, title: "Advanced Data Node", feeUsdt: 1_500, dailyRatePct: 3.1, hashrateTh: 90, minKycTier: 1, capacity: 3_000, activeNodes: 1_873 },
  { level: 4, title: "Enterprise Cluster", feeUsdt: 4_000, dailyRatePct: 3.4, hashrateTh: 260, minKycTier: 1, capacity: 1_500, activeNodes: 820 },
  { level: 5, title: "Institutional High-Memory Node", feeUsdt: 10_000, dailyRatePct: 3.8, hashrateTh: 640, minKycTier: 1, capacity: 600, activeNodes: 341 },
  { level: 6, title: "Sovereign Cluster", feeUsdt: 25_000, dailyRatePct: 4.2, hashrateTh: 1_500, minKycTier: 2, capacity: 200, activeNodes: 96 },
  { level: 7, title: "Sovereign Alpha Hub", feeUsdt: 50_000, dailyRatePct: 4.6, hashrateTh: 3_200, minKycTier: 2, capacity: 80, activeNodes: 38 },
  { level: 8, title: "Apex Supercomputer Unit", feeUsdt: 100_000, dailyRatePct: 5, hashrateTh: 6_500, minKycTier: 2, capacity: 25, activeNodes: 11 },
];

export const MAX_LEVEL = SEEDS.length - 1;

export function seedTiers(): VipTier[] {
  return SEEDS.map(({ level, ...rest }) => ({
    id: `vip-${level}`,
    level,
    name: `VIP ${level}`,
    isActive: true,
    ...rest,
  }));
}
