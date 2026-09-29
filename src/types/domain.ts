/** Core domain types. */

export type IsoTimestamp = string;
export type Usd = number;

export type TransactionType =
  | "deposit"
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

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  kycStatus: KycStatus;
  payoutAddress: string | null;
  createdAt: IsoTimestamp;
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

export type AppTab = "terminal" | "vaults" | "wallet" | "notifications" | "profile" | "admin";
export type Language = "en" | "ru";
