import {
  COUNTRY_CODES,
  DOCUMENT_TYPES,
  KYC,
  KYC_TIERS,
  type DocumentTypeDef,
  type KycTierDef,
} from "@/config/kyc";
import { MS_PER_DAY, utcDay } from "@/lib/time";
import type { KycDocumentType, KycTier, Transaction, UserProfile } from "@/types/domain";

/* ------------------------------------------------------------------ */
/* Tiers and withdrawal limits                                         */
/* ------------------------------------------------------------------ */

export const tierDef = (tier: KycTier): KycTierDef => KYC_TIERS[tier] ?? KYC_TIERS[0]!;

/** USDT per UTC day: 0 blocks withdrawals, null is unlimited. */
export const dailyLimitFor = (tier: KycTier): number | null => tierDef(tier).dailyLimit;

/** Gross USDT already requested today (UTC), across pending and completed withdrawals. */
export function withdrawnToday(transactions: readonly Transaction[], now: number): number {
  const today = utcDay(now);
  return transactions.reduce(
    (sum, t) => (t.type === "withdraw" && utcDay(Date.parse(t.createdAt)) === today ? sum + t.amount : sum),
    0,
  );
}

/** What can still be withdrawn today; null means unlimited. */
export function remainingToday(tier: KycTier, transactions: readonly Transaction[], now: number): number | null {
  const limit = dailyLimitFor(tier);
  if (limit === null) return null;
  return Math.max(0, Math.round((limit - withdrawnToday(transactions, now)) * 1e6) / 1e6);
}

export const canWithdraw = (tier: KycTier): boolean => dailyLimitFor(tier) !== 0;

/** The level a new submission would ask for, or null when fully verified. */
export const nextTier = (tier: KycTier): 1 | 2 | null => (tier === 0 ? 1 : tier === 1 ? 2 : null);

/* ------------------------------------------------------------------ */
/* Wizard steps                                                        */
/* ------------------------------------------------------------------ */

export type KycStepId = "details" | "document" | "liveness" | "submit";

export const STEP_LABELS: Record<KycStepId, string> = {
  details: "Details",
  document: "Document",
  liveness: "Liveness",
  submit: "Submit",
};

/**
 * Steps for a verification level. The liveness step is dropped, not disabled,
 * when the flag is off, so the indicator never shows a step that can't happen.
 */
export function kycSteps(tier: 1 | 2, livenessEnabled: boolean = KYC.enableLivenessStep): KycStepId[] {
  if (tier === 2) return ["document", "submit"];
  return ["details", "document", ...(livenessEnabled ? (["liveness"] as const) : []), "submit"];
}

export function stepLabel(tier: 1 | 2, id: KycStepId): string {
  if (tier === 2 && id === "document") return "Proof";
  return STEP_LABELS[id];
}

export const documentDef = (id: KycDocumentType): DocumentTypeDef => DOCUMENT_TYPES[id];

/* ------------------------------------------------------------------ */
/* Personal details                                                    */
/* ------------------------------------------------------------------ */

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;

export const normalizeName = (raw: string): string => raw.trim().replace(/\s+/g, " ");

export function validateFullName(raw: string): string | null {
  const name = normalizeName(raw);
  if (!name) return "Enter your full name as shown on your document.";
  if (name.length < 2) return "Enter your full name as shown on your document.";
  if (name.length > 80) return "Use at most 80 characters.";
  if (!NAME_RE.test(name)) return "Use letters, spaces, hyphens and apostrophes only.";
  if ((name.match(/\p{L}/gu) ?? []).length < 2) return "Enter your full name as shown on your document.";
  return null;
}

const isoDate = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Earliest and latest acceptable birth dates for a UTC moment, as YYYY-MM-DD. */
export function dobBounds(now: number): { min: string; max: string } {
  const d = new Date(now);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  return { min: isoDate(y - KYC.maxAge, m, day), max: isoDate(y - KYC.minAge, m, day) };
}

