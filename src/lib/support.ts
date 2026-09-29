import { REFERRAL } from "@/config/protocol";
import { formatAmount, formatRate } from "@/lib/format";
import { TRIAL_VOUCHER_AMOUNT } from "@/lib/store";
import {
  DEPOSIT_WINDOW_MS,
  MIN_DEPOSIT,
  MIN_WITHDRAWAL,
  WITHDRAWAL_ETA,
  WITHDRAWAL_FEE,
} from "@/lib/wallet";
import type { VipTier } from "@/types/domain";

export const GREETING =
  "Hello! Welcome to Nexus Protocol Institutional Support. How can we assist your capital allocation today?";

export const FAQ_PILLS = ["Deposit Delay?", "How VIP Tiers Work", "Withdrawal Limits"] as const;

const MAX_TIERS_LISTED = 6;

function depositReply(): string {
  return [
    "Deposits are credited automatically once your transfer is confirmed on-chain.",
    `Send only USDT on the network you selected (TRC20, BEP20 or ERC20) to the address under Wallet → Deposit, and complete the transfer within the ${DEPOSIT_WINDOW_MS / 60_000}-minute payment window. The minimum deposit is ${formatAmount(MIN_DEPOSIT)} USDT.`,
    "If a transfer still hasn't shown up, send us its transaction hash and the network you used.",
  ].join("\n\n");
}

function withdrawalReply(): string {
  return [
    `Withdrawals have a ${formatAmount(MIN_WITHDRAWAL)} USDT minimum and can't exceed your available balance. A flat ${formatAmount(WITHDRAWAL_FEE)} USDT network fee is deducted, so you receive the amount minus the fee.`,
    `Transfers usually arrive in ${WITHDRAWAL_ETA}. Trial voucher principal isn't withdrawable, but the daily income it earns is.`,
  ].join("\n\n");
}

function tiersReply(tiers: readonly VipTier[]): string {
  const open = tiers.filter((t) => t.isActive).sort((a, b) => a.level - b.level);
  const intro =
    "Each VIP plan pays a fixed daily income on the amount you invest, credited to your available balance in real time.";
  if (open.length === 0) return `${intro}\n\nNo plans are open for new investments right now. Please check back soon.`;
  const lines = open
    .slice(0, MAX_TIERS_LISTED)
    .map(
      (t) =>
        `• ${t.name}: ${formatRate(t.dailyRatePct)} per day · ${formatAmount(t.minDeposit, 0)}–${formatAmount(t.maxDeposit, 0)} USDT`,
    );
  if (open.length > MAX_TIERS_LISTED) lines.push(`…and ${open.length - MAX_TIERS_LISTED} more on the VIP tab.`);
  return `${intro}\n\nOpen plans right now:\n${lines.join("\n")}`;
}

const REPLIES = {
  kyc: "You can verify your identity from Profile by tapping the verification badge. Level 1 needs a government ID and a selfie, and we'll notify you as soon as the review finishes.",
  referral: `Share your invite link from Profile. You earn ${REFERRAL.tiers[0].ratePct}% commission on your Tier 1 invites' deposits, ${REFERRAL.tiers[1].ratePct}% on Tier 2 and ${REFERRAL.tiers[2].ratePct}% on Tier 3.`,
  voucher: `New accounts receive a ${formatAmount(TRIAL_VOUCHER_AMOUNT, 0)} USDT trial voucher. Activate it on a VIP plan whose minimum it covers. The voucher principal can't be withdrawn, but the daily income it earns is yours to keep.`,
  escalate:
    "For a live specialist you can also reach us on the Telegram VIP Concierge or the WhatsApp Desk from the Profile screen.",
  greeting: "Hello again! Ask about deposits, withdrawals, VIP plans, verification or referrals and we'll point you in the right direction.",
  fallback:
    "Thanks for your message. We can help with deposits, withdrawals, VIP plans, verification and referrals. Could you tell us a bit more about what you need?",
} as const;

/** Keyword routing; the first matching topic wins. */
export function pickSupportReply(text: string, tiers: readonly VipTier[]): string {
  const t = text.toLowerCase();
  if (/withdraw|payout|cash\s?out/.test(t)) return withdrawalReply();
  if (/deposit|top\s?up|arriv|confirmation|network|txid|hash/.test(t)) return depositReply();
  if (/vip|tier|plan|daily|income|rate|yield|invest/.test(t)) return tiersReply(tiers);
  if (/limit|fee/.test(t)) return withdrawalReply();
  if (/kyc|verif|identity|document/.test(t)) return REPLIES.kyc;
  if (/referral|invite|commission|refer/.test(t)) return REPLIES.referral;
  if (/voucher|trial|bonus/.test(t)) return REPLIES.voucher;
  if (/human|agent|person|specialist|telegram|whatsapp|call/.test(t)) return REPLIES.escalate;
  if (/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b/.test(t)) return REPLIES.greeting;
  return REPLIES.fallback;
}
