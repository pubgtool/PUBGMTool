import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AUTH, ENGINE, PERSISTENCE, REFERRAL, TICKETS } from "@/config/protocol";
import { DOCUMENT_TYPES, DOCUMENT_TYPES_BY_TIER, KYC, rejectionReasonsFor } from "@/config/kyc";
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
import { FESTIVAL, bonusFor, hasPaidNode, ticketValid } from "@/lib/festival";
import { canWithdraw, dailyLimitFor, getCountries, nextTier, remainingToday } from "@/lib/kyc";
import { parseIdentifier, type IdentifierKind } from "@/lib/identifiers";
import { looksLikeUsername, usernameIssue } from "@/lib/usernames";
import { checkCode, consumeCode, issueCode } from "@/lib/passwordReset";
import { markBrowserSession } from "@/lib/session";
import { isValidTotpSecret, verifyTotp } from "@/lib/totp";
import { MIN_COLLECT_USDT, seedTiers } from "@/config/nodes";
import {
  BLOCK_MESSAGES,
  accruePositions,
  currentNode,
  pendingOf,
  quoteAllocation,
  startOfUtcDay,
  tierDailyOutput,
  totalPending,
  voucherPortionOf,
  type BlockReason,
} from "@/lib/nodes";
import { MS_PER_DAY, utcDay } from "@/lib/time";
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
  KycDocumentType,
  KycSubmission,
  Language,
  NotificationKind,
  PaymentNetwork,
  PromoCode,
  RewardsState,
  SecuritySettings,
  SessionState,
  SupportTicket,
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
  /** Unique sign-in name; shown as the display name. */
  username?: string;
  /** ISO 3166-1 alpha-2 country. */
  country?: string;
};

export type KycSubmitInput = {
  /** Must be the level after the one already granted. */
  tier: 1 | 2;
  documentType: KycDocumentType;
  /** ISO alpha-2; required for level 1, carried over for level 2. */
  country?: string;
  livenessCompleted?: boolean;
};

