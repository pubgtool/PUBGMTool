"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, Clock, ShieldCheck } from "lucide-react";
import { KycGate } from "@/components/kyc/KycGate";
import { NetworkPicker } from "@/components/screens/wallet/NetworkPicker";
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
} from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

const CARD = "rounded-3xl border border-slate-100 bg-white shadow-sm";
const CHIPS = [25, 50, 75, 100] as const;
const TAP = { scale: 0.96 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const NAV_DELAY_MS = 260;

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
    if (guess === "tron" && network !== "trc20") setNetwork("trc20");
    else if (guess === "evm" && network === "trc20") setNetwork("bep20");
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

  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} p-5`} aria-label="Payout destination">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Payout destination</h2>
          <button
            type="button"
            onClick={openKycModal}
            data-testid="wallet-kyc-badge"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Verified Level {tier}
          </button>
        </div>
        <div className="mt-3">
          <NetworkPicker name="withdraw-network" value={network} onChange={setNetwork} />
        </div>

        <label htmlFor="payout-address" className="mt-4 block text-xs font-medium uppercase tracking-wider text-slate-500">
          Payout address
        </label>
        <input
          id="payout-address"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={info.family === "tron" ? "T… (34 characters)" : "0x… (42 characters)"}
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          onBlur={() => setAddressTouched(true)}
          aria-invalid={addressTouched && addressProblem !== null}
          aria-describedby="payout-address-note"
          className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 font-mono text-[13px] outline-none transition-colors placeholder:text-slate-300 focus:border-slate-950 ${
            addressTouched && addressProblem ? "border-rose-300" : "border-slate-200"
          }`}
        />
        <p id="payout-address-note" className="mt-2 min-h-4 text-xs" aria-live="polite">
          {addressValid ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <Check className="h-3.5 w-3.5" aria-hidden /> Valid {info.chain} address for {info.label}
            </span>
          ) : addressTouched && addressProblem ? (
            <span className="text-rose-600">{addressProblem}</span>
          ) : family ? (
            <span className="text-slate-500">
              Detected a {family === "tron" ? "Tron" : "EVM"} address. Network set to {info.label}.
            </span>
          ) : (
            <span className="text-slate-500">Paste the address; the network is detected automatically.</span>
          )}
        </p>
        {savedAddress && address !== savedAddress && (
          <button
            type="button"
            onClick={() => {
              onAddressChange(savedAddress);
              setAddressTouched(true);
            }}
            className="mt-1 text-xs font-semibold text-slate-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            Use saved payout address
          </button>
        )}
      </section>

      <section className={`${CARD} p-5`} aria-label="Withdrawal amount">
        <div className="flex items-baseline justify-between">
          <label htmlFor="withdraw-amount" className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Amount
          </label>
          <span className="text-xs text-slate-500">
            Available <span className="font-mono font-medium tabular-nums text-slate-800">{formatAmountFlexible(available)}</span> USDT
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
                className={`rounded-xl border py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-40 ${
                  amount !== null && value > 0 && amount === value
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
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
            className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="flex-1">{amountProblem}</span>
            {fundsIssue && (
              <button
                type="button"
                onClick={() => setWalletSection("deposit")}
                className="shrink-0 font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Deposit
              </button>
            )}
            {limitIssue && (
              <button
                type="button"
                onClick={openKycModal}
                data-testid="raise-limit"
                className="shrink-0 font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Raise limit
              </button>
            )}
          </p>
        )}

        <div data-testid="limit-meter" className="mt-4 rounded-2xl bg-slate-50 px-3.5 py-3">
          {limit === null ? (
            <p className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              Unlimited daily withdrawals · {tierDef(tier).name}
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-slate-700">Daily limit</span>
                <span className="font-mono tabular-nums text-slate-500">
                  <span data-testid="limit-used">{formatAmount(used)}</span> / {formatAmount(limit)} USDT
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Daily withdrawal limit used"
                aria-valuemin={0}
                aria-valuemax={limit}
                aria-valuenow={Math.round(used)}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${used >= limit ? "bg-rose-500" : used / limit > 0.8 ? "bg-amber-500" : "bg-slate-900"}`}
                  style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>
                  Remaining today <span data-testid="limit-remaining" className="font-mono font-medium tabular-nums text-slate-700">{formatAmount(remaining ?? 0)}</span> USDT · resets 00:00 UTC
                </span>
                {tier === 1 && (
                  <button
                    type="button"
                    onClick={openKycModal}
                    className="shrink-0 rounded-md font-semibold text-slate-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <dl className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100" aria-label="Fee and settlement breakdown">
          {breakdown.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-mono font-medium tabular-nums">{value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between px-3.5 py-2.5 text-sm">
            <dt className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" aria-hidden /> Est. arrival
            </dt>
            <dd className="font-mono font-medium">{WITHDRAWAL_ETA}</dd>
          </div>
          <div className="flex items-center justify-between bg-slate-50 px-3.5 py-3 text-sm">
            <dt className="font-semibold">Net receiving</dt>
            <dd data-testid="net-receiving" className="font-mono text-base font-semibold tabular-nums text-emerald-600">
              {formatAmount(net)} USDT
            </dd>
          </div>
        </dl>

        <motion.button
          type="button"
          whileTap={canReview ? { scale: 0.98 } : undefined}
          transition={SPRING}
          disabled={!canReview}
          onClick={() => {
            if (canReview && amount !== null) setDraft({ amount, address: trimmed, network });
          }}
          className="mt-4 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
        >
          Review Withdrawal
        </motion.button>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Minimum {formatAmount(MIN_WITHDRAWAL)} USDT · Funds are held until the transfer completes
        </p>
      </section>

      <WithdrawConfirmSheet draft={draft} onClose={() => setDraft(null)} onSubmitted={onSubmitted} />
    </div>
  );
}