export function validateDob(value: string, now: number): string | null {
  if (!value) return "Enter your date of birth.";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "Enter a valid date of birth.";
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d)
    return "Enter a valid date of birth.";
  if (parsed.getTime() > now) return "Date of birth can't be in the future.";
  const { min, max } = dobBounds(now);
  if (value > max) return `You must be at least ${KYC.minAge} years old.`;
  if (value < min) return "Enter a valid date of birth.";
  return null;
}

/* ------------------------------------------------------------------ */
/* Countries                                                           */
/* ------------------------------------------------------------------ */

let displayNames: Intl.DisplayNames | null | undefined;

export function countryName(code: string): string {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      displayNames = null;
    }
  }
  return displayNames?.of(code) ?? code;
}

/** Regional-indicator flag emoji. Some desktop systems show the two letters instead. */
export const flagEmoji = (code: string): string =>
  code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🏳️";

export interface Country {
  code: string;
  name: string;
  flag: string;
}

let countries: Country[] | undefined;

export function getCountries(): Country[] {
  countries ??= COUNTRY_CODES.map((code) => ({ code, name: countryName(code), flag: flagEmoji(code) })).sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  );
  return countries;
}

export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase();
  const all = getCountries();
  if (!q) return all;
  const starts: Country[] = [];
  const contains: Country[] = [];
  for (const c of all) {
    const name = c.name.toLowerCase();
    if (name.startsWith(q) || c.code.toLowerCase() === q) starts.push(c);
    else if (name.includes(q)) contains.push(c);
  }
  return [...starts, ...contains];
}

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

export type UploadKind = "image" | "pdf";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function detectUploadKind(name: string, type: string): UploadKind | null {
  const mime = type.toLowerCase();
  if (IMAGE_TYPES.has(mime)) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime === "" || mime === "application/octet-stream") {
    const ext = name.toLowerCase().split(".").pop() ?? "";
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
  }
  return null;
}

export function validateUploadMeta(file: { name: string; size: number; type: string }): string | null {
  if (file.size <= 0) return "That file is empty. Choose a different one.";
  if (!detectUploadKind(file.name, file.type)) return "Unsupported file type. Use a JPG, PNG, WebP or PDF.";
  if (file.size > KYC.upload.maxBytes) return `File is too large (max ${KYC.upload.maxBytes / 1024 / 1024} MB).`;
  return null;
}

export function validateImageSize(width: number, height: number): string | null {
  if (!(width > 0 && height > 0)) return "We couldn't read this image. Try a different file.";
  const long = Math.max(width, height), short = Math.min(width, height);
  const needLong = Math.max(KYC.upload.minWidth, KYC.upload.minHeight);
  const needShort = Math.min(KYC.upload.minWidth, KYC.upload.minHeight);
  if (long < needLong || short < needShort)
    return `Image resolution is too low (minimum ${KYC.upload.minWidth}×${KYC.upload.minHeight}). Retake it in good light.`;
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export type KycBadgeTone = "none" | "pending" | "verified" | "rejected";

export interface KycBadge {
  tone: KycBadgeTone;
  label: string;
}

/** One label for a user's verification, used by Profile and Wallet. */
export function kycBadge(user: Pick<UserProfile, "kycTier" | "kycStatus">): KycBadge {
  if (user.kycStatus === "PENDING") return { tone: "pending", label: "Pending Verification" };
  if (user.kycTier >= 1) return { tone: "verified", label: `Verified Level ${user.kycTier}` };
  if (user.kycStatus === "REJECTED") return { tone: "rejected", label: "Verification rejected" };
  return { tone: "none", label: "Verify identity" };
}

/** Whole days between two ISO timestamps, for "submitted 2 days ago" copy. */
export const daysSince = (iso: string, now: number): number => Math.floor((now - Date.parse(iso)) / MS_PER_DAY);