export type TicketInput = {
  subject: string;
  message: string;
  attachments?: Array<{ name: string; size: number }>;
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

export type TierInput = Pick<VipTier, "title" | "feeUsdt" | "dailyRatePct" | "hashrateTh" | "minKycTier" | "capacity"> &
  Partial<Pick<VipTier, "level" | "name" | "isActive" | "durationDays" | "fixedDailyUsdt" | "activeNodes">>;

export type TierPatch = Partial<Omit<VipTier, "id">>;

export type NodeOptions = { useVoucher?: boolean };

export type AllocationResult =
  | { ok: true; id: string; kind: "activate" | "upgrade"; level: number; charged: number; bonus?: number }
  | { ok: false; error: string; reason?: BlockReason | "funds"; shortfall?: number };

export type CollectResult = { ok: true; amount: number } | { ok: false; error: string };

/** Emitted whenever output reaches the wallet, so any open screen can celebrate it. */
export interface DistributionEvent {
  id: number;
  amount: number;
  source: "auto" | "manual";
}

export type NotificationInput = {
  kind: NotificationKind;
  title: string;
  body: string;
};

/** Local stand-ins for server-side secrets: a salted hash and a random key, never shown again after setup. */
export interface AccountSecrets {
  pin?: Credential;
  totp?: string;
}

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
  /** Where a sub-screen (settings, team, about, promotions) returns to. Not persisted. */
  backTab: AppTab | null;
  activeLanguage: Language;
  hasSeenAnnouncement: boolean;
  /** True once the welcome gateway has been shown or skipped on this device. */
  hasSeenWelcome: boolean;
  /** Salted password hashes by account key (email or +phone). */
  credentials: Record<string, Credential>;
  /** Per-account transaction-password hash and authenticator key, keyed like `credentials`. */
  secrets: Record<string, AccountSecrets>;
  session: SessionState;
  /** Invite code captured from a ?ref= link, offered at registration. */
  pendingReferral: string | null;
  /** Transient (not persisted): the global sign-in modal. */
  isAuthModalOpen: boolean;
  /** Transient (not persisted): the KYC center. */
  isKycModalOpen: boolean;
  /** Transient (not persisted): the latest distribution, for celebration UI. */
  distribution: DistributionEvent | null;
  authModalTab: AuthTab;
  authModalReason: string | null;
  /** Gift codes shared by every account on this device. */
  promoCodes: PromoCode[];
  /** Support requests raised on this device. */
  tickets: SupportTicket[];
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
  /** Sends a verification request for review; the review itself is simulated. */
  submitKyc: (input: KycSubmitInput, now?: number) => ActionResult;
  /** Sandbox: resolves a PENDING verification. A rejection carries its reason. */
  reviewKyc: (decision: "VERIFIED" | "REJECTED", reason?: string) => ActionResult;
  /** Opens the KYC center; guests are sent to sign in first. */
  openKycModal: () => void;
  closeKycModal: () => void;
  updatePayoutAddress: (address: string) => ActionResult;
  /** Only the notification preference is a plain switch; the rest are set up in Account Security. */
  setSecurityPreference: (key: keyof SecuritySettings, value: boolean) => ActionResult;
  /** Verifies the current password, then replaces it. */
  changePassword: (input: { current: string; next: string }) => Promise<ActionResult>;
  /** Sets or changes the 6-digit transaction password asked at withdrawal. Needs the login password. */
  setPaymentPassword: (input: { loginPassword: string; next: string; current?: string }) => Promise<ActionResult>;
  removePaymentPassword: (input: { loginPassword: string; current: string }) => Promise<ActionResult>;
  /** Resolves OK when no transaction password is set. */
  verifyPaymentPassword: (pin: string) => Promise<ActionResult>;
  /** Turns authenticator two-factor on once the app's current code matches `secret`. */
  enableTwoFactor: (input: { secret: string; code: string }) => Promise<ActionResult>;
  disableTwoFactor: (input: { code: string; loginPassword: string }) => Promise<ActionResult>;
  /** Resolves OK when two-factor is off. */
  verifyTwoFactor: (code: string) => Promise<ActionResult>;
  /** Sandbox: no email is sent; the code is returned so it can be shown on screen. */
  requestEmailChange: (newEmail: string, now?: number) => ResetRequestResult;
  confirmEmailChange: (input: { newEmail: string; code: string; loginPassword: string; now?: number }) => Promise<ActionResult>;
  /** Sandbox: registers a Tier 1 invite and credits its commission. */
  simulateReferral: () => ActionResult;

  deposit: (amount: number, network?: PaymentNetwork) => ActionResult;
  withdraw: (amount: number, address: string, network?: PaymentNetwork) => ActionResult;
  manualBalanceOverride: (patch: Partial<WalletBalances>) => ActionResult;

  addTier: (input: TierInput) => ActionResult;
  updateTier: (id: string, patch: TierPatch) => ActionResult;
  deleteTier: (id: string) => ActionResult;
  toggleTierStatus: (id: string) => ActionResult;

  /** Allocates a node, or upgrades the current one paying only the difference. */
  allocateNode: (tierId: string, options?: NodeOptions, now?: number) => AllocationResult;
  /** Moves the pending compute output into the wallet. */
  collectOutput: (now?: number) => CollectResult;
  unstakePosition: (positionId: string) => ActionResult;
  tickYieldEngine: (now?: number) => void;

  /** One per UTC day; consecutive days build a 7-day streak. */
  checkIn: (now?: number) => RewardResult;
  startTask: (id: TaskId, now?: number) => ActionResult;
  claimTask: (id: TaskId, now?: number) => RewardResult;
  claimPromoCode: (code: string, now?: number) => RewardResult;
  /** Issues a gift code; intended for the admin matrix. */
  createPromoCode: (input: PromoInput, now?: number) => ActionResult;
  /** Festival ticket: valid for one UTC round, pays +50% on the first paid activation. */
  claimBoostTicket: (now?: number) => ActionResult;

  createTicket: (input: TicketInput) => ActionResult;
  pushNotification: (input: NotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;

  setActiveTab: (tab: AppTab) => void;
  setActiveLanguage: (language: Language) => void;
  setHasSeenAnnouncement: (seen?: boolean) => void;
  setHasSeenWelcome: (seen?: boolean) => void;
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
  kycTier: 0,
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

/** Onboarding alerts every device starts with. Fixed times keep server and client renders identical. */
function seedNotifications(): AppNotification[] {
  const seed = (id: string, kind: NotificationKind, title: string, body: string, minute: number): AppNotification => ({
    id: `ntf_seed_${id}`,
    kind,
    title,
    body,
    createdAt: `2026-09-29T00:${String(minute).padStart(2, "0")}:00.000Z`,
    read: false,
  });
  return [
    seed("welcome", "system", "Welcome to NEXUS", "Your VIP compute dashboard is ready. Explore the node tiers and start producing daily output.", 50),
    seed("checkin", "wallet", "Daily check-in is open", "Check in every day to build a streak. Day 7 pays 5.00 USDT plus a mystery reward.", 40),
    seed("voucher", "wallet", "50.00 USDT trial voucher", "New accounts receive a 50.00 USDT trial voucher to put toward a first compute node.", 30),
    seed("security", "account", "Secure your account", "Turn on two-factor authentication and verify your identity to unlock higher withdrawal limits.", 20),
    seed("gift", "wallet", "Red envelope codes", "Redeem gift codes in Tasks & Rewards for an instant USDT bonus.", 10),
    seed("networks", "system", "Supported networks", "Deposits and withdrawals support USDT on the TRC20, ERC20, TON and BEP20 networks.", 0),
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
    backTab: null,
    activeLanguage: "en",
    hasSeenAnnouncement: false,
    hasSeenWelcome: false,
    credentials: {},
    secrets: {},
    session: { remember: true },
    pendingReferral: null,
    isAuthModalOpen: false,
    isKycModalOpen: false,
    distribution: null,
    authModalTab: "login",
    authModalReason: null,
    promoCodes: seedPromoCodes(),
    tickets: [],
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

interface SettleOutcome {
  patch: Settleable;
  /** Output that reached the wallet because a cycle ended. */
  credited: number;
  expired: VaultPosition[];
}

/**
 * Advances every node to `now`. Output from a finished UTC cycle is credited to
 * the wallet; today's stays pending until 00:00 UTC or a manual collect.
 * Returns null when nothing changed.
 */
function settle(s: Settleable, now: number): SettleOutcome | null {
  const day = utcDay(now);
  const dayRolled = day !== s.dailyAccrualDay;
  const result = accruePositions(s.positions, now, dayRolled, MAX_CATCH_UP_MS);
  if (!result.changed && !dayRolled) return null;

  const credited = result.credited.reduce((sum, c) => sum + c.amount, 0);
  const boundary = startOfUtcDay(now);
  const transactions = recordEarnings(
    s.transactions,
    result.credited.map((c) => ({ position: c.position, reward: c.amount })),
    utcDay(boundary - 1),
    new Date(boundary).toISOString(),
  );
  return {
    credited,
    expired: result.expired,
    patch: {
      positions: result.positions,
      dailyAccrualDay: day,
      transactions,
      balances: {
        ...s.balances,
        available: s.balances.available + credited,
        totalEarned: s.balances.totalEarned + credited,
        dailyAccrued: dayRolled ? 0 : s.balances.dailyAccrued,
      },
    },
  };
}

let distributionSeq = 0;
const nextDistribution = (amount: number, source: DistributionEvent["source"]): DistributionEvent => ({
  id: ++distributionSeq,
  amount,
  source,
});

/** Moves pending output (optionally only one node's) into the wallet, today's cycle. */
function collectPending(
  s: Pick<StoreData, "balances" | "positions" | "transactions">,
  now: number,
  onlyId?: string,
): { patch: Pick<StoreData, "balances" | "positions" | "transactions">; amount: number } {
  const rows: Array<{ position: VaultPosition; reward: number }> = [];
  let amount = 0;
  const positions = s.positions.map((p) => {
    const pending = pendingOf(p);
    if (pending <= 0 || (onlyId && p.id !== onlyId)) return p;
    amount += pending;
    rows.push({ position: p, reward: pending });
    return { ...p, pending: 0 };
  });
  return {
    amount,
    patch: {
      positions,
      transactions: recordEarnings(s.transactions, rows, utcDay(now), new Date(now).toISOString()),
      balances: {
        ...s.balances,
        available: s.balances.available + amount,
        totalEarned: s.balances.totalEarned + amount,
        dailyAccrued: s.balances.dailyAccrued + amount,
      },
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
    hasSeenWelcome: true,
    isAuthModalOpen: false,
    authModalReason: null,
    notifications: prependNotifications(
      s.notifications,
      makeNotification({ kind: "account", title: "Signed in", body: `Welcome back, ${account.user.displayName}.` }),
    ),
  };
}

function withoutRejection(user: UserProfile): UserProfile {
  const next = { ...user };
  delete next.kycRejectionReason;
  return next;
}

const GENERIC_LOGIN_ERROR = "Incorrect username, email or password.";
const USERNAME_TAKEN = "That username is taken.";

function accountKeyByUsername(s: Pick<StoreData, "user" | "accounts">, name: string): string | null {
  const wanted = name.trim().toLowerCase();
  if (s.user.username?.toLowerCase() === wanted) return accountKeyOf(s.user);
  for (const [key, snapshot] of Object.entries(s.accounts)) {
    if (snapshot.user.username?.toLowerCase() === wanted) return key;
  }
  return null;
}

/** Email or phone as before, or a username. Unknown names get a synthetic key so they fail (and lock out) like unknown accounts. */
function resolveLoginKey(s: Pick<StoreData, "user" | "accounts">, raw: string): { ok: true; key: string } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Enter your username or email." };
  if (looksLikeUsername(text) && !/^\+?\d{8,15}$/.test(text)) return { ok: true, key: accountKeyByUsername(s, text) ?? `username:${text.toLowerCase()}` };
  const parsed = parseIdentifier(text);
  return parsed.ok ? { ok: true, key: parsed.key } : { ok: false, error: parsed.error };
}

/** Re-checks the signed-in account's login password; shares the sign-in lockout. */
async function checkLoginPassword(s: StoreState, password: string): Promise<ActionResult> {
  const key = accountKeyOf(s.user);
  const credential = key ? s.credentials[key] : undefined;
  if (!key || !credential) return fail("This account has no password yet. Use Forgot password to set one.");
  if (!password) return fail("Enter your login password.");
  const locked = lockoutRemaining(key, Date.now());
  if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 1000)}s.`);
  if (!(await verifyPassword(password, credential))) {
    recordFailure(key, Date.now());
    return fail("Login password is incorrect.");
  }
  clearFailures(key);
  return OK;
}

/** Six digits, and not a repeat or a straight run. */
function pinIssue(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return "Use exactly 6 digits.";
  if (/^(\d)\1{5}$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) return "Avoid repeated digits and simple sequences.";
  return null;
}

function withoutKey<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

function moveKey<T>(record: Record<string, T>, from: string, to: string): Record<string, T> {
  const { [from]: moved, ...rest } = record;
  return moved === undefined ? rest : { ...rest, [to]: moved };
}

function validateTier(tier: VipTier, others: VipTier[]): string | null {
  if (!tier.name.trim()) return "Tier name is required.";
  if (!tier.title.trim()) return "Tier title is required.";
  if (!Number.isInteger(tier.level) || tier.level < 0) return "Tier level must be a whole number ≥ 0.";
  if (others.some((t) => t.level === tier.level)) return `A tier with level ${tier.level} already exists.`;
  if (!Number.isFinite(tier.feeUsdt) || tier.feeUsdt < 0) return "Allocation fee can't be negative.";
  if (!Number.isFinite(tier.dailyRatePct) || tier.dailyRatePct < 0 || tier.dailyRatePct > 100)
    return "Daily distribution must be between 0% and 100%.";
  if (tier.fixedDailyUsdt === undefined && tier.feeUsdt > 0 && tier.dailyRatePct <= 0)
    return "A paid node needs a daily distribution above 0%.";
  if (tier.fixedDailyUsdt !== undefined && !(tier.fixedDailyUsdt > 0)) return "Fixed daily output must be above 0.";
  if (tier.durationDays !== undefined && (!Number.isInteger(tier.durationDays) || tier.durationDays < 1))
    return "Duration must be a whole number of days.";
  if (!Number.isFinite(tier.hashrateTh) || tier.hashrateTh < 0) return "Capacity can't be negative.";
  if (![0, 1, 2].includes(tier.minKycTier)) return "Minimum verification level must be 0, 1 or 2.";
  if (!Number.isInteger(tier.capacity) || tier.capacity < 1) return "Node slots must be a whole number ≥ 1.";
  if (tier.capacity < tier.activeNodes) return `Node slots can't be below the ${fmt(tier.activeNodes)} nodes already active.`;
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
  "hasSeenWelcome",
  "credentials",
  "secrets",
  "session",
  "pendingReferral",
  "promoCodes",
  "tickets",
] as const satisfies ReadonlyArray<keyof StoreData>;

const SUB_TABS: readonly AppTab[] = ["settings", "team", "about", "promos", "invite", "security", "language"];

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      /* ---------------- Auth ---------------- */

      login: async ({ identifier, password, remember = true }) => {
        const resolved = resolveLoginKey(get(), identifier);
        if (!resolved.ok) return fail(resolved.error);
        const loginKey = resolved.key;
        if (!password) return fail("Enter your password.");

        const locked = lockoutRemaining(loginKey, Date.now());
        if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 1000)}s.`);

        const before = get();
        if (accountKeyOf(before.user) === loginKey) return OK;
        const credential = before.credentials[loginKey];
        if (before.accounts[loginKey] && !credential)
          return fail("This account has no password yet. Use Forgot password to set one.");

        // Unknown accounts fail the same way and count toward the lockout, so responses don't reveal which exist.
        const valid = credential ? await verifyPassword(password, credential) : false;
        if (!valid) {
          recordFailure(loginKey, Date.now());
          return fail(GENERIC_LOGIN_ERROR);
        }
        clearFailures(loginKey);

        const patch = enterAccount(get(), loginKey, remember);
        if (!patch) return fail(GENERIC_LOGIN_ERROR);
        set(patch);
        if (!remember) markBrowserSession();
        get().tickYieldEngine();
        return OK;
      },

      register: async ({ identifier, kind, password, referralCode, displayName, username, country }) => {
        const parsed = parseIdentifier(identifier, kind);
        if (!parsed.ok) return fail(parsed.error);
        const issue = passwordIssue(password);
        if (issue) return fail(issue);
        const handle = username?.trim() || undefined;
        if (handle) {
          const nameIssue = usernameIssue(handle);
          if (nameIssue) return fail(nameIssue);
        }

        const duplicate = `An account with this ${parsed.kind === "email" ? "email" : "phone number"} already exists.`;
        const s0 = get();
        if (!s0.user.isGuest) return fail("Sign out before creating another account.");
        if (isReserved(parsed.key) || s0.accounts[parsed.key]) return fail(duplicate);
        if (handle && accountKeyByUsername(s0, handle)) return fail(USERNAME_TAKEN);

        const code = referralCode?.trim() ?? "";
        if (AUTH.referralRequired && !findReferrer(s0, code)) return fail("Enter a valid referral code.");

        const credential = await hashPassword(password);

        // State may have changed while hashing.
        const s = get();
        if (!s.user.isGuest) return fail("You're already signed in.");
        if (s.accounts[parsed.key]) return fail(duplicate);
        if (handle && accountKeyByUsername(s, handle)) return fail(USERNAME_TAKEN);
        const referrer = code ? findReferrer(s, code) : null;

        const now = Date.now();
        const taken = takenIds(s);
        const uidValue = generateNumericId(taken);
        taken.add(uidValue);
        const inviteCode = generateNumericId(taken);

        const name = displayName?.trim().slice(0, 32);
        const countryCode = country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : undefined;
        const user: UserProfile = {
          id: uid("usr"),
          email: parsed.kind === "email" ? parsed.key : null,
          phone: parsed.kind === "phone" ? parsed.key : null,
          uid: uidValue,
          referralCode: inviteCode,
          referredBy: referrer?.user.uid ?? null,
          displayName: name || handle || (parsed.kind === "email" ? (parsed.key.split("@")[0] ?? "Member") : `Member${parsed.key.slice(-4)}`),
          ...(handle ? { username: handle } : {}),
          ...(countryCode ? { country: countryCode } : {}),
          isGuest: false,
          kycTier: 0,
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
          hasSeenWelcome: true,
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
            ? s.tiers.map((t) => (t.id === DEMO_TIER.id ? { ...t, activeNodes: Math.min(t.capacity, t.activeNodes + 1) } : t))
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

      changePassword: async ({ current, next }) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to change your password.");
        const key = accountKeyOf(s.user);
        const checked = await checkLoginPassword(s, current);
        if (!checked.ok) return fail(checked.error === "Login password is incorrect." ? "Current password is incorrect." : checked.error);
        const issue = passwordIssue(next);
        if (issue) return fail(issue);
        if (next === current) return fail("Choose a different password from the current one.");
        const credential = await hashPassword(next);
        const s2 = get();
        if (!key || accountKeyOf(s2.user) !== key) return fail("Your session changed. Sign in again.");
        set({
          credentials: { ...s2.credentials, [key]: credential },
          notifications: prependNotifications(
            s2.notifications,
            makeNotification({ kind: "account", title: "Password changed", body: "Your login password was updated." }),
          ),
        });
        return OK;
      },

      setPaymentPassword: async ({ loginPassword, next, current }) => {
        const s = get();
        const key = accountKeyOf(s.user);
        if (s.user.isGuest || !key) return fail("Sign in to set a transaction password.");
        const problem = pinIssue(next);
        if (problem) return fail(problem);
        const checked = await checkLoginPassword(s, loginPassword);
        if (!checked.ok) return checked;
        const existing = s.secrets[key]?.pin;
        if (existing) {
          const pinKey = `pin:${key}`;
          const locked = lockoutRemaining(pinKey, Date.now());
          if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 1000)}s.`);
          if (!current || !(await verifyPassword(current, existing))) {
            recordFailure(pinKey, Date.now());
            return fail("Current transaction password is incorrect.");
          }
          clearFailures(pinKey);
        }
        const credential = await hashPassword(next);
        const s2 = get();
        if (accountKeyOf(s2.user) !== key) return fail("Your session changed. Sign in again.");
        set({
          secrets: { ...s2.secrets, [key]: { ...s2.secrets[key], pin: credential } },
          user: { ...s2.user, security: { ...s2.user.security, paymentPin: true } },
          notifications: prependNotifications(
            s2.notifications,
            makeNotification({
              kind: "account",
              title: existing ? "Transaction password changed" : "Transaction password set",
              body: "Withdrawals now ask for your 6-digit transaction password.",
            }),
          ),
        });
        return OK;
      },

      removePaymentPassword: async ({ loginPassword, current }) => {
        const s = get();
        const key = accountKeyOf(s.user);
        const existing = key ? s.secrets[key]?.pin : undefined;
        if (s.user.isGuest || !key || !existing) return fail("No transaction password is set.");
        const checked = await checkLoginPassword(s, loginPassword);
        if (!checked.ok) return checked;
        const pinKey = `pin:${key}`;
        const locked = lockoutRemaining(pinKey, Date.now());
        if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 1000)}s.`);
        if (!(await verifyPassword(current, existing))) {
          recordFailure(pinKey, Date.now());
          return fail("Current transaction password is incorrect.");
        }
        clearFailures(pinKey);
        const s2 = get();
        if (accountKeyOf(s2.user) !== key) return fail("Your session changed. Sign in again.");
        const rest = withoutKey(s2.secrets[key] ?? {}, "pin");
        set({
          secrets: { ...s2.secrets, [key]: rest },
          user: { ...s2.user, security: { ...s2.user.security, paymentPin: false } },
          notifications: prependNotifications(
            s2.notifications,
            makeNotification({ kind: "account", title: "Transaction password removed", body: "Withdrawals no longer ask for a transaction password." }),
          ),
        });
        return OK;
      },

      verifyPaymentPassword: async (pin) => {
        const s = get();
        const key = accountKeyOf(s.user);
        if (s.user.isGuest || !key) return fail("Sign in first.");
        const existing = s.secrets[key]?.pin;
        if (!existing) return OK;
        const pinKey = `pin:${key}`;
        const locked = lockoutRemaining(pinKey, Date.now());
        if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 1000)}s.`);
        if (!/^\d{6}$/.test(pin) || !(await verifyPassword(pin, existing))) {
          recordFailure(pinKey, Date.now());
          return fail("Incorrect transaction password.");
        }
        clearFailures(pinKey);
        return OK;
      },

      enableTwoFactor: async ({ secret, code }) => {
        const s = get();
        const key = accountKeyOf(s.user);
        if (s.user.isGuest || !key) return fail("Sign in to turn on two-factor authentication.");
        if (s.secrets[key]?.totp) return fail("Two-factor authentication is already on.");
        if (!isValidTotpSecret(secret)) return fail("The setup key is invalid. Start again.");
        if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code from your authenticator app.");
        const totpKey = `totp:${key}`;
        const locked = lockoutRemaining(totpKey, Date.now());
        if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 1000)}s.`);
        let valid = false;
        try {
          valid = await verifyTotp(secret, code, Date.now());
        } catch {
          return fail("Authenticator codes need a secure (https) connection.");
        }
        if (!valid) {
          recordFailure(totpKey, Date.now());
          return fail("That code doesn't match. Check the clock on your phone and try again.");
        }
        clearFailures(totpKey);
        const s2 = get();
        if (accountKeyOf(s2.user) !== key) return fail("Your session changed. Sign in again.");
        set({
          secrets: { ...s2.secrets, [key]: { ...s2.secrets[key], totp: secret } },
          user: { ...s2.user, security: { ...s2.user.security, twoFactor: true } },
          notifications: prependNotifications(
            s2.notifications,
            makeNotification({ kind: "account", title: "Two-factor authentication enabled", body: "Withdrawals now ask for a code from your authenticator app." }),
          ),
        });
        return OK;
      },

      disableTwoFactor: async ({ code, loginPassword }) => {
        const s = get();
        const key = accountKeyOf(s.user);
        const secret = key ? s.secrets[key]?.totp : undefined;
        if (s.user.isGuest || !key || !secret) return fail("Two-factor authentication is not on.");
        const checked = await checkLoginPassword(s, loginPassword);
        if (!checked.ok) return checked;
        const verified = await get().verifyTwoFactor(code);
        if (!verified.ok) return verified;
        const s2 = get();
        if (accountKeyOf(s2.user) !== key) return fail("Your session changed. Sign in again.");
        const rest = withoutKey(s2.secrets[key] ?? {}, "totp");
        set({
          secrets: { ...s2.secrets, [key]: rest },
          user: { ...s2.user, security: { ...s2.user.security, twoFactor: false } },
          notifications: prependNotifications(
            s2.notifications,
            makeNotification({ kind: "account", title: "Two-factor authentication disabled", body: "Two-factor authentication was turned off for your account." }),
          ),
        });
        return OK;
      },

      verifyTwoFactor: async (code) => {
        const s = get();
        const key = accountKeyOf(s.user);
        if (s.user.isGuest || !key) return fail("Sign in first.");
        const secret = s.secrets[key]?.totp;
        if (!secret) return OK;
        const totpKey = `totp:${key}`;
        const locked = lockoutRemaining(totpKey, Date.now());
        if (locked > 0) return fail(`Too many attempts. Try again in ${Math.ceil(locked / 1000)}s.`);
        let valid = false;
        try {
          valid = await verifyTotp(secret, code, Date.now());
        } catch {
          return fail("Authenticator codes need a secure (https) connection.");
        }
        if (!valid) {
          recordFailure(totpKey, Date.now());
          return fail("Incorrect authenticator code.");
        }
        clearFailures(totpKey);
        return OK;
      },

      requestEmailChange: (newEmail, now = Date.now()) => {
        const s = get();
        const key = accountKeyOf(s.user);
        if (s.user.isGuest || !key) return fail("Sign in to change your email.");
        if (!s.user.email) return fail("This account signs in with a phone number, so there is no email to change.");
        if (isReserved(key)) return fail("The demo account can't change its email.");
        const parsed = parseIdentifier(newEmail, "email");
        if (!parsed.ok) return fail(parsed.error);
        if (parsed.key === key) return fail("That is already your email.");
        if (isReserved(parsed.key) || s.accounts[parsed.key] || s.credentials[parsed.key]) return fail("An account with this email already exists.");
        const issued = issueCode(`email:${parsed.key}`, now);
        if (!issued.ok) return fail(issued.error);
        return { ok: true, sandboxCode: issued.code, cooldownUntil: issued.cooldownUntil, expiresAt: issued.expiresAt, reused: issued.reused };
      },

      confirmEmailChange: async ({ newEmail, code, loginPassword, now = Date.now() }) => {
        const s = get();
        const oldKey = accountKeyOf(s.user);
        if (s.user.isGuest || !oldKey || !s.user.email) return fail("Sign in to change your email.");
        if (isReserved(oldKey)) return fail("The demo account can't change its email.");
        const parsed = parseIdentifier(newEmail, "email");
        if (!parsed.ok) return fail(parsed.error);
        const newKey = parsed.key;
        if (newKey === oldKey) return fail("That is already your email.");
        if (isReserved(newKey) || s.accounts[newKey] || s.credentials[newKey]) return fail("An account with this email already exists.");
        if (!new RegExp(`^\\d{${AUTH.otp.length}}$`).test(code)) return fail(`Enter the ${AUTH.otp.length}-digit code.`);
        const checked = await checkLoginPassword(s, loginPassword);
        if (!checked.ok) return checked;
        const verified = checkCode(`email:${newKey}`, code, now);
        if (!verified.ok) return fail(verified.error);

        const s2 = get();
        if (accountKeyOf(s2.user) !== oldKey) return fail("Your session changed. Sign in again.");
        const accounts = snapshotAccounts(s2);
        const snapshot = accounts[oldKey];
        if (!snapshot) return fail("Account not found.");
        const user = { ...s2.user, email: newKey };
        set({
          accounts: { ...moveKey(accounts, oldKey, newKey), [newKey]: { ...snapshot, user } },
          credentials: moveKey(s2.credentials, oldKey, newKey),
          secrets: moveKey(s2.secrets, oldKey, newKey),
          user,
          notifications: prependNotifications(
            s2.notifications,
            makeNotification({ kind: "account", title: "Email changed", body: `Sign in with ${newKey} from now on.` }),
          ),
        });
        consumeCode(`email:${newKey}`);
        clearFailures(oldKey);
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
          backTab: null,
          walletSection: "deposit",
          focusedTierId: null,
          isAuthModalOpen: false,
          isKycModalOpen: false,
          distribution: null,
          authModalReason: null,
        });
      },

      submitKyc: ({ tier, documentType, country, livenessCompleted = false }, now = Date.now()) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to submit verification.");
        if (s.user.kycStatus === "PENDING") return fail("Your verification is already under review.");
        const expected = nextTier(s.user.kycTier);
        if (expected === null) return fail("Your identity is fully verified.");
        if (tier !== expected)
          return fail(tier > expected ? "Complete the previous verification level first." : "You already hold this verification level.");
        if (!DOCUMENT_TYPES_BY_TIER[tier].includes(documentType) || !DOCUMENT_TYPES[documentType])
          return fail("Choose a document type that is accepted for this level.");

        let resolvedCountry = "";
        if (tier === 1) {
          resolvedCountry = (country ?? "").toUpperCase();
          if (!getCountries().some((c) => c.code === resolvedCountry)) return fail("Choose your country or region.");
          if (KYC.enableLivenessStep && !livenessCompleted) return fail("Complete the facial liveness check first.");
        } else {
          resolvedCountry = s.user.kycSubmission?.country ?? "";
        }

        const submittedAt = new Date(now).toISOString();
        const submission: KycSubmission = {
          tier,
          country: resolvedCountry,
          documentType,
          livenessCompleted: tier === 1 && KYC.enableLivenessStep ? livenessCompleted : false,
          submittedAt,
        };
        set({
          user: { ...withoutRejection(s.user), kycStatus: "PENDING", kycSubmittedAt: submittedAt, kycSubmission: submission },
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "account",
              title: "Verification submitted",
              body: `Your Level ${tier} documents are under review. This usually takes ${KYC.reviewEta}.`,
            }),
          ),
        });
        return OK;
      },

      reviewKyc: (decision, reason) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in first.");
        if (s.user.kycStatus !== "PENDING") return fail("No verification is awaiting review.");
        const level = s.user.kycSubmission?.tier ?? nextTier(s.user.kycTier) ?? 1;

        if (decision === "VERIFIED") {
          set({
            user: { ...withoutRejection(s.user), kycTier: level, kycStatus: "VERIFIED" },
            notifications: prependNotifications(
              s.notifications,
              makeNotification({
                kind: "account",
                title: `Level ${level} verified`,
                body:
                  level === 1
                    ? `Your identity is verified. You can now withdraw up to ${fmt(dailyLimitFor(1) ?? 0)} USDT per day.`
                    : "Your enhanced verification was approved. Withdrawals are no longer capped.",
              }),
            ),
          });
          return OK;
        }

        const allowed = rejectionReasonsFor(level, KYC.enableLivenessStep);
        const chosen = reason?.trim() || "Verification could not be completed";
        if (reason && !allowed.includes(chosen)) return fail("Choose one of the listed reasons.");
        set({
          user: { ...s.user, kycStatus: "REJECTED", kycRejectionReason: chosen },
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "account",
              title: "Verification rejected",
              body: `${chosen}. You can correct it and submit again.`,
            }),
          ),
        });
        return OK;
      },

      openKycModal: () => {
        if (get().user.isGuest) {
          set({ isAuthModalOpen: true, authModalTab: "login", authModalReason: "Sign in to verify your identity" });
          return;
        }
        set({ isKycModalOpen: true });
      },

      closeKycModal: () => set({ isKycModalOpen: false }),

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

      setSecurityPreference: (key, value) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to change security settings.");
        if (key !== "pushAlerts") return fail("Set this up in Account Security.");
        if (s.user.security[key] === value) return OK;
        set({ user: { ...s.user, security: { ...s.user.security, [key]: value } } });
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
        if (!canWithdraw(get().user.kycTier))
          return fail("Identity verification is required before withdrawals. Verify your identity to continue.");
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
        const left = remainingToday(s.user.kycTier, s.transactions, Date.now());
        if (left !== null && value > left)
          return fail(
            `Daily withdrawal limit exceeded. You can withdraw up to ${fmt(left)} USDT more today (limit ${fmt(dailyLimitFor(s.user.kycTier) ?? 0)} USDT).`,
          );

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
              note: `Demo override: ${entries.map(([k]) => k).join(", ")}`,
            }),
          ),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "system",
              title: "Demo balance override",
              body: `Admin override applied to: ${entries.map(([k]) => k).join(", ")}.`,
            }),
          ),
        });
        return OK;
      },

      /* ---------------- Dynamic VIP tiers ---------------- */

      addTier: (input) => {
        const s = get();
        const level = input.level ?? Math.max(-1, ...s.tiers.map((t) => t.level)) + 1;
        const tier: VipTier = {
          id: uid("vip"),
          level,
          name: (input.name ?? `VIP ${level}`).trim(),
          title: input.title.trim(),
          feeUsdt: input.feeUsdt,
          dailyRatePct: input.dailyRatePct,
          hashrateTh: input.hashrateTh,
          minKycTier: input.minKycTier,
          capacity: input.capacity,
          activeNodes: input.activeNodes ?? 0,
          isActive: input.isActive ?? true,
          ...(input.fixedDailyUsdt !== undefined && { fixedDailyUsdt: input.fixedDailyUsdt }),
          ...(input.durationDays !== undefined && { durationDays: input.durationDays }),
        };
        const error = validateTier(tier, s.tiers);
        if (error) return fail(error);
        set({
          tiers: [...s.tiers, tier].sort(byLevel),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "system",
              title: "Compute node added",
              body: `${tier.name} ${tier.title} is live at ${tier.dailyRatePct}% daily.`,
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
        next.title = next.title.trim();
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
                  body: `Daily distribution is now ${next.dailyRatePct}% (was ${current.dailyRatePct}%). Nodes already allocated keep their original rate.`,
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
          return fail("This tier has active nodes. Deactivate it instead.");
        set({
          tiers: s.tiers.filter((t) => t.id !== id),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "system",
              title: "Compute node removed",
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
                ? "New allocations are accepted again."
                : "New allocations are paused. Existing nodes keep earning.",
            }),
          ),
        });
        return OK;
      },

      /* ---------------- Compute node engine ---------------- */

      allocateNode: (tierId, options = {}, now = Date.now()) => {
        if (get().user.isGuest) return { ok: false, error: BLOCK_MESSAGES.guest, reason: "guest" };
        get().tickYieldEngine(now);
        const s = get();
        const tier = s.tiers.find((t) => t.id === tierId);
        if (!tier) return { ok: false, error: "Compute node not found." };

        const quote = quoteAllocation({
          tier,
          positions: s.positions,
          balances: s.balances,
          kycTier: s.user.kycTier,
          isGuest: false,
          useVoucher: options.useVoucher ?? false,
        });
        if (quote.blocked) {
          const error =
            quote.blocked === "kyc"
              ? `${tier.name} needs Level ${quote.kycRequired} verification.`
              : BLOCK_MESSAGES[quote.blocked];
          return { ok: false, error, reason: quote.blocked };
        }
        if (quote.shortfall > 0)
          return {
            ok: false,
            error: `Insufficient balance. Deposit ${fmt(quote.shortfall)} USDT more to allocate ${tier.name}.`,
            reason: "funds",
            shortfall: quote.shortfall,
          };

        const stamp = new Date(now).toISOString();
        const current = currentNode(s.positions);
        // A trial node has nothing to prorate; it ends and the new node starts fresh.
        const upgradeInPlace = current !== null && current.tierLevel !== 0;
        const fromTier = current ? s.tiers.find((t) => t.id === current.tierId) : undefined;
        const voucherPortion = round6((upgradeInPlace && current ? voucherPortionOf(current) : 0) + quote.voucherApplied);

        const fresh: VaultPosition = {
          id: upgradeInPlace && current ? current.id : uid("pos"),
          tierId: tier.id,
          tierName: tier.name,
          tierLevel: tier.level,
          principal: tier.feeUsdt,
          dailyRatePct: tier.dailyRatePct,
          dailyOutput: tierDailyOutput(tier),
          fundedBy: voucherPortion > 0 && voucherPortion >= tier.feeUsdt ? "voucher" : "balance",
          voucherPortion,
          openedAt: upgradeInPlace && current ? current.openedAt : stamp,
          lastAccruedAt: stamp,
          accrued: upgradeInPlace && current ? current.accrued : 0,
          pending: upgradeInPlace && current ? pendingOf(current) : 0,
          status: "active",
          ...(upgradeInPlace && current ? { upgradedFrom: current.tierLevel } : {}),
          ...(tier.durationDays !== undefined ? { expiresAt: new Date(now + tier.durationDays * MS_PER_DAY).toISOString() } : {}),
        };

        const positions = upgradeInPlace
          ? s.positions.map((p) => (p.id === fresh.id ? fresh : p))
          : [
              fresh,
              ...s.positions.map((p) =>
                current && p.id === current.id ? { ...p, status: "closed" as const, closedAt: stamp } : p,
              ),
            ];
        const kind = quote.kind;
        const tx = makeTx("stake", quote.cashDue, {
          positionId: fresh.id,
          note:
            (kind === "upgrade" && fromTier ? `Upgrade ${fromTier.name} → ${tier.name}` : `${tier.name} ${tier.title}`) +
            (quote.voucherApplied > 0 ? ` (+${fmt(quote.voucherApplied)} voucher)` : ""),
        });

        const base = {
          balances: {
            ...s.balances,
            available: round6(s.balances.available - quote.cashDue),
            trialVoucher: round6(s.balances.trialVoucher - quote.voucherApplied),
            staked: round6(s.balances.staked + quote.price),
          },
          positions,
          tiers: s.tiers.map((t) => {
            if (t.id === tier.id) return { ...t, activeNodes: t.activeNodes + 1 };
            if (current && t.id === current.tierId) return { ...t, activeNodes: Math.max(0, t.activeNodes - 1) };
            return t;
          }),
          transactions: prependTx(s.transactions, tx),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "stake",
              title: kind === "upgrade" ? "Node upgraded" : "Node allocated",
              body:
                kind === "upgrade" && fromTier
                  ? `Upgraded ${fromTier.name} to ${tier.name} for ${fmt(quote.price)} USDT (${fmt(quote.credit)} USDT credited from your current node).`
                  : tier.feeUsdt === 0
                    ? `${tier.name} ${tier.title} is running: ${fmt(tierDailyOutput(tier))} USDT per day for ${tier.durationDays} days.`
                    : `${tier.name} ${tier.title} is running: ${fmt(tierDailyOutput(tier))} USDT per day.`,
            }),
          ),
        };
        const rewards = s.user.rewards;
        // The festival pays +50% once, on the first node that costs something, while a ticket is held.
        const bonus = tier.feeUsdt > 0 && !hasPaidNode(s.positions) && ticketValid(rewards.boost, now) ? bonusFor(tier.feeUsdt) : 0;
        set(
          bonus > 0
            ? {
                ...base,
                balances: { ...base.balances, available: round6(base.balances.available + bonus) },
                transactions: prependTx(
                  base.transactions,
                  makeTx("bounty", bonus, { note: `Festival first-activation bonus (+${FESTIVAL.bonusPct}%)` }),
                ),
                notifications: prependNotifications(
                  base.notifications,
                  makeNotification({
                    kind: "wallet",
                    title: "Festival bonus credited",
                    body: `${fmt(bonus)} USDT (+${FESTIVAL.bonusPct}% of your ${fmt(tier.feeUsdt)} USDT first activation) was added to your available balance.`,
                  }),
                ),
                user: {
                  ...s.user,
                  rewards: {
                    ...rewards,
                    totalBounty: round6(rewards.totalBounty + bonus),
                    boost: { ticketDay: rewards.boost?.ticketDay ?? null, bonusPaid: true, bonusAmount: bonus },
                  },
                },
              }
            : base,
        );
        return { ok: true, id: fresh.id, kind, level: tier.level, charged: quote.cashDue, ...(bonus > 0 ? { bonus } : {}) };
      },

      collectOutput: (now = Date.now()) => {
        if (get().user.isGuest) return { ok: false, error: "Sign in to collect compute output." };
        get().tickYieldEngine(now);
        const s = get();
        const pending = totalPending(s.positions);
        if (pending <= 0) return { ok: false, error: "No compute output to collect yet." };
        if (pending < MIN_COLLECT_USDT)
          return { ok: false, error: `Output is still building. Collection opens at ${fmt(MIN_COLLECT_USDT)} USDT.` };

        const collected = collectPending(s, now);
        set({
          ...collected.patch,
          distribution: nextDistribution(collected.amount, "manual"),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "wallet",
              title: "Compute output collected",
              body: `${fmt(collected.amount)} USDT was added to your available balance.`,
            }),
          ),
        });
        return { ok: true, amount: collected.amount };
      },

      unstakePosition: (positionId) => {
        const s = get();
        const now = Date.now();
        const settled = settle(s, now);
        const base: StoreData = { ...s, ...(settled?.patch ?? {}) };
        const position = base.positions.find((p) => p.id === positionId);
        if (!position || position.status !== "active") return fail("Active node not found.");

        const collected = collectPending(base, now, positionId);
        const returned = round6(Math.max(0, position.principal - voucherPortionOf(position)));
        set({
          dailyAccrualDay: base.dailyAccrualDay,
          balances: {
            ...collected.patch.balances,
            available: collected.patch.balances.available + returned,
            staked: Math.max(0, collected.patch.balances.staked - position.principal),
          },
          positions: collected.patch.positions.map((p) =>
            p.id === positionId ? { ...p, status: "closed", closedAt: new Date(now).toISOString() } : p,
          ),
          tiers: base.tiers.map((t) =>
            t.id === position.tierId ? { ...t, activeNodes: Math.max(0, t.activeNodes - 1) } : t,
          ),
          transactions: prependTx(
            collected.patch.transactions,
            makeTx("unstake", returned, {
              positionId,
              note: voucherPortionOf(position) > 0 ? "Trial voucher part is non-withdrawable" : position.tierName,
            }),
          ),
          notifications: prependNotifications(
            base.notifications,
            makeNotification({
              kind: "stake",
              title: "Node released",
              body: `${position.tierName} was released. ${fmt(returned)} USDT returned.`,
            }),
          ),
        });
        return OK;
      },

      tickYieldEngine: (now = Date.now()) => {
        const s = get();
        const settled = settle(s, now);
        const pending = settlePending(settled?.patch.transactions ?? s.transactions, now);
        if (!settled && !pending) return;

        let notifications = s.notifications;
        const extra: Partial<StoreData> = {};
        if (settled && settled.credited > 0) {
          notifications = prependNotifications(
            notifications,
            makeNotification({
              kind: "wallet",
              title: "Compute output distributed",
              body: `${fmt(settled.credited)} USDT from the last cycle was added to your available balance.`,
            }),
          );
          extra.distribution = nextDistribution(settled.credited, "auto");
        }
        if (settled && settled.expired.length > 0) {
          notifications = prependNotifications(
            notifications,
            ...settled.expired.map((p) =>
              makeNotification({
                kind: "stake",
                title: "Trial node finished",
                body: `${p.tierName} ran its full ${fmt(p.accrued)} USDT of output. Allocate VIP 1 or higher to keep earning.`,
              }),
            ),
          );
          const gone = new Map<string, number>();
          for (const p of settled.expired) gone.set(p.tierId, (gone.get(p.tierId) ?? 0) + 1);
          extra.tiers = s.tiers.map((t) => (gone.has(t.id) ? { ...t, activeNodes: Math.max(0, t.activeNodes - (gone.get(t.id) ?? 0)) } : t));
        }
        if (pending) {
          notifications = prependNotifications(
            notifications,
            ...pending.completed.map((t) =>
              makeNotification({
                kind: "wallet",
                title: "Withdrawal completed",
                body: `${fmt(round6(t.amount - (t.fee ?? 0)))} USDT was sent to ${shortAddress(t.address ?? "")}.`,
              }),
            ),
          );
        }
        set({
          ...(settled?.patch ?? {}),
          ...(pending ? { transactions: pending.transactions } : {}),
          ...extra,
          notifications,
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

      claimBoostTicket: (now = Date.now()) => {
        const s = get();
        if (s.user.isGuest) return fail("Sign in to claim your boost ticket.");
        const boost = s.user.rewards.boost ?? { ticketDay: null, bonusPaid: false };
        if (boost.bonusPaid) return fail("Your first-activation bonus has already been credited.");
        if (hasPaidNode(s.positions)) return fail("The boost applies to a first paid activation, and your node is already running.");
        const today = utcDay(now);
        if (boost.ticketDay === today) return fail("Your boost ticket for this round is already active.");
        set({
          user: { ...s.user, rewards: { ...s.user.rewards, boost: { ...boost, ticketDay: today } } },
          notifications: prependNotifications(
            s.notifications,
            makeNotification({
              kind: "wallet",
              title: "Boost ticket claimed",
              body: `Activate your first paid node before 00:00 UTC to receive +${FESTIVAL.bonusPct}% as a bonus.`,
            }),
          ),
        });
        return OK;
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

      createTicket: ({ subject, message, attachments = [] }) => {
        const s = get();
        if (!TICKETS.subjects.includes(subject)) return fail("Choose what your request is about.");
        const text = message.trim();
        if (text.length < TICKETS.minMessage) return fail(`Describe your request in at least ${TICKETS.minMessage} characters.`);
        if (text.length > TICKETS.maxMessage) return fail(`Keep it under ${TICKETS.maxMessage} characters.`);
        if (attachments.length > TICKETS.maxAttachments) return fail(`Attach at most ${TICKETS.maxAttachments} files.`);
        if (attachments.some((a) => !a.name || a.size <= 0 || a.size > TICKETS.maxAttachmentBytes))
          return fail("One of the attachments is not valid.");
        const taken = new Set(s.tickets.map((t) => t.ref));
        let ref = "";
        do ref = `TKT-${100_000 + Math.floor(Math.random() * 900_000)}`;
        while (taken.has(ref));
        const ticket: SupportTicket = {
          id: uid("tkt"),
          ref,
          subject,
          message: text,
          attachments: attachments.map((a) => ({ name: a.name.slice(0, 120), size: a.size })),
          createdAt: new Date().toISOString(),
          status: "Open",
        };
        set({
          tickets: [ticket, ...s.tickets].slice(0, TICKETS.max),
          notifications: prependNotifications(
            s.notifications,
            makeNotification({ kind: "system", title: "Support ticket created", body: `${ref} · ${subject}` }),
          ),
        });
        return okWith(ref);
      },

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

      setActiveTab: (activeTab) =>
        set((s) => ({
          activeTab,
          backTab: SUB_TABS.includes(activeTab) ? (SUB_TABS.includes(s.activeTab) ? s.backTab : s.activeTab) : null,
        })),
      setActiveLanguage: (activeLanguage) => set({ activeLanguage }),
      setHasSeenAnnouncement: (seen = true) => set({ hasSeenAnnouncement: seen }),
      setHasSeenWelcome: (seen = true) => set({ hasSeenWelcome: seen }),
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
        // v6 -> v7: verification levels. The old single "verified" state is level 1.
        if (version < 7) {
          const accounts = state.accounts as Record<string, { user?: Record<string, unknown> }> | undefined;
          const withTier = (user: Record<string, unknown>) => ({
            ...user,
            kycTier: user.kycTier ?? (user.kycStatus === "VERIFIED" ? 1 : 0),
          });
          if (state.user && typeof state.user === "object") state.user = withTier(state.user as Record<string, unknown>);
          for (const account of Object.values(accounts ?? {})) {
            if (account.user) account.user = withTier(account.user);
          }
        }
        // v7 -> v8: compute-node catalog. Tiers are rebuilt from the new seed, and nodes gain a pending pool.
        if (version < 8) {
          delete state.tiers;
          const withPending = (list: unknown[]) => list.map((p) => ({ pending: 0, ...(p as object) }));
          if (Array.isArray(state.positions)) state.positions = withPending(state.positions);
          const accounts = state.accounts as Record<string, Record<string, unknown>> | undefined;
          for (const account of Object.values(accounts ?? {})) {
            if (Array.isArray(account.positions)) account.positions = withPending(account.positions);
          }
        }
        // v8 -> v9: fresh onboarding alerts replace the original seed notifications.
        if (version < 9 && Array.isArray(state.notifications)) {
          const kept = (state.notifications as Array<{ id?: unknown }>).filter((n) => !String(n.id ?? "").startsWith("ntf_seed_"));
          state.notifications = [...seedNotifications(), ...kept];
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

/** Output earned in the current cycle and not yet in the wallet. */
export const selectPendingOutput = (s: StoreState): Usd => totalPending(s.positions);

/** Collected today plus still pending: what "today's profit" means on screen. */
export const selectTodayProfit = (s: StoreState): Usd => s.balances.dailyAccrued + totalPending(s.positions);

/** Enabled means a secret is stored; the boolean on `user.security` is only a mirror and can be stale in old saved data. */
export const selectHasPaymentPassword = (s: StoreState): boolean => {
  const key = accountKeyOf(s.user);
  return Boolean(key && s.secrets[key]?.pin);
};

export const selectHasTwoFactor = (s: StoreState): boolean => {
  const key = accountKeyOf(s.user);
  return Boolean(key && s.secrets[key]?.totp);
};

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

/** Dev-only handle for browser QA (removed from production builds). */
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __store: typeof useAppStore }).__store = useAppStore;
}
