import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AUTH, ENGINE, PERSISTENCE, REFERRAL } from "@/config/protocol";
import { CHECK_IN_CYCLE, CHECK_IN_REWARDS, PROMO_RULES, getTaskDef, seedPromoCodes } from "@/config/rewards";
import { checkInView, computeTaskBonus, mysteryBonus, normalizeCode, taskView } from "@/lib/rewards";
import {
  clearFailures,
  hashPassword,
  lockoutRemaining,
  passwordIssue,
  recordFailure,
  verifyPassword,
  type Credential,
} from "@/lib/credentials";
import { buildDemoAccount, DEMO_TIER } from "@/lib/demo";
import { deriveNumericId, generateNumericId } from "@/lib/identity";
import { parseIdentifier, type IdentifierKind } from "@/lib/identifiers";
import { checkCode, consumeCode, issueCode } from "@/lib/passwordReset";
import { markBrowserSession } from "@/lib/session";
import { utcDay } from "@/lib/time";
import {
  MIN_DEPOSIT,
  MIN_WITHDRAWAL,
  WITHDRAWAL_FEE,
  WITHDRAWAL_SETTLE_MS,
  addressError,
  defaultNetworkFor,
  depositAddressFor,
  getNetwork,
  isValidAddress,
  mockTxHash,
  shortAddress,
} from "@/lib/wallet";
import type {
  AccountSnapshot,
  AppNotification,
  AuthTab,
  AppTab,
  FundingSource,
  KycStatus,
  Language,
  NotificationKind,
  PaymentNetwork,
  PromoCode,
  RewardsState,
  SecuritySettings,
  SessionState,
  TaskId,
  Transaction,
  TransactionType,
  UserProfile,
  Usd,
  VaultPosition,
  VipTier,
  WalletBalances,
  WalletSection,
} from "@/types/domain";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const TRIAL_VOUCHER_AMOUNT: Usd = 50;
const MAX_AMOUNT: Usd = 1_000_000_000;
/** Offline catch-up ceiling so a stale tab cannot mint unbounded yield. */
const MAX_CATCH_UP_MS = 30 * ENGINE.msPerDay;
const MAX_TRANSACTIONS = 200;
const MAX_NOTIFICATIONS = 100;
const SEED_TIME = "2026-09-29T00:00:00.000Z";
/** Sandbox invitee deposits, cycled so simulated commissions are predictable. */
const REFERRAL_SAMPLE_DEPOSITS = [100, 250, 500, 1_000] as const;

const defaultSecurity = (): SecuritySettings => ({ twoFactor: false, paymentPin: false, pushAlerts: true });
const emptyReferral = () => ({ invites: 0, commissionEarned: 0 });
const defaultRewards = (): RewardsState => ({
  checkIn: { streak: 0, lastDay: null, cycles: 0 },
  tasks: {},
  totalBounty: 0,
});

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** Result of an action that credits a bounty; `amount` is what was paid. */
export type RewardResult =
  | { ok: true; id: string; amount: number; day?: number; mystery?: number }
  | { ok: false; error: string };

export type RegisterInput = {
  identifier: string;
  /** Which tab the user chose; without it the kind is inferred from the text. */
  kind?: IdentifierKind;
  password: string;
  referralCode?: string | null;
  displayName?: string;
};

export type LoginInput = { identifier: string; password: string; remember?: boolean };

export type ResetRequestResult =
  | { ok: true; sandboxCode: string; cooldownUntil: number; expiresAt: number; reused: boolean }
  | { ok: false; error: string };

export type PromoInput = {
  code: string;
  rewardUsdt: number;
  maxClaims: number;
  expiresAt?: string | null;
};

export type TierInput = Pick<
  VipTier,
  "name" | "dailyRatePct" | "minDeposit" | "maxDeposit" | "capacity"
> &
  Partial<Pick<VipTier, "level" | "isActive">>;

export type TierPatch = Partial<Omit<VipTier, "id">>;

export type NotificationInput = {
  kind: NotificationKind;
  title: string;
  body: string;
};

export interface StoreData {
  user: UserProfile;
  balances: WalletBalances;
  /** UTC day (YYYY-MM-DD) that `balances.dailyAccrued` belongs to. */
  dailyAccrualDay: string;
  tiers: VipTier[];
  positions: VaultPosition[];
  transactions: Transaction[];
  notifications: AppNotification[];
  /** Saved per-email state so logout/login round-trips restore the wallet. */
  accounts: Record<string, AccountSnapshot>;
  activeTab: AppTab;
  activeLanguage: Language;
  hasSeenAnnouncement: boolean;
  /** Salted password hashes by account key (email or +phone). */
  credentials: Record<string, Credential>;
  session: SessionState;
  /** Invite code captured from a ?ref= link, offered at registration. */
  pendingReferral: string | null;
  /** Transient (not persisted): the global sign-in modal. */
  isAuthModalOpen: boolean;
  authModalTab: AuthTab;
  authModalReason: string | null;
  /** Gift codes shared by every account on this device. */
  promoCodes: PromoCode[];
  /** Transient navigation intent (not persisted): section the Wallet tab opens on. */
  walletSection: WalletSection;
  /** Transient navigation intent (not persisted): tier the Vaults tab highlights. */
  focusedTierId: string | null;
}

export interface StoreActions {
  login: (input: LoginInput) => Promise<ActionResult>;
  /** Creates the account, credits the trial voucher and signs in. */
  register: (input: RegisterInput) => Promise<ActionResult>;
  /** Sandbox: signs in to the preloaded VIP 2 account, creating it on first use. */
  demoLogin: () => Promise<ActionResult>;
  logout: () => void;
  /** Sandbox: no message is sent; the code is returned so it can be shown on screen. */
  requestPasswordReset: (identifier: string, now?: number) => ResetRequestResult;
  verifyResetCode: (identifier: string, code: string, now?: number) => ActionResult;
  resetPassword: (input: { identifier: string; code: string; password: string; now?: number }) => Promise<ActionResult>;
  openAuthModal: (tab?: AuthTab, reason?: string | null) => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: AuthTab) => void;
  setPendingReferral: (code: string | null) => void;
  updateKyc: () => ActionResult;
  updatePayoutAddress: (address: string) => ActionResult;
  /** Sandbox: resolves a PENDING verification. */
  reviewKyc: (decision: "VERIFIED" | "REJECTED") => ActionResult;
  setSecurityPreference: (key: keyof SecuritySettings, value: boolean) => ActionResult;
  /** Sandbox: registers a Tier 1 invite and credits its commission. */
  simulateReferral: () => ActionResult;

  deposit: (amount: number, network?: PaymentNetwork) => ActionResult;
  withdraw: (amount: number, address: string, network?: PaymentNetwork) => ActionResult;
  manualBalanceOverride: (patch: Partial<WalletBalances>) => ActionResult;

  addTier: (input: TierInput) => ActionResult;
  updateTier: (id: string, patch: TierPatch) => ActionResult;
  deleteTier: (id: string) => ActionResult;
  toggleTierStatus: (id: string) => ActionResult;

  stakeInVault: (tierId: string, amount: number, source?: FundingSource) => ActionResult;
  unstakePosition: (positionId: string) => ActionResult;
  tickYieldEngine: (now?: number) => void;

  /** One per UTC day; consecutive days build a 7-day streak. */
  checkIn: (now?: number) => RewardResult;
  startTask: (id: TaskId, now?: number) => ActionResult;
  claimTask: (id: TaskId, now?: number) => RewardResult;
  claimPromoCode: (code: string, now?: number) => RewardResult;
  /** Issues a gift code; intended for the admin matrix. */
  createPromoCode: (input: PromoInput, now?: number) => ActionResult;

  pushNotification: (input: NotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;

  setActiveTab: (tab: AppTab) => void;
  setActiveLanguage: (language: Language) => void;
  setHasSeenAnnouncement: (seen?: boolean) => void;
  setWalletSection: (section: WalletSection) => void;
  setFocusedTierId: (id: string | null) => void;
}

