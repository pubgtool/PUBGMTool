/** Core domain types. */

export type IsoTimestamp = string;
export type Usd = number;

export type PaymentNetwork = "trc20" | "bep20" | "erc20";

export type TransactionStatus = "PENDING" | "COMPLETED";

export type TransactionType =
  | "deposit"
  | "earning"
  | "commission"
  | "bounty"
  | "stake"
  | "unstake"
  | "early_unstake"
  | "harvest"
  | "fee"
  | "withdraw"
  | "voucher"
  | "adjustment";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: Usd;
  positionId?: string;
  createdAt: IsoTimestamp;
  note?: string;
  status: TransactionStatus;
  network?: PaymentNetwork;
  /** Deposit address (deposits) or destination address (withdrawals). */
  address?: string;
  txHash?: string;
  /** Flat network fee; withdrawals only. `amount` is the gross debit. */
  fee?: Usd;
  completedAt?: IsoTimestamp;
}

export type LegalSlug = "terms" | "risk" | "privacy";

export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface LegalDocument {
  slug: LegalSlug;
  title: string;
  summary: string;
  version: string;
  sections: readonly LegalSection[];
}

/* ---- Reactive store domain (daily-rate VIP vaults) ---- */

export type KycStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export type UserRole = "user" | "admin";

export type AuthTab = "login" | "register" | "forgot";

export interface SessionState {
  /** false: the session ends when the browser session does. */
  remember: boolean;
}

export interface SecuritySettings {
  twoFactor: boolean;
  paymentPin: boolean;
  pushAlerts: boolean;
}

export interface ReferralStats {
  invites: number;
  commissionEarned: Usd;
}

export type TaskId = "daily-compute" | "telegram" | "invite";

export interface TaskProgress {
  /** Epoch ms when the user started the task. */
  startedAt: number | null;
  /** Reward locked in when the task was started. */
  reward: Usd | null;
  claimedAt: IsoTimestamp | null;
}

export interface CheckInState {
  /** Consecutive-day count within the current 7-day cycle (1..7); 0 = never. */
  streak: number;
  /** UTC day (YYYY-MM-DD) of the last check-in. */
  lastDay: string | null;
  /** Completed 7-day cycles. */
  cycles: number;
}

export interface RewardsState {
  checkIn: CheckInState;
  tasks: Partial<Record<TaskId, TaskProgress>>;
  /** Lifetime check-in, mission and gift-code rewards. */
  totalBounty: Usd;
}

export interface PromoCode {
  code: string;
  rewardUsdt: Usd;
  maxClaims: number;
  currentClaims: number;
  expiresAt?: IsoTimestamp;
  active: boolean;
  /** User ids that already redeemed the code. */
  claimedBy: string[];
}

export interface UserProfile {
  id: string;
  email: string | null;
  /** Normalised to +digits. Set instead of `email` for phone sign-ups. */
  phone: string | null;
  /** Public numeric account ID, e.g. 8942105. Empty for guests. */
  uid: string;
  /** Numeric invite code shared with friends. Empty for guests. */
  referralCode: string;
  /** UID of the account whose invite code was used at sign-up. */
  referredBy: string | null;
  displayName: string;
  isGuest: boolean;
  kycStatus: KycStatus;
  payoutAddress: string | null;
  createdAt: IsoTimestamp;
  /** Absent means "user". Nothing assigns "admin" yet. */
  role?: UserRole;
  security: SecuritySettings;
  referral: ReferralStats;
  rewards: RewardsState;
}

export interface WalletBalances {
  available: Usd;
  staked: Usd;
  trialVoucher: Usd;
  totalEarned: Usd;
  /** Yield accrued since 00:00 UTC of the current day. */
  dailyAccrued: Usd;
}

export interface VipTier {
  id: string;
  level: number;
  name: string;
  /** Daily reward rate in percent, e.g. 1.2 = 1.2% per day. */
  dailyRatePct: number;
  minDeposit: Usd;
  maxDeposit: Usd;
  /** Total stake capacity of the vault. */
  capacity: Usd;
  /** Capacity currently consumed by open positions. */
  filled: Usd;
  isActive: boolean;
}

export type FundingSource = "balance" | "voucher";

export interface VaultPosition {
  id: string;
  tierId: string;
  tierName: string;
  tierLevel: number;
  principal: Usd;
  /** Rate snapshot taken when the position was opened. */
  dailyRatePct: number;
  fundedBy: FundingSource;
  openedAt: IsoTimestamp;
  lastAccruedAt: IsoTimestamp;
  accrued: Usd;
  status: "active" | "closed";
  closedAt?: IsoTimestamp;
}

export type NotificationKind = "system" | "telemetry" | "wallet" | "stake" | "account";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: IsoTimestamp;
  read: boolean;
}

export type AppTab = "main" | "vaults" | "wallet" | "notifications" | "profile" | "tasks" | "admin";
export type Language = "en" | "ru";
export type WalletSection = "deposit" | "withdraw" | "history";

/** Everything that belongs to one signed-in account and is swapped on login/logout. */
export interface AccountSnapshot {
  user: UserProfile;
  balances: WalletBalances;
  positions: VaultPosition[];
  transactions: Transaction[];
  dailyAccrualDay: string;
}
