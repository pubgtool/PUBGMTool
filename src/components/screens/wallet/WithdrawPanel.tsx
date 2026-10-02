"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, Clock, ShieldCheck } from "lucide-react";
import { KycGate } from "@/components/kyc/KycGate";
import { NetworkTile } from "@/components/screens/wallet/NetworkBadge";
import { NetworkPicker } from "@/components/screens/wallet/NetworkPicker";
import { CARD, CTA, EYEBROW, FOCUS, HIT, SPRING, TAP, TAP_CTA } from "@/components/screens/wallet/styles";
import { WithdrawConfirmSheet, type WithdrawDraft } from "@/components/screens/wallet/WithdrawConfirmSheet";
import { AmountField } from "@/components/ui/AmountField";
import { floor6, parseAmountInput, toInputText } from "@/lib/amount";
import { formatAmount, formatAmountFlexible } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { canWithdraw, dailyLimitFor, remainingToday, tierDef } from "@/lib/kyc";
import { useAppStore } from "@/lib/store";
import {
  MIN_WITHDRAWAL,
  WITHDRAWAL_ETA,
  WITHDRAWAL_FEE,
  addressError,
  defaultNetworkFor,
  getNetwork,
  guessFamily,
  type AddressFamily,
} from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

const CHIPS = [25, 50, 75, 100] as const;
const NAV_DELAY_MS = 260;
const PLACEHOLDER: Record<AddressFamily, string> = {
  tron: "T… (34 characters)",
  evm: "0x… (42 characters)",
  ton: "UQ… (48 characters)",
};
const FAMILY_NAME: Record<AddressFamily, string> = { tron: "Tron", evm: "EVM", ton: "TON" };

/** Withdrawals need at least Level 1; below that the security gate takes the form's place. */
export function WithdrawPanel() {
  const tier = useAppStore((s) => s.user.kycTier);
  return canWithdraw(tier) ? <WithdrawForm /> : <KycGate />;
}