export type StoreState = StoreData & StoreActions;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const OK: ActionResult = { ok: true };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const okWith = (id: string): ActionResult => ({ ok: true, id });

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });

function uid(prefix: string): string {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${rand}`;
}

/** Returns a positive, finite amount rounded to 6 decimals, or null. */
function parseAmount(value: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = round6(value);
  return rounded > 0 && rounded <= MAX_AMOUNT ? rounded : null;
}

function makeTx(
  type: TransactionType,
  amount: Usd,
  extra: Partial<Omit<Transaction, "id" | "type" | "amount" | "createdAt">> = {},
): Transaction {
  return {
    id: uid("tx"),
    type,
    amount,
    createdAt: new Date().toISOString(),
    status: "COMPLETED",
    ...extra,
  };
}

function makeNotification(input: NotificationInput): AppNotification {
  return { id: uid("ntf"), createdAt: new Date().toISOString(), read: false, ...input };
}

const prependTx = (list: Transaction[], ...items: Transaction[]) =>
  [...items, ...list].slice(0, MAX_TRANSACTIONS);

const prependNotifications = (list: AppNotification[], ...items: AppNotification[]) =>
  [...items, ...list].slice(0, MAX_NOTIFICATIONS);

/** Balance, ledger, notification and lifetime-bounty changes for one credited reward. */
function bountyPatch(
  s: StoreState,
  rewards: RewardsState,
  amount: Usd,
  note: string,
  notification: NotificationInput,
): Partial<StoreState> {
  const tx = makeTx("bounty", amount, { note });
  return {
    balances: { ...s.balances, available: s.balances.available + amount },
    transactions: prependTx(s.transactions, tx),
    notifications: prependNotifications(s.notifications, makeNotification(notification)),
    user: { ...s.user, rewards: { ...rewards, totalBounty: round6(rewards.totalBounty + amount) } },
  };
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

const GUEST_USER: UserProfile = {
  id: "guest",
  email: null,
  phone: null,
  uid: "",
  referralCode: "",
  referredBy: null,
  displayName: "Guest",
  isGuest: true,
  kycStatus: "NONE",
  payoutAddress: null,
  createdAt: SEED_TIME,
  security: defaultSecurity(),
  referral: emptyReferral(),
  rewards: defaultRewards(),
};

const emptyBalances = (): WalletBalances => ({
  available: 0,
  staked: 0,
  trialVoucher: 0,
  totalEarned: 0,
  dailyAccrued: 0,
});

function seedTiers(): VipTier[] {
  const rows: Array<[string, number, number, number, number, number]> = [
    // name, daily %, min, max, capacity, filled
    ["VIP 1", 1.2, 10, 500, 500_000, 184_200],
    ["VIP 2", 1.8, 500, 2_500, 1_000_000, 412_750],
    ["VIP 3", 2.4, 2_500, 10_000, 2_000_000, 731_400],
    ["VIP 4", 3.0, 10_000, 50_000, 3_500_000, 1_206_000],
    ["VIP 5", 3.6, 50_000, 200_000, 5_000_000, 1_842_500],
    ["VIP 6", 4.2, 200_000, 1_000_000, 10_000_000, 3_120_000],
  ];
  return rows.map(([name, dailyRatePct, minDeposit, maxDeposit, capacity, filled], i) => ({
    id: `vip-${i + 1}`,
    level: i + 1,
    name,
    dailyRatePct,
    minDeposit,
    maxDeposit,
    capacity,
    filled,
    isActive: true,
  }));
}

function seedNotifications(): AppNotification[] {
  return [
    {
      id: "ntf_seed_1",
      kind: "telemetry",
      title: "Yield engine online",
      body: "Daily income accrual is running. Plans accrue every second and settle to your available balance.",
      createdAt: "2026-09-29T00:00:03.000Z",
      read: false,
    },
    {
      id: "ntf_seed_2",
      kind: "system",
      title: "Sandbox environment",
      body: "All balances and income are simulated and stored in this browser. No real assets move.",
      createdAt: "2026-09-29T00:00:02.000Z",
      read: false,
    },
    {
      id: "ntf_seed_3",
      kind: "telemetry",
      title: "Plan capacity update",
      body: "VIP 6 capacity is 31% utilised. Register to claim a 50 USDT trial voucher.",
      createdAt: "2026-09-29T00:00:01.000Z",
      read: false,
    },
  ];
}

function createInitialData(): StoreData {
  return {
    user: GUEST_USER,
    balances: emptyBalances(),
    dailyAccrualDay: utcDay(Date.parse(SEED_TIME)),
    tiers: seedTiers(),
    positions: [],
    transactions: [],
    notifications: seedNotifications(),
    accounts: {},
    activeTab: "main",
    activeLanguage: "en",
    hasSeenAnnouncement: false,
    credentials: {},
    session: { remember: true },
    pendingReferral: null,
    isAuthModalOpen: false,
    authModalTab: "login",
    authModalReason: null,
    promoCodes: seedPromoCodes(),
    walletSection: "deposit",
    focusedTierId: null,
  };
}

/* ------------------------------------------------------------------ */
/* Pure engine logic                                                   */
/* ------------------------------------------------------------------ */

type Settleable = Pick<StoreData, "balances" | "positions" | "dailyAccrualDay" | "transactions">;

/**
 * One live-updating ledger row per position per UTC day, so the history shows
 * VIP earnings without a new entry on every tick.
 */
function recordEarnings(
  list: Transaction[],
  rewards: Array<{ position: VaultPosition; reward: number }>,
  day: string,
  stamp: string,
): Transaction[] {
  if (rewards.length === 0) return list;
  const next = [...list];
  const fresh: Transaction[] = [];
  for (const { position, reward } of rewards) {
    const id = `earn_${position.id}_${day}`;
    const index = next.findIndex((t) => t.id === id);
    const existing = index >= 0 ? next[index] : undefined;
    if (existing) {
      next[index] = { ...existing, amount: existing.amount + reward };
    } else {
      fresh.push({
        id,
        type: "earning",
        amount: reward,
        positionId: position.id,
        createdAt: stamp,
        note: position.tierName,
        status: "COMPLETED",
      });
    }
  }
  return [...fresh, ...next].slice(0, MAX_TRANSACTIONS);
}

/** Completes withdrawals that have been PENDING long enough. */
function settlePending(
  list: Transaction[],
  now: number,
): { transactions: Transaction[]; completed: Transaction[] } | null {
  const completed: Transaction[] = [];
  const transactions = list.map((t) => {
    if (t.type !== "withdraw" || t.status !== "PENDING") return t;
    if (now - Date.parse(t.createdAt) < WITHDRAWAL_SETTLE_MS) return t;
    const done: Transaction = {
      ...t,
      status: "COMPLETED",
      txHash: mockTxHash(t.network ?? "trc20"),
      completedAt: new Date(now).toISOString(),
    };
    completed.push(done);
    return done;
  });
  return completed.length > 0 ? { transactions, completed } : null;
}

/**
 * Accrues yield on every active position up to `now` and credits it to the
 * available balance. Returns null when nothing changed.
 */
function settle(s: Settleable, now: number): Settleable | null {
  const day = utcDay(now);
  const stamp = new Date(now).toISOString();
  const rewards: Array<{ position: VaultPosition; reward: number }> = [];
  let earned = 0;

  const positions = s.positions.map((p) => {
    if (p.status !== "active") return p;
    const elapsed = Math.min(now - Date.parse(p.lastAccruedAt), MAX_CATCH_UP_MS);
    if (!(elapsed > 0)) return p;
    const reward = p.principal * (p.dailyRatePct / 100) * (elapsed / ENGINE.msPerDay);
    earned += reward;
    rewards.push({ position: p, reward });
    return { ...p, accrued: p.accrued + reward, lastAccruedAt: stamp };
  });

  if (earned === 0 && day === s.dailyAccrualDay) return null;

  const dailyBase = day === s.dailyAccrualDay ? s.balances.dailyAccrued : 0;
  return {
    positions,
    dailyAccrualDay: day,
    transactions: recordEarnings(s.transactions, rewards, day, stamp),
    balances: {
      ...s.balances,
      available: s.balances.available + earned,
      totalEarned: s.balances.totalEarned + earned,
      dailyAccrued: dailyBase + earned,
    },
  };
}

/** Accounts are stored under their normalised email or +phone. */
const accountKeyOf = (user: UserProfile): string | null => user.email ?? user.phone;

function snapshotAccounts(s: StoreData): StoreData["accounts"] {
  const key = accountKeyOf(s.user);
  if (s.user.isGuest || !key) return s.accounts;
  return {
    ...s.accounts,
    [key]: {
      user: s.user,
      balances: s.balances,
      positions: s.positions,
      transactions: s.transactions,
      dailyAccrualDay: s.dailyAccrualDay,
    },
  };
}

/** Looks a numeric invite code up among the accounts on this device. */
export function findReferrer(
  s: Pick<StoreData, "accounts">,
  code: string,
): { key: string; user: UserProfile } | null {
  const value = code.trim();
  if (!/^\d+$/.test(value)) return null;
  for (const [key, account] of Object.entries(s.accounts)) {
    if (account.user.referralCode === value) return { key, user: account.user };
  }
  return null;
}

function takenIds(s: Pick<StoreData, "accounts" | "user">): Set<string> {
  const taken = new Set<string>([AUTH.demo.uid, AUTH.demo.referralCode]);
  for (const user of [s.user, ...Object.values(s.accounts).map((a) => a.user)]) {
    if (user.uid) taken.add(user.uid);
    if (user.referralCode) taken.add(user.referralCode);
  }
  return taken;
}

const isReserved = (key: string) => key === AUTH.demo.identifier;

/** Patch that switches the session to a stored account; null when it does not exist. */
function enterAccount(s: StoreState, key: string, remember: boolean): Partial<StoreState> | null {
  const account = s.accounts[key];
  if (!account) return null;
  return {
    accounts: snapshotAccounts(s),
    user: account.user,
    balances: account.balances,
    positions: account.positions,
    transactions: account.transactions,
    dailyAccrualDay: account.dailyAccrualDay,
    session: { remember },
    isAuthModalOpen: false,
    authModalReason: null,
    notifications: prependNotifications(
      s.notifications,
      makeNotification({ kind: "account", title: "Signed in", body: `Welcome back, ${account.user.displayName}.` }),
    ),
  };
}

const GENERIC_LOGIN_ERROR = "Incorrect email/phone or password.";

function validateTier(tier: VipTier, others: VipTier[]): string | null {
  if (!tier.name.trim()) return "Tier name is required.";
  if (!Number.isInteger(tier.level) || tier.level < 1) return "Tier level must be a whole number ≥ 1.";
  if (others.some((t) => t.level === tier.level)) return `A tier with level ${tier.level} already exists.`;
  if (!Number.isFinite(tier.dailyRatePct) || tier.dailyRatePct <= 0 || tier.dailyRatePct > 100)
    return "Daily rate must be greater than 0% and at most 100%.";
  if (![tier.minDeposit, tier.maxDeposit, tier.capacity].every(Number.isFinite) || tier.minDeposit <= 0)
    return "Deposit limits and capacity must be positive numbers.";
  if (tier.maxDeposit < tier.minDeposit) return "Maximum deposit cannot be below the minimum.";
  if (tier.capacity < tier.minDeposit) return "Capacity cannot be below the minimum deposit.";
  if (tier.capacity < tier.filled) return `Capacity cannot be below the ${fmt(tier.filled)} USDT already invested.`;
  return null;
}

const byLevel = (a: VipTier, b: VipTier) => a.level - b.level;

const BALANCE_KEYS: Array<keyof WalletBalances> = [
  "available",
  "staked",
  "trialVoucher",
  "totalEarned",
  "dailyAccrued",
];

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const PERSISTED_KEYS = [
  "user",
  "balances",
  "dailyAccrualDay",
  "tiers",
  "positions",
  "transactions",
  "notifications",
  "accounts",
  "activeTab",
  "activeLanguage",
  "hasSeenAnnouncement",
  "credentials",
  "session",
  "pendingReferral",
  "promoCodes",
] as const satisfies ReadonlyArray<keyof StoreData>;

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      /* ---------------- Auth ---------------- */

      login: async ({ identifier, password, remember = true }) => {
        const parsed = parseIdentifier(identifier);
        if (!parsed.ok) return fail(parsed.error);
        if (!password) return fail("Enter your password.");

        const locked = lockoutRemaining(parsed.key, Date.now());
        if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 1000)}s.`);

        const before = get();
        if (accountKeyOf(before.user) === parsed.key) return OK;
        const credential = before.credentials[parsed.key];
        if (before.accounts[parsed.key] && !credential)
          return fail("This account has no password yet. Use Forgot password to set one.");

        // Unknown accounts fail the same way and count toward the lockout, so responses don't reveal which exist.
        const valid = credential ? await verifyPassword(password, credential) : false;
        if (!valid) {
          recordFailure(parsed.key, Date.now());
          return fail(GENERIC_LOGIN_ERROR);
        }
        clearFailures(parsed.key);

        const patch = enterAccount(get(), parsed.key, remember);
        if (!patch) return fail(GENERIC_LOGIN_ERROR);
        set(patch);
        if (!remember) markBrowserSession();
        get().tickYieldEngine();
        return OK;
      },

      register: async ({ identifier, kind, password, referralCode, displayName }) => {
        const parsed = parseIdentifier(identifier, kind);
        if (!parsed.ok) return fail(parsed.error);
        const issue = passwordIssue(password);
        if (issue) return fail(issue);

        const duplicate = `An account with this ${parsed.kind === "email" ? "email" : "phone number"} already exists.`;
        const s0 = get();
        if (!s0.user.isGuest) return fail("Sign out before creating another account.");
        if (isReserved(parsed.key) || s0.accounts[parsed.key]) return fail(duplicate);

        const code = referralCode?.trim() ?? "";
        if (AUTH.referralRequired && !findReferrer(s0, code)) return fail("Enter a valid referral code.");

        const credential = await hashPassword(password);

        // State may have changed while hashing.
        const s = get();
        if (!s.user.isGuest) return fail("You're already signed in.");
        if (s.accounts[parsed.key]) return fail(duplicate);
        const referrer = code ? findReferrer(s, code) : null;

        const now = Date.now();
        const taken = takenIds(s);
        const uidValue = generateNumericId(taken);
        taken.add(uidValue);
        const inviteCode = generateNumericId(taken);

        const name = displayName?.trim().slice(0, 32);
        const user: UserProfile = {
          id: uid("usr"),
          email: parsed.kind === "email" ? parsed.key : null,
          phone: parsed.kind === "phone" ? parsed.key : null,
          uid: uidValue,
          referralCode: inviteCode,
          referredBy: referrer?.user.uid ?? null,
          displayName: name || (parsed.kind === "email" ? (parsed.key.split("@")[0] ?? "Member") : `Member${parsed.key.slice(-4)}`),
          isGuest: false,
          kycStatus: "NONE",
          payoutAddress: null,
          createdAt: new Date(now).toISOString(),
          security: defaultSecurity(),
          referral: emptyReferral(),
          rewards: defaultRewards(),
        };
        const balances: WalletBalances = { ...emptyBalances(), trialVoucher: TRIAL_VOUCHER_AMOUNT };
        const transactions = [
          makeTx("voucher", TRIAL_VOUCHER_AMOUNT, { note: "Registration trial voucher" }),
        ];
        const dailyAccrualDay = utcDay(now);

        const accounts = { ...s.accounts };
        if (referrer) {
          const snapshot = accounts[referrer.key];
          if (snapshot) {
            accounts[referrer.key] = {
              ...snapshot,
              user: { ...snapshot.user, referral: { ...snapshot.user.referral, invites: snapshot.user.referral.invites + 1 } },
            };
          }
        }
        accounts[parsed.key] = { user, balances, positions: [], transactions, dailyAccrualDay };

        set({
          accounts,
          credentials: { ...s.credentials, [parsed.key]: credential },
          session: { remember: true },
          pendingReferral: null,
          isAuthModalOpen: false,
          authModalReason: null,
          user,
          balances,
          positions: [],
          transactions,
          dailyAccrualDay,
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "wallet",
              title: "Trial voucher credited",
              body: `${TRIAL_VOUCHER_AMOUNT} USDT trial voucher added. Activate it on any open VIP plan to start earning.`,
            }),
            makeNotification({
              kind: "account",
              title: "Account created",
              body: `Welcome to NEXUS, ${user.displayName}. Your UID is ${user.uid}.`,
            }),
          ),
        });
        return okWith(user.id);
      },

      demoLogin: async () => {
        const key = AUTH.demo.identifier;
        const s0 = get();
        if (accountKeyOf(s0.user) === key) return OK;
        const existing = s0.accounts[key];
        if (existing && existing.user.id !== "usr_demo") return fail("The demo account is unavailable.");

        const credential = s0.credentials[key] ?? (await hashPassword(AUTH.demo.password));
        const s = get();
        const created = !s.accounts[key];
        const base: StoreState = {
          ...s,
          credentials: { ...s.credentials, [key]: credential },
          accounts: created ? { ...s.accounts, [key]: buildDemoAccount(Date.now()) } : s.accounts,
        };
        const patch = enterAccount(base, key, true);
        if (!patch) return fail("The demo account is unavailable.");
        set({
          ...patch,
          credentials: base.credentials,
          tiers: created
            ? s.tiers.map((t) => (t.id === DEMO_TIER.id ? { ...t, filled: Math.min(t.capacity, t.filled + DEMO_TIER.filled) } : t))
            : s.tiers,
        });
        get().tickYieldEngine();
        return OK;
      },

      requestPasswordReset: (identifier, now = Date.now()) => {
        const parsed = parseIdentifier(identifier);
        if (!parsed.ok) return fail(parsed.error);
        if (!get().accounts[parsed.key]) return fail("No account found for that email or phone number.");
        const issued = issueCode(parsed.key, now);
        if (!issued.ok) return fail(issued.error);
        return {
          ok: true,
          sandboxCode: issued.code,
          cooldownUntil: issued.cooldownUntil,
          expiresAt: issued.expiresAt,
          reused: issued.reused,
        };
      },

      verifyResetCode: (identifier, code, now = Date.now()) => {
        const parsed = parseIdentifier(identifier);
        if (!parsed.ok) return fail(parsed.error);
        if (!new RegExp(`^\\d{${AUTH.otp.length}}$`).test(code)) return fail(`Enter the ${AUTH.otp.length}-digit code.`);
        const checked = checkCode(parsed.key, code, now);
        return checked.ok ? OK : fail(checked.error);
      },

      resetPassword: async ({ identifier, code, password, now = Date.now() }) => {
        const parsed = parseIdentifier(identifier);
        if (!parsed.ok) return fail(parsed.error);
        const issue = passwordIssue(password);
        if (issue) return fail(issue);
        if (!get().accounts[parsed.key]) return fail("No account found for that email or phone number.");

        const checked = checkCode(parsed.key, code, now);
        if (!checked.ok) return fail(checked.error);

        const credential = await hashPassword(password);
        const s = get();
        set({ credentials: { ...s.credentials, [parsed.key]: credential } });
        consumeCode(parsed.key);
        clearFailures(parsed.key);
        return OK;
      },

      openAuthModal: (tab = "login", reason = null) =>
        set({ isAuthModalOpen: true, authModalTab: tab, authModalReason: reason }),

      closeAuthModal: () => set({ isAuthModalOpen: false, authModalReason: null }),

      setAuthModalTab: (authModalTab) => set({ authModalTab }),

      setPendingReferral: (pendingReferral) => set({ pendingReferral }),

      logout: () => {
        const s = get();
        if (s.user.isGuest) return;
        set({
          accounts: snapshotAccounts(s),
          user: GUEST_USER,
          balances: emptyBalances(),
          positions: [],
          transactions: [],
          dailyAccrualDay: utcDay(Date.now()),
          session: { remember: true },
          activeTab: "main",
          walletSection: "deposit",
          focusedTierId: null,
          isAuthModalOpen: false,
          authModalReason: null,
        });
      },

      updateKyc: () => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to submit verification.");
        if (s.user.kycStatus === "PENDING") return fail("Verification is already under review.");
        if (s.user.kycStatus === "VERIFIED") return fail("Your identity is already verified.");
        const status: KycStatus = "PENDING";
        set({
          user: { ...s.user, kycStatus: status },
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "account",
              title: "Verification submitted",
              body: "Your KYC documents are pending review.",
            }),
          ),
        });
        return OK;
      },

      updatePayoutAddress: (address) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to set a payout address.");
        const value = address.trim();
        if (!isValidAddress(value))
          return fail("Enter a valid TRC-20 (T…) or ERC-20/BEP-20 (0x…) address.");
        set({
          user: { ...s.user, payoutAddress: value },
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "account",
              title: "Payout address updated",
              body: `Withdrawals will go to ${value.slice(0, 6)}…${value.slice(-4)}.`,
            }),
          ),
        });
        return OK;
      },

      reviewKyc: (decision) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in first.");
        if (s.user.kycStatus !== "PENDING") return fail("No verification is awaiting review.");
        const approved = decision === "VERIFIED";
        set({
          user: { ...s.user, kycStatus: decision },
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "account",
              title: approved ? "Identity verified" : "Verification rejected",
              body: approved
                ? "Your Level 1 verification was approved."
                : "We couldn't verify your documents. You can submit them again.",
            }),
          ),
        });
        return OK;
      },

      setSecurityPreference: (key, value) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to change security settings.");
        if (!(key in s.user.security)) return fail("Unknown setting.");
        if (s.user.security[key] === value) return OK;
        const label = key === "twoFactor" ? "Two-factor authentication" : key === "paymentPin" ? "Payment PIN" : null;
        set({
          user: { ...s.user, security: { ...s.user.security, [key]: value } },
          notifications: label
            ? prependNotifications(
                s.notifications,
                makeNotification({
                  kind: "account",
                  title: `${label} ${value ? "enabled" : "disabled"}`,
                  body: `${label} was turned ${value ? "on" : "off"} for your account.`,
                }),
              )
            : s.notifications,
        });
        return OK;
      },

      simulateReferral: () => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to earn referral commission.");
        const { invites, commissionEarned } = s.user.referral;
        const invitee = REFERRAL_SAMPLE_DEPOSITS[invites % REFERRAL_SAMPLE_DEPOSITS.length] ?? 100;
        const commission = round6((invitee * REFERRAL.tiers[0].ratePct) / 100);
        const tx = makeTx("commission", commission, {
          note: `Tier 1 · invitee deposit ${fmt(invitee)} USDT`,
        });
        set({
          user: {
            ...s.user,
            referral: { invites: invites + 1, commissionEarned: round6(commissionEarned + commission) },
          },
          balances: { ...s.balances, available: s.balances.available + commission },
          transactions: prependTx(s.transactions, tx),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "wallet",
              title: "Referral commission",
              body: `${fmt(commission)} USDT credited from a new Tier 1 invite.`,
            }),
          ),
        });
        return okWith(tx.id);
      },

      /* ---------------- Wallet ---------------- */

      deposit: (amount, network = "trc20") => {
        if (get().user.isGuest) return fail("Sign in to deposit.");
        const value = parseAmount(amount);
        if (value === null) return fail("Enter a valid amount.");
        if (value < MIN_DEPOSIT) return fail(`Minimum deposit is ${fmt(MIN_DEPOSIT)} USDT.`);
        const s = get();
        const label = getNetwork(network).label;
        const tx = makeTx("deposit", value, {
          network,
          address: depositAddressFor(s.user.id, network),
          txHash: mockTxHash(network),
        });
        set({
          balances: { ...s.balances, available: s.balances.available + value },
          transactions: prependTx(s.transactions, tx),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "wallet",
              title: "Deposit received",
              body: `${fmt(value)} USDT arrived via ${label} and was credited to your available balance.`,
            }),
          ),
        });
        return okWith(tx.id);
      },

      withdraw: (amount, address, network) => {
        if (get().user.isGuest) return fail("Sign in to withdraw.");
        const value = parseAmount(amount);
        if (value === null) return fail("Enter a valid amount.");
        const to = address.trim();
        const chosen = network ?? defaultNetworkFor(to);
        if (!chosen) return fail("Enter a valid TRC-20 (T…) or ERC-20/BEP-20 (0x…) address.");
        const addressProblem = addressError(to, chosen);
        if (addressProblem) return fail(addressProblem);
        if (value < MIN_WITHDRAWAL) return fail(`Minimum withdrawal is ${fmt(MIN_WITHDRAWAL)} USDT.`);

        get().tickYieldEngine();
        const s = get();
        if (value > s.balances.available)
          return fail(`Insufficient available balance (${fmt(s.balances.available)} USDT).`);

        const tx = makeTx("withdraw", value, {
          status: "PENDING",
          network: chosen,
          address: to,
          fee: WITHDRAWAL_FEE,
        });
        set({
          balances: { ...s.balances, available: s.balances.available - value },
          transactions: prependTx(s.transactions, tx),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "wallet",
              title: "Withdrawal requested",
              body: `${fmt(round6(value - WITHDRAWAL_FEE))} USDT (after the ${fmt(WITHDRAWAL_FEE)} USDT fee) is on its way to ${shortAddress(to)} via ${getNetwork(chosen).label}.`,
            }),
          ),
        });
        return okWith(tx.id);
      },

      manualBalanceOverride: (patch) => {
        const entries = Object.entries(patch) as Array<[keyof WalletBalances, number]>;
        if (entries.length === 0) return fail("Nothing to override.");
        for (const [key, value] of entries) {
          if (!BALANCE_KEYS.includes(key)) return fail(`Unknown balance field: ${String(key)}.`);
          if (!Number.isFinite(value) || value < 0 || value > MAX_AMOUNT)
            return fail(`${key} must be a number between 0 and ${fmt(MAX_AMOUNT)}.`);
        }
        const s = get();
        const next = { ...s.balances };
        for (const [key, value] of entries) next[key] = round6(value);
        set({
          balances: next,
          transactions: prependTx(
            s.transactions,
            makeTx("adjustment", next.available - s.balances.available, {
              note: `Sandbox override: ${entries.map(([k]) => k).join(", ")}`,
            }),
          ),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "system",
              title: "Sandbox balance override",
              body: `Admin override applied to: ${entries.map(([k]) => k).join(", ")}.`,
            }),
          ),
        });
        return OK;
      },

      /* ---------------- Dynamic VIP tiers ---------------- */

      addTier: (input) => {
        const s = get();
        const tier: VipTier = {
          id: uid("vip"),
          level: input.level ?? Math.max(0, ...s.tiers.map((t) => t.level)) + 1,
          name: input.name.trim(),
          dailyRatePct: input.dailyRatePct,
          minDeposit: input.minDeposit,
          maxDeposit: input.maxDeposit,
          capacity: input.capacity,
          filled: 0,
          isActive: input.isActive ?? true,
        };
        const error = validateTier(tier, s.tiers);
        if (error) return fail(error);
        set({
          tiers: [...s.tiers, tier].sort(byLevel),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "system",
              title: "VIP tier added",
              body: `${tier.name} is live at ${tier.dailyRatePct}% daily.`,
            }),
          ),
        });
        return okWith(tier.id);
      },

      updateTier: (id, patch) => {
        const s = get();
        const current = s.tiers.find((t) => t.id === id);
        if (!current) return fail("Tier not found.");
        const next: VipTier = { ...current, ...patch, id: current.id };
        next.name = next.name.trim();
        const error = validateTier(next, s.tiers.filter((t) => t.id !== id));
        if (error) return fail(error);

        const rateChanged = next.dailyRatePct !== current.dailyRatePct;
        set({
          tiers: s.tiers.map((t) => (t.id === id ? next : t)).sort(byLevel),
          // Open positions keep their snapshot; only labels follow the tier.
          positions: s.positions.map((p) =>
            p.tierId === id ? { ...p, tierName: next.name, tierLevel: next.level } : p,
          ),
          notifications: rateChanged
            ? prependNotifications(
                s.notifications,
                makeNotification({
                  kind: "telemetry",
                  title: `${next.name} rate updated`,
                  body: `Daily rate is now ${next.dailyRatePct}% (was ${current.dailyRatePct}%). Open plans keep their original rate.`,
                }),
              )
            : s.notifications,
        });
        return OK;
      },

      deleteTier: (id) => {
        const s = get();
        const tier = s.tiers.find((t) => t.id === id);
        if (!tier) return fail("Tier not found.");
        if (s.positions.some((p) => p.tierId === id && p.status === "active"))
          return fail("This tier has open plans. Deactivate it instead.");
        set({
          tiers: s.tiers.filter((t) => t.id !== id),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "system",
              title: "VIP tier removed",
              body: `${tier.name} was removed.`,
            }),
          ),
        });
        return OK;
      },

      toggleTierStatus: (id) => {
        const s = get();
        const tier = s.tiers.find((t) => t.id === id);
        if (!tier) return fail("Tier not found.");
        const isActive = !tier.isActive;
        set({
          tiers: s.tiers.map((t) => (t.id === id ? { ...t, isActive } : t)),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "telemetry",
              title: `${tier.name} ${isActive ? "opened" : "closed"}`,
              body: isActive
                ? "New investments are accepted again."
                : "New investments are paused. Existing plans keep earning.",
            }),
          ),
        });
        return OK;
      },

      /* ---------------- Staking engine ---------------- */

      stakeInVault: (tierId, amount, source = "balance") => {
        if (get().user.isGuest) return fail("Sign in to activate a VIP plan.");
        const value = parseAmount(amount);
        if (value === null) return fail("Enter a valid amount.");

        get().tickYieldEngine();
        const s = get();
        const tier = s.tiers.find((t) => t.id === tierId);
        if (!tier) return fail("VIP plan not found.");
        if (!tier.isActive) return fail(`${tier.name} is currently closed for new investments.`);
        if (value < tier.minDeposit || value > tier.maxDeposit)
          return fail(
            `${tier.name} accepts ${fmt(tier.minDeposit)}–${fmt(tier.maxDeposit)} USDT per plan.`,
          );
        const remaining = tier.capacity - tier.filled;
        if (value > remaining) return fail(`${tier.name} has only ${fmt(remaining)} USDT of capacity left.`);

        if (source === "voucher") {
          if (value > s.balances.trialVoucher)
            return fail(`Insufficient trial voucher (${fmt(s.balances.trialVoucher)} USDT).`);
        } else if (value > s.balances.available) {
          return fail(`Insufficient available balance (${fmt(s.balances.available)} USDT).`);
        }

        const stamp = new Date().toISOString();
        const position: VaultPosition = {
          id: uid("pos"),
          tierId: tier.id,
          tierName: tier.name,
          tierLevel: tier.level,
          principal: value,
          dailyRatePct: tier.dailyRatePct,
          fundedBy: source,
          openedAt: stamp,
          lastAccruedAt: stamp,
          accrued: 0,
          status: "active",
        };

        set({
          balances: {
            ...s.balances,
            available: source === "balance" ? s.balances.available - value : s.balances.available,
            trialVoucher: source === "voucher" ? s.balances.trialVoucher - value : s.balances.trialVoucher,
            staked: s.balances.staked + value,
          },
          positions: [position, ...s.positions],
          tiers: s.tiers.map((t) => (t.id === tier.id ? { ...t, filled: t.filled + value } : t)),
          transactions: prependTx(
            s.transactions,
            makeTx("stake", value, {
              positionId: position.id,
              note: `${tier.name}${source === "voucher" ? " (trial voucher)" : ""}`,
            }),
          ),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "stake",
              title: "Plan activated",
              body: `${fmt(value)} USDT invested in ${tier.name} at ${tier.dailyRatePct}% daily income.`,
            }),
          ),
        });
        return okWith(position.id);
      },

      unstakePosition: (positionId) => {
        const s = get();
        const now = Date.now();
        const base = { ...s, ...(settle(s, now) ?? {}) };
        const position = base.positions.find((p) => p.id === positionId);
        if (!position || position.status !== "active") return fail("Active plan not found.");

        const returned = position.fundedBy === "balance" ? position.principal : 0;
        set({
          dailyAccrualDay: base.dailyAccrualDay,
          balances: {
            ...base.balances,
            available: base.balances.available + returned,
            staked: Math.max(0, base.balances.staked - position.principal),
          },
          positions: base.positions.map((p) =>
            p.id === positionId ? { ...p, status: "closed", closedAt: new Date(now).toISOString() } : p,
          ),
          tiers: base.tiers.map((t) =>
            t.id === position.tierId ? { ...t, filled: Math.max(0, t.filled - position.principal) } : t,
          ),
          transactions: prependTx(
            base.transactions,
            makeTx("unstake", returned, {
              positionId,
              note:
                position.fundedBy === "voucher"
                  ? "Trial voucher principal is non-withdrawable; income kept"
                  : position.tierName,
            }),
          ),
          notifications: prependNotifications(
            base.notifications,
            makeNotification({
              kind: "stake",
              title: "Plan closed",
              body:
                position.fundedBy === "voucher"
                  ? `${position.tierName} closed. ${fmt(position.accrued)} USDT in income was kept; the voucher principal expired.`
                  : `${fmt(position.principal)} USDT returned from ${position.tierName}.`,
            }),
          ),
        });
        return OK;
      },

      tickYieldEngine: (now = Date.now()) => {
        const s = get();
        const yieldPatch = settle(s, now);
        const pending = settlePending(yieldPatch?.transactions ?? s.transactions, now);
        if (!yieldPatch && !pending) return;
        set({
          ...yieldPatch,
          ...(pending && {
            transactions: pending.transactions,
            notifications: prependNotifications(
              s.notifications,
              ...pending.completed.map((t) =>
                makeNotification({
                  kind: "wallet",
                  title: "Withdrawal completed",
                  body: `${fmt(round6(t.amount - (t.fee ?? 0)))} USDT was sent to ${shortAddress(t.address ?? "")}.`,
                }),
              ),
            ),
          }),
        });
      },

      /* ---------------- Rewards ---------------- */

      checkIn: (now = Date.now()) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to check in.");
        const { rewards } = s.user;
        const view = checkInView(rewards.checkIn, now);
        if (view.doneToday) return fail("Already checked in today. The next check-in opens at 00:00 UTC.");

        const day = view.nextDay;
        const milestone = day === CHECK_IN_CYCLE;
        const base = CHECK_IN_REWARDS[day - 1] ?? 0;
        const mystery = milestone ? mysteryBonus(s.user.id, rewards.checkIn.cycles) : 0;
        const amount = round6(base + mystery);
        const note = milestone
          ? `Day ${day} check-in + mystery bonus`
          : `Day ${day} check-in`;

        const patch = bountyPatch(
          s,
          {
            ...rewards,
            checkIn: {
              streak: day,
              lastDay: utcDay(now),
              cycles: milestone ? rewards.checkIn.cycles + 1 : rewards.checkIn.cycles,
            },
          },
          amount,
          note,
          {
            kind: "wallet",
            title: milestone ? "7-day streak complete" : "Daily check-in claimed",
            body: milestone
              ? `${fmt(amount)} USDT credited: ${fmt(base)} USDT plus a ${fmt(mystery)} USDT mystery bonus.`
              : `Day ${day}: ${fmt(amount)} USDT credited to your available balance.`,
          },
        );
        set(patch);
        return { ok: true, id: get().transactions[0]?.id ?? "", amount, day, ...(milestone && { mystery }) };
      },

      startTask: (id, now = Date.now()) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to start missions.");
        const def = getTaskDef(id);
        if (!def) return fail("Unknown mission.");
        if (def.kind === "invite") return fail("This mission completes when your first invite signs up.");

        const { rewards } = s.user;
        const hasActivePlan = s.positions.some((p) => p.status === "active");
        const view = taskView(def, rewards.tasks[id], {
          now,
          hasActivePlan,
          invites: s.user.referral.invites,
          computeReward: computeTaskBonus(s.positions),
        });
        if (view.status === "locked") return fail("Requires an active VIP plan.");
        if (view.status === "claimed") return fail("Already completed.");
        if (view.status !== "idle") return OK;

        const reward = def.kind === "compute" ? computeTaskBonus(s.positions) : def.reward;
        set({
          user: {
            ...s.user,
            rewards: {
              ...rewards,
              tasks: { ...rewards.tasks, [id]: { startedAt: now, reward, claimedAt: null } },
            },
          },
        });
        return OK;
      },

      claimTask: (id, now = Date.now()) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to claim bounties.");
        const def = getTaskDef(id);
        if (!def) return fail("Unknown mission.");

        const { rewards } = s.user;
        const progress = rewards.tasks[id];
        const view = taskView(def, progress, {
          now,
          hasActivePlan: s.positions.some((p) => p.status === "active"),
          invites: s.user.referral.invites,
          computeReward: computeTaskBonus(s.positions),
        });
        if (view.status === "claimed") return fail("Bounty already claimed.");
        if (view.status === "locked") return fail("Requires an active VIP plan.");
        if (view.status === "processing") return fail("Still processing. Try again in a moment.");
        if (view.status !== "ready") return fail("Complete the mission first.");

        const amount = round6(view.reward);
        const patch = bountyPatch(
          s,
          {
            ...rewards,
            tasks: {
              ...rewards.tasks,
              [id]: {
                startedAt: progress?.startedAt ?? null,
                reward: amount,
                claimedAt: new Date(now).toISOString(),
              },
            },
          },
          amount,
          def.title,
          {
            kind: "wallet",
            title: "Mission bounty claimed",
            body: `${fmt(amount)} USDT credited for "${def.title}".`,
          },
        );
        set(patch);
        return { ok: true, id: get().transactions[0]?.id ?? "", amount };
      },

      claimPromoCode: (raw, now = Date.now()) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to redeem gift codes.");
        const code = normalizeCode(raw);
        if (!code) return fail("Enter a gift code.");

        const promo = s.promoCodes.find((p) => p.code === code);
        if (!promo) return fail("Invalid code");
        if (!promo.active) return fail("Code is not active");
        if (promo.expiresAt && Date.parse(promo.expiresAt) <= now) return fail("Code expired");
        if (promo.claimedBy.includes(s.user.id)) return fail("Already redeemed by this UID");
        if (promo.currentClaims >= promo.maxClaims) return fail("Claim limit reached");

        const amount = round6(promo.rewardUsdt);
        const patch = bountyPatch(s, s.user.rewards, amount, `Red envelope ${promo.code}`, {
          kind: "wallet",
          title: "Red envelope opened",
          body: `${fmt(amount)} USDT credited from gift code ${promo.code}.`,
        });
        set({
          ...patch,
          promoCodes: s.promoCodes.map((p) =>
            p.code === promo.code
              ? { ...p, currentClaims: p.currentClaims + 1, claimedBy: [...p.claimedBy, s.user.id] }
              : p,
          ),
        });
        return { ok: true, id: get().transactions[0]?.id ?? "", amount };
      },

      createPromoCode: (input, now = Date.now()) => {
        const s = get();
        // Strict on purpose: never issue a code that differs from what the admin typed.
        const code = input.code.trim().toUpperCase();
        if (!PROMO_RULES.codePattern.test(code))
          return fail("Code must be 4–24 characters: letters, numbers, dashes or underscores.");
        if (s.promoCodes.some((p) => p.code === code)) return fail("A code with this name already exists.");

        const reward = round6(input.rewardUsdt);
        if (!Number.isFinite(reward) || reward <= 0 || reward > PROMO_RULES.maxReward)
          return fail(`Reward must be between 0 and ${fmt(PROMO_RULES.maxReward)} USDT.`);
        if (!Number.isInteger(input.maxClaims) || input.maxClaims < 1 || input.maxClaims > PROMO_RULES.maxClaims)
          return fail("Claim limit must be a whole number of at least 1.");

        let expiresAt: string | undefined;
        if (input.expiresAt) {
          const at = Date.parse(input.expiresAt);
          if (!Number.isFinite(at)) return fail("Enter a valid expiry date.");
          if (at <= now) return fail("Expiry must be in the future.");
          expiresAt = new Date(at).toISOString();
        }

        const promo: PromoCode = {
          code,
          rewardUsdt: reward,
          maxClaims: input.maxClaims,
          currentClaims: 0,
          active: true,
          claimedBy: [],
          ...(expiresAt && { expiresAt }),
        };
        set({ promoCodes: [promo, ...s.promoCodes] });
        return okWith(code);
      },

      /* ---------------- Notifications ---------------- */

      pushNotification: (input) =>
        set((s) => ({ notifications: prependNotifications(s.notifications, makeNotification(input)) })),

      markAsRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n)),
        })),

      markAllAsRead: () =>
        set((s) => ({
          notifications: s.notifications.some((n) => !n.read)
            ? s.notifications.map((n) => (n.read ? n : { ...n, read: true }))
            : s.notifications,
        })),

      deleteNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

      /* ---------------- UI state ---------------- */

      setActiveTab: (activeTab) => set({ activeTab }),
      setActiveLanguage: (activeLanguage) => set({ activeLanguage }),
      setHasSeenAnnouncement: (seen = true) => set({ hasSeenAnnouncement: seen }),
      setWalletSection: (walletSection) => set({ walletSection }),
      setFocusedTierId: (focusedTierId) => set({ focusedTierId }),
    }),
    {
      name: PERSISTENCE.storageKey,
      version: PERSISTENCE.version,
      storage: createJSONStorage(() => localStorage),
      // Hydrate after mount (see useStoreHydration) to avoid SSR mismatches.
      skipHydration: true,
      partialize: (s) =>
        Object.fromEntries(PERSISTED_KEYS.map((k) => [k, s[k]])) as unknown as StoreState,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        // v1 -> v2: the "terminal" tab was renamed "main".
        if (version < 2 && state.activeTab === "terminal") state.activeTab = "main";
        // v2 -> v3: every transaction gained a status.
        // Only touch keys that exist: a `undefined` here would override the defaults on merge.
        if (version < 3) {
          const withStatus = (list: unknown[]) => list.map((t) => ({ status: "COMPLETED", ...(t as object) }));
          if (Array.isArray(state.transactions)) state.transactions = withStatus(state.transactions);
          const accounts = state.accounts as Record<string, Record<string, unknown>> | undefined;
          if (accounts) {
            for (const account of Object.values(accounts)) {
              if (Array.isArray(account.transactions)) account.transactions = withStatus(account.transactions);
            }
          }
        }
        // v3 -> v4: profiles gained security preferences and referral stats.
        if (version < 4) {
          const withProfileDefaults = (user: object) => ({
            security: defaultSecurity(),
            referral: emptyReferral(),
            ...user,
          });
          if (state.user && typeof state.user === "object") state.user = withProfileDefaults(state.user);
          const accounts = state.accounts as Record<string, Record<string, unknown>> | undefined;
          if (accounts) {
            for (const account of Object.values(accounts)) {
              if (account.user && typeof account.user === "object") account.user = withProfileDefaults(account.user);
            }
          }
        }
        // v4 -> v5: profiles gained rewards state; gift codes are seeded by the defaults.
        if (version < 5) {
          const withRewards = (user: object) => ({ rewards: defaultRewards(), ...user });
          if (state.user && typeof state.user === "object") state.user = withRewards(state.user);
          const accounts = state.accounts as Record<string, Record<string, unknown>> | undefined;
          if (accounts) {
            for (const account of Object.values(accounts)) {
              if (account.user && typeof account.user === "object") account.user = withRewards(account.user);
            }
          }
        }
        // v5 -> v6: numeric account IDs and invite codes, phone sign-ups, guests hold no funds.
        if (version < 6) {
          const accounts = state.accounts as Record<string, { user?: Record<string, unknown> }> | undefined;

          const taken = new Set<string>([AUTH.demo.uid, AUTH.demo.referralCode]);
          const assigned = new Map<string, { uid: string; code: string }>();
          const withIdentity = (user: Record<string, unknown>) => {
            if (user.isGuest) return { phone: null, uid: "", referralCode: "", referredBy: null, ...user };
            const id = String(user.id);
            let entry = assigned.get(id);
            if (!entry) {
              const uidValue = deriveNumericId(`uid:${id}`, taken);
              taken.add(uidValue);
              const code = deriveNumericId(`ref:${id}`, taken);
              taken.add(code);
              entry = { uid: uidValue, code };
              assigned.set(id, entry);
            }
            return { phone: null, uid: entry.uid, referralCode: entry.code, referredBy: null, ...user };
          };
          if (state.user && typeof state.user === "object") {
            const user = state.user as Record<string, unknown>;
            state.user = withIdentity(user);
            if (user.isGuest) {
              state.balances = emptyBalances();
              state.positions = [];
              state.transactions = [];
            }
          }
          for (const account of Object.values(accounts ?? {})) {
            if (account.user) account.user = withIdentity(account.user);
          }
        }
        return state as unknown as StoreState;
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Selectors & hooks                                                   */
/* ------------------------------------------------------------------ */

export const selectTotalBalance = (s: StoreState): Usd =>
  s.balances.available + s.balances.staked + s.balances.trialVoucher;

export const selectUnreadCount = (s: StoreState): number =>
  s.notifications.reduce((n, item) => n + (item.read ? 0 : 1), 0);

/**
 * Call once near the app root. Rehydrates from localStorage after mount and
 * keeps every open tab in sync via the `storage` event. Returns true once
 * persisted state has been applied.
 */
export function useStoreHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    void useAppStore.persist.rehydrate();

    const onStorage = (event: StorageEvent) => {
      if (event.key === PERSISTENCE.storageKey) void useAppStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return hydrated;
}
