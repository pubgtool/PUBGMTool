import { BLOCK_MESSAGES, type AllocationQuote } from "@/lib/nodes";
import { formatAmount } from "@/lib/format";

/** "350" for whole amounts, "349.50" otherwise. */
export const usdt = (n: number): string => (Number.isInteger(n) ? formatAmount(n, 0) : formatAmount(n, 2));

export type CtaKind =
  | "signin"
  | "kyc"
  | "deposit"
  | "upgrade"
  | "activate"
  | "current"
  | "included"
  | "trial_used"
  | "sold_out"
  | "closed";

export interface Cta {
  kind: CtaKind;
  label: string;
  disabled: boolean;
}

/** What a catalog card's button says and does, derived from the same quote the store enforces. */
export function ctaFor(quote: AllocationQuote): Cta {
  switch (quote.blocked) {
    case "guest":
      return { kind: "signin", label: "Sign in to allocate", disabled: false };
    case "same_tier":
      return { kind: "current", label: "Current Node", disabled: true };
    case "not_upgrade":
      return { kind: "included", label: "Included in your node", disabled: true };
    case "trial_used":
      return { kind: "trial_used", label: "Trial already used", disabled: true };
    case "sold_out":
      return { kind: "sold_out", label: "Sold out", disabled: true };
    case "inactive":
      return { kind: "closed", label: "Closed", disabled: true };
    case "kyc":
      return { kind: "kyc", label: `Verify identity · Level ${quote.kycRequired}`, disabled: false };
    default:
      break;
  }
  if (quote.shortfall > 0) return { kind: "deposit", label: `Deposit ${usdt(quote.shortfall)} USDT to allocate`, disabled: false };
  if (quote.kind === "upgrade") return { kind: "upgrade", label: `Upgrade · pay ${usdt(quote.price)} USDT`, disabled: false };
  return quote.fee === 0
    ? { kind: "activate", label: "Start Free Trial", disabled: false }
    : { kind: "activate", label: `Allocate Node · ${usdt(quote.fee)} USDT`, disabled: false };
}

export const blockText = (quote: AllocationQuote): string | null =>
  quote.blocked === "kyc" ? `${quote.tier.name} needs Level ${quote.kycRequired} verification.` : quote.blocked ? BLOCK_MESSAGES[quote.blocked] : null;
