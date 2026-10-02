import { AUTH } from "@/config/protocol";
import { MS_PER_DAY, utcDay } from "@/lib/time";
import { depositAddressFor, mockTxHash } from "@/lib/wallet";
import type { AccountSnapshot, Transaction, TransactionType, UserProfile, VaultPosition } from "@/types/domain";

const DEMO_PAYOUT = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE";
const DEMO_ID = "usr_demo";
const STAKE = 500;
const DAILY_RATE = 2.8;
const HISTORY_DAYS = 5;

const iso = (ms: number) => new Date(ms).toISOString();
const startOfUtcDay = (ms: number) => Date.parse(`${utcDay(ms)}T00:00:00.000Z`);

/** Wallet effect of each ledger type; keeps the demo balances derived rather than hand-typed. */
const CREDIT: Partial<Record<TransactionType, 1 | -1>> = {
  deposit: 1,
  earning: 1,
  bounty: 1,
  commission: 1,
  stake: -1,
  withdraw: -1,
};

/**
 * A signed-in VIP 2 account with a few days of history. The position was opened
 * at the start of a UTC day and is settled up to today's 00:00, so the ticker
 * accrues today's income live from the moment the demo is opened.
 */
export function buildDemoAccount(now: number): AccountSnapshot {
  const today = startOfUtcDay(now);
  const openedAt = today - HISTORY_DAYS * MS_PER_DAY;
  const positionId = "pos_demo_vip2";
  const network = "trc20" as const;

  let n = 0;
  const tx = (type: TransactionType, amount: number, at: number, extra: Partial<Transaction> = {}): Transaction => ({
    id: `tx_demo_${n++}`,
    type,
    amount,
    createdAt: iso(at),
    status: "COMPLETED",
    ...extra,
  });

  const dailyIncome = Math.round(STAKE * DAILY_RATE * 1e4) / 1e6;
  const ledger: Transaction[] = [
    tx("deposit", 1_000, openedAt - 3_600_000, {
      network,
      address: depositAddressFor(DEMO_ID, network),
      txHash: mockTxHash(network),
    }),
    tx("stake", STAKE, openedAt, { positionId, note: "VIP 2" }),
    ...Array.from({ length: HISTORY_DAYS }, (_, i) => {
      const dayStart = openedAt + i * MS_PER_DAY;
      return {
        ...tx("earning", dailyIncome, dayStart + 1_000, { positionId, note: "VIP 2" }),
        id: `earn_${positionId}_${utcDay(dayStart)}`,
      };
    }),
    tx("bounty", 1, openedAt + 3_600_000, { note: "Join Official Telegram VIP Channel" }),
    tx("commission", 10, today - 4 * MS_PER_DAY + 7_200_000, { note: "Tier 1 · invitee deposit 100 USDT" }),
    tx("bounty", 0.5, today - 3 * MS_PER_DAY + 32_400_000, { note: "Day 1 check-in" }),
    tx("bounty", 0.75, today - 2 * MS_PER_DAY + 32_400_000, { note: "Day 2 check-in" }),
    tx("commission", 25, today - 2 * MS_PER_DAY + 50_000_000, { note: "Tier 1 · invitee deposit 250 USDT" }),
    tx("bounty", 1, today - MS_PER_DAY + 32_400_000, { note: "Day 3 check-in" }),
    tx("withdraw", 100, today - MS_PER_DAY + 43_200_000, {
      network,
      address: DEMO_PAYOUT,
      fee: 1,
      txHash: mockTxHash(network),
      completedAt: iso(today - MS_PER_DAY + 43_500_000),
    }),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const available = ledger.reduce((sum, t) => sum + (CREDIT[t.type] ?? 0) * t.amount, 0);
  const sum = (type: TransactionType) => ledger.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0);

  const position: VaultPosition = {
    id: positionId,
    tierId: "vip-2",
    tierName: "VIP 2",
    tierLevel: 2,
    principal: STAKE,
    dailyRatePct: DAILY_RATE,
    dailyOutput: dailyIncome,
    pending: 0,
    voucherPortion: 0,
    fundedBy: "balance",
    openedAt: iso(openedAt),
    lastAccruedAt: iso(today),
    accrued: sum("earning"),
    status: "active",
  };

  const user: UserProfile = {
    id: DEMO_ID,
    email: AUTH.demo.identifier,
    phone: null,
    uid: AUTH.demo.uid,
    referralCode: AUTH.demo.referralCode,
    referredBy: null,
    displayName: AUTH.demo.displayName,
    isGuest: false,
    kycTier: 1,
    kycStatus: "VERIFIED",
    kycSubmittedAt: iso(openedAt - 2 * MS_PER_DAY + 3_600_000),
    kycSubmission: {
      tier: 1,
      country: "DE",
      documentType: "passport",
      livenessCompleted: false,
      submittedAt: iso(openedAt - 2 * MS_PER_DAY + 3_600_000),
    },
    payoutAddress: DEMO_PAYOUT,
    createdAt: iso(openedAt - 2 * MS_PER_DAY),
    security: { twoFactor: false, paymentPin: false, pushAlerts: true },
    referral: { invites: 2, commissionEarned: sum("commission") },
    rewards: {
      checkIn: { streak: 3, lastDay: utcDay(now - MS_PER_DAY), cycles: 0 },
      tasks: { telegram: { startedAt: openedAt + 3_000_000, reward: 1, claimedAt: iso(openedAt + 3_600_000) } },
      totalBounty: sum("bounty"),
    },
  };

  return {
    user,
    balances: { available, staked: STAKE, trialVoucher: 0, totalEarned: sum("earning"), dailyAccrued: 0 },
    positions: [position],
    transactions: ledger,
    dailyAccrualDay: utcDay(now),
  };
}

/** The level the demo node sits in, so the shared node count can include it once. */
export const DEMO_TIER = { id: "vip-2" } as const;