function WithdrawForm() {
  const savedAddress = useAppStore((s) => s.user.payoutAddress);
  const available = useAppStore((s) => s.balances.available);
  const tier = useAppStore((s) => s.user.kycTier);
  const transactions = useAppStore((s) => s.transactions);
  const setWalletSection = useAppStore((s) => s.setWalletSection);
  const openKycModal = useAppStore((s) => s.openKycModal);
  const now = useNow(30_000);
  const limit = dailyLimitFor(tier);
  const remaining = remainingToday(tier, transactions, now);
  const used = limit === null || remaining === null ? 0 : Math.max(0, limit - remaining);

  const [address, setAddress] = useState(savedAddress ?? "");
  const [network, setNetwork] = useState<PaymentNetwork>(() => defaultNetworkFor(savedAddress ?? "") ?? "trc20");
  const [addressTouched, setAddressTouched] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [draft, setDraft] = useState<WithdrawDraft | null>(null);

  const navTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(navTimer.current), []);

  const info = getNetwork(network);
  const trimmed = address.trim();
  const family = guessFamily(trimmed);
  const addressProblem = trimmed ? addressError(trimmed, network) : null;
  const addressValid = trimmed !== "" && addressProblem === null;

  const amount = parseAmountInput(amountText);
  let amountProblem: string | null = null;
  if (amount !== null) {
    if (amount <= 0) amountProblem = "Enter an amount greater than 0.";
    else if (amount < MIN_WITHDRAWAL) amountProblem = `Minimum withdrawal is ${formatAmount(MIN_WITHDRAWAL)} USDT.`;
    else if (amount > available) amountProblem = `Insufficient available balance (${formatAmountFlexible(available)} USDT).`;
    else if (remaining !== null && amount > remaining)
      amountProblem = `Exceeds your remaining daily limit (${formatAmountFlexible(remaining)} USDT).`;
  }
  const fundsIssue = amount !== null && amount > available;
  const limitIssue = amount !== null && !fundsIssue && remaining !== null && amount > remaining;
  const canReview = amount !== null && amountProblem === null && addressValid;
  const shownAmount = amount !== null && amount > 0 ? amount : 0;
  const net = Math.max(0, Math.round((shownAmount - WITHDRAWAL_FEE) * 1e6) / 1e6);

  const onAddressChange = (value: string) => {
    const next = value.replace(/\s+/g, "");
    setAddress(next);
    const guess = guessFamily(next);
    if (guess && guess !== info.family) setNetwork(defaultNetworkFor(next) ?? network);
  };

  const chipValue = (pct: number) => {
    const target = floor6(pct === 100 ? available : (available * pct) / 100);
    return remaining === null ? target : Math.min(target, floor6(remaining));
  };

  const onSubmitted = () => {
    setDraft(null);
    setAmountText("");
    clearTimeout(navTimer.current);
    navTimer.current = setTimeout(() => setWalletSection("history"), NAV_DELAY_MS);
  };

  const breakdown: Array<[string, string]> = [
    ["Withdrawal amount", `${formatAmount(shownAmount)} USDT`],
    ["Network gas fee", `-${formatAmount(WITHDRAWAL_FEE)} USDT`],
  ];

  const meterFill =
    limit === null
      ? ""
      : used >= limit
        ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
        : used / limit > 0.8
          ? "bg-gradient-to-r from-orange-400 to-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]"
          : "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]";

  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} p-5`} aria-label="Payout destination">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold tracking-tight">Payout destination</h2>
          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={openKycModal}
            data-testid="wallet-kyc-badge"
            className={`${HIT} inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 ${FOCUS}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Verified Level {tier}
          </motion.button>
        </div>
        <div className="mt-4">
          <NetworkPicker name="withdraw-network" value={network} onChange={setNetwork} />
        </div>

        <label htmlFor="payout-address" className={`${EYEBROW} mt-5 block`}>
          Payout address
        </label>
        <div className="relative mt-2">
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <NetworkTile id={network} size="xs" />
          </span>
          <input
            id="payout-address"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={PLACEHOLDER[info.family]}
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            onBlur={() => setAddressTouched(true)}
            aria-invalid={addressTouched && addressProblem !== null}
            aria-describedby="payout-address-note"
            className={`w-full rounded-2xl border bg-canvas/60 py-3.5 pl-11 pr-3 font-mono text-xs text-fg shadow-inner shadow-black/30 outline-none transition-colors placeholder:text-fg-muted ${
              addressTouched && addressProblem
                ? "border-rose-500/60 focus:border-rose-400 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.16)]"
                : "border-gray-200 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.14)]"
            }`}
          />
        </div>
        <p id="payout-address-note" className="mt-2.5 min-h-4 text-xs leading-relaxed" aria-live="polite">
          {addressValid ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <Check className="h-3.5 w-3.5" aria-hidden /> Valid {info.chain} address for {info.label}
            </span>
          ) : addressTouched && addressProblem ? (
            <span className="text-rose-600">{addressProblem}</span>
          ) : family ? (
            <span className="text-fg-secondary">
              Detected a {FAMILY_NAME[family]} address. Network set to {info.label}.
            </span>
          ) : (
            <span className="text-fg-secondary">Paste the address; the network is detected automatically.</span>
          )}
        </p>
        {savedAddress && address !== savedAddress && (
          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={() => {
              onAddressChange(savedAddress);
              setAddressTouched(true);
            }}
            className={`${HIT} mt-2 inline-block rounded text-xs font-semibold text-amber-700 underline underline-offset-2 ${FOCUS}`}
          >
            Use saved payout address
          </motion.button>
        )}
      </section>

      <section className={`${CARD} p-5`} aria-label="Withdrawal amount">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="withdraw-amount" className={EYEBROW}>
            Amount
          </label>
          <span className="text-xs text-fg-secondary">
            Available{" "}
            <span className="font-mono font-semibold tabular-nums text-fg">{formatAmountFlexible(available)}</span> USDT
          </span>
        </div>
        <div className="mt-2">
          <AmountField
            id="withdraw-amount"
            value={amountText}
            onValueChange={setAmountText}
            invalid={amountProblem !== null}
            describedBy={amountProblem ? "withdraw-amount-error" : undefined}
          />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {CHIPS.map((pct) => {
            const value = chipValue(pct);
            return (
              <motion.button
                key={pct}
                type="button"
                whileTap={TAP}
                transition={SPRING}
                onClick={() => setAmountText(toInputText(value))}
                disabled={available <= 0}
                className={`min-h-11 rounded-xl border py-2 text-xs font-bold transition-colors disabled:opacity-40 ${FOCUS} ${
                  amount !== null && value > 0 && amount === value
                    ? "border-amber-300/60 btn-primary"
                    : "border-gray-200 bg-canvas/50 text-fg hover:border-gray-300"
                }`}
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </motion.button>
            );
          })}
        </div>
        {amountProblem && (
          <p
            id="withdraw-amount-error"
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-xs leading-relaxed text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden />
            <span className="flex-1">{amountProblem}</span>
            {fundsIssue && (
              <motion.button
                type="button"
                whileTap={TAP}
                transition={SPRING}
                onClick={() => setWalletSection("deposit")}
                className={`${HIT} shrink-0 rounded font-bold text-rose-800 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-rose-400`}
              >
                Deposit
              </motion.button>
            )}
            {limitIssue && (
              <motion.button
                type="button"
                whileTap={TAP}
                transition={SPRING}
                onClick={openKycModal}
                data-testid="raise-limit"
                className={`${HIT} shrink-0 rounded font-bold text-rose-800 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-rose-400`}
              >
                Raise limit
              </motion.button>
            )}
          </p>
        )}

        <div data-testid="limit-meter" className="mt-4 rounded-2xl border border-gray-200 bg-canvas/50 px-3.5 py-3">
          {limit === null ? (
            <p className="flex items-center gap-2 text-xs font-medium text-fg">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              Unlimited daily withdrawals · {tierDef(tier).name}
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-fg">Daily limit</span>
                <span className="font-mono tabular-nums text-fg-secondary">
                  <span data-testid="limit-used">{formatAmount(used)}</span> / {formatAmount(limit)} USDT
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Daily withdrawal limit used"
                aria-valuemin={0}
                aria-valuemax={limit}
                aria-valuenow={Math.round(used)}
                className="relative mt-2.5 h-1.5 rounded-full bg-gray-100"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${meterFill}`}
                  style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-fg-secondary">
                <span>
                  Remaining today{" "}
                  <span data-testid="limit-remaining" className="font-mono font-semibold tabular-nums text-fg">
                    {formatAmount(remaining ?? 0)}
                  </span>{" "}
                  USDT · resets 00:00 UTC
                </span>
                {tier === 1 && (
                  <motion.button
                    type="button"
                    whileTap={TAP}
                    transition={SPRING}
                    onClick={openKycModal}
                    className={`${HIT} shrink-0 rounded-md text-xs font-bold text-amber-700 underline underline-offset-2 ${FOCUS}`}
                  >
                    Upgrade
                  </motion.button>
                )}
              </div>
            </>
          )}
        </div>

        <dl
          className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-canvas/40"
          aria-label="Fee and settlement breakdown"
        >
          {breakdown.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 border-b border-dashed border-gray-200 px-3.5 py-2.5 text-sm"
            >
              <dt className="text-fg-secondary">{label}</dt>
              <dd className="font-mono font-medium tabular-nums">{value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-gray-200 px-3.5 py-2.5 text-sm">
            <dt className="flex items-center gap-1.5 text-fg-secondary">
              <Clock className="h-3.5 w-3.5" aria-hidden /> Est. arrival
            </dt>
            <dd className="font-mono font-medium">{WITHDRAWAL_ETA}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 bg-emerald-500/10 px-3.5 py-3.5 text-sm">
            <dt className="font-bold">Net receiving</dt>
            <dd
              data-testid="net-receiving"
              className="font-mono text-lg font-extrabold tabular-nums text-emerald-700 [text-shadow:0_0_18px_rgba(16,185,129,0.45)]"
            >
              {formatAmount(net)} USDT
            </dd>
          </div>
        </dl>

        <motion.button
          type="button"
          whileTap={canReview ? TAP_CTA : undefined}
          transition={SPRING}
          disabled={!canReview}
          onClick={() => {
            if (canReview && amount !== null) setDraft({ amount, address: trimmed, network });
          }}
          className={`${CTA} mt-4`}
        >
          Review Withdrawal
        </motion.button>
        <p className="mt-3 text-center text-[11px] text-fg-muted">
          Minimum {formatAmount(MIN_WITHDRAWAL)} USDT · Funds are held until the transfer completes
        </p>
      </section>

      <WithdrawConfirmSheet draft={draft} onClose={() => setDraft(null)} onSubmitted={onSubmitted} />
    </div>
  );
}
