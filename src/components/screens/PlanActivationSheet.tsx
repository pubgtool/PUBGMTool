"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Ticket, Wallet, X } from "lucide-react";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { formatAmountInput, parseAmountInput, toInputText } from "@/lib/amount";
import { formatAmount, formatAmountFlexible, formatReward } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import {
  PROJECTION_DAYS,
  isVoucherEligible,
  maxStakeFor,
  projectReward,
  remainingCapacity,
} from "@/lib/vaults";
import type { FundingSource } from "@/types/domain";

export interface ActivationRequest {
  tierId: string;
  source: FundingSource;
}

const CHIPS = [25, 50, 75, 100] as const;
const PROCESSING_MS = 600;
const TAP = { scale: 0.96 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Props {
  request: ActivationRequest | null;
  onClose: () => void;
}

export function PlanActivationSheet({ request, onClose }: Props) {
  return (
    <BottomSheet open={request !== null} onClose={onClose}>
      {request && <SheetBody key={request.tierId} request={request} onClose={onClose} />}
    </BottomSheet>
  );
}

function SheetBody({ request, onClose }: { request: ActivationRequest; onClose: () => void }) {
  const tier = useAppStore((s) => s.tiers.find((t) => t.id === request.tierId));
  const balances = useAppStore((s) => s.balances);
  const stakeInVault = useAppStore((s) => s.stakeInVault);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setWalletSection = useAppStore((s) => s.setWalletSection);

  const voucherEligible = tier ? isVoucherEligible(tier, balances.trialVoucher) : false;

  const [chosenSource, setChosenSource] = useState<FundingSource>(request.source);
  const [text, setText] = useState(() =>
    request.source === "voucher" && tier && isVoucherEligible(tier, balances.trialVoucher)
      ? toInputText(maxStakeFor(tier, balances.trialVoucher))
      : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Close if the tier was removed by an admin while the sheet was open.
  useEffect(() => {
    if (!tier) onClose();
  }, [tier, onClose]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    const caret = caretRef.current;
    caretRef.current = null;
    if (el && caret !== null && document.activeElement === el) el.setSelectionRange(caret, caret);
  }, [text]);

  if (!tier) return null;

  const source: FundingSource = voucherEligible ? chosenSource : "balance";
  const sourceBalance = source === "voucher" ? balances.trialVoucher : balances.available;
  const amount = parseAmountInput(text);
  const remaining = remainingCapacity(tier);

  let validation: string | null = null;
  let fundsIssue = false;
  if (!tier.isActive) {
    validation = `${tier.name} is closed for new investments.`;
  } else if (amount !== null) {
    if (amount <= 0) validation = "Enter an amount greater than 0.";
    else if (amount < tier.minDeposit)
      validation = `Minimum investment for ${tier.name} is ${formatAmountFlexible(tier.minDeposit)} USDT.`;
    else if (amount > tier.maxDeposit)
      validation = `Maximum investment for ${tier.name} is ${formatAmountFlexible(tier.maxDeposit)} USDT.`;
    else if (amount > remaining)
      validation = `Only ${formatAmountFlexible(remaining)} USDT of capacity is left in ${tier.name}.`;
    else if (amount > sourceBalance) {
      fundsIssue = true;
      validation =
        source === "voucher"
          ? `Exceeds your trial voucher (${formatAmountFlexible(sourceBalance)} USDT).`
          : `Insufficient available balance (${formatAmountFlexible(sourceBalance)} USDT).`;
    }
  } else if (source === "balance" && sourceBalance < tier.minDeposit) {
    fundsIssue = true;
    validation = `Your available balance is below the ${formatAmountFlexible(tier.minDeposit)} USDT minimum for ${tier.name}.`;
  }

  const notice = submitError ?? validation;
  const canSubmit = amount !== null && amount > 0 && validation === null && !submitting;
  const projected = amount ?? 0;
  const daily = projectReward(projected, tier.dailyRatePct, 1);
  const total = projectReward(projected, tier.dailyRatePct, PROJECTION_DAYS);

  const changeSource = (next: FundingSource) => {
    setChosenSource(next);
    setSubmitError(null);
    setText(next === "voucher" ? toInputText(maxStakeFor(tier, balances.trialVoucher)) : "");
  };

  const onAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, selectionStart } = event.target;
    const next = formatAmountInput(value, selectionStart ?? value.length);
    caretRef.current = next.caret;
    setSubmitError(null);
    setText(next.text);
  };

  const chipValue = (pct: number) =>
    maxStakeFor(tier, pct === 100 ? sourceBalance : (sourceBalance * pct) / 100);

  const applyChip = (pct: number) => {
    setSubmitError(null);
    setText(toInputText(chipValue(pct)));
  };

  const goDeposit = () => {
    setWalletSection("deposit");
    setActiveTab("wallet");
    onClose();
  };

  const submit = async () => {
    if (!canSubmit || amount === null) return;
    setSubmitting(true);
    setSubmitError(null);
    await wait(PROCESSING_MS);
    // Closing the sheet mid-processing cancels the activation.
    if (!mounted.current) return;
    const result = stakeInVault(tier.id, amount, source);
    if (result.ok) {
      toast.success(`Successfully unlocked ${tier.name}`);
      onClose();
    } else {
      setSubmitError(result.error);
      toast.error(result.error);
      setSubmitting(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-950 px-1.5 py-1 text-[10px] font-semibold leading-none text-white">
              {tier.name}
            </span>
            <SheetTitle className="text-lg font-semibold tracking-tight">Activate Plan</SheetTitle>
          </div>
          <SheetDescription className="mt-1.5 text-xs text-slate-500">
            <span className="font-mono font-semibold tabular-nums text-emerald-600">
              +{formatAmount(tier.dailyRatePct)}% daily income
            </span>
            <span className="tabular-nums">
              {" · "}Min {formatAmount(tier.minDeposit)} – Max {formatAmount(tier.maxDeposit)} USDT
            </span>
          </SheetDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full bg-slate-100 p-2 text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {voucherEligible ? (
        <fieldset className="grid gap-2">
          <legend className="sr-only">Payment source</legend>
          {(
            [
              ["balance", "Available Balance", balances.available, Wallet],
              ["voucher", "Trial Voucher", balances.trialVoucher, Ticket],
            ] as const
          ).map(([value, label, balance, Icon]) => (
            <label key={value} className="block cursor-pointer">
              <input
                type="radio"
                name="payment-source"
                value={value}
                checked={source === value}
                onChange={() => changeSource(value)}
                className="peer sr-only"
              />
              <span
                className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-slate-900 ${
                  source === value
                    ? value === "voucher"
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-950 bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    source === value ? "border-slate-950" : "border-slate-300"
                  }`}
                  aria-hidden
                >
                  {source === value && <span className="h-2 w-2 rounded-full bg-slate-950" />}
                </span>
                <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  ({formatAmount(balance)} USDT)
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
          <Wallet className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span className="flex-1 font-medium">Available Balance</span>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            ({formatAmount(balances.available)} USDT)
          </span>
        </div>
      )}

      <div>
        <label htmlFor="plan-amount" className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Investment Amount
        </label>
        <div
          className={`mt-2 flex items-baseline gap-2 rounded-2xl border bg-white px-4 py-3 transition-colors focus-within:border-slate-950 ${
            notice ? "border-rose-300" : "border-slate-200"
          }`}
        >
          <input
            ref={inputRef}
            id="plan-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={text}
            onChange={onAmountChange}
            aria-invalid={notice !== null}
            aria-describedby={notice ? "plan-amount-notice" : undefined}
            className="min-w-0 flex-1 bg-transparent font-mono text-3xl font-semibold tracking-tight tabular-nums outline-none placeholder:text-slate-300"
          />
          <span className="text-sm font-medium text-slate-400">USDT</span>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-2">
          {CHIPS.map((pct) => {
            const value = chipValue(pct);
            const selected = amount !== null && value > 0 && amount === value;
            return (
              <motion.button
                key={pct}
                type="button"
                whileTap={TAP}
                transition={SPRING}
                onClick={() => applyChip(pct)}
                disabled={sourceBalance <= 0}
                className={`rounded-xl border py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-40 ${
                  selected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </motion.button>
            );
          })}
        </div>

        {notice && (
          <p
            id="plan-amount-notice"
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="flex-1">{notice}</span>
            {fundsIssue && source === "balance" && (
              <button
                type="button"
                onClick={goDeposit}
                className="shrink-0 font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Deposit
              </button>
            )}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-400">Daily Profit</dt>
          <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-emerald-600">
            +{formatReward(daily)} USDT
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-slate-400">Total Contract Profit</dt>
          <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-emerald-600">
            +{formatReward(total)} USDT
          </dd>
          <p className="mt-0.5 text-[11px] text-slate-400">Projected over {PROJECTION_DAYS} days</p>
        </div>
      </dl>

      {source === "voucher" && (
        <p className="-mt-2 text-xs text-amber-700">
          Trial voucher principal can&apos;t be withdrawn. The daily income it earns is yours to keep.
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={canSubmit ? { scale: 0.98 } : undefined}
        transition={SPRING}
        disabled={!canSubmit && !submitting}
        aria-busy={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Activating…
          </>
        ) : (
          "Confirm Plan Activation"
        )}
      </motion.button>
    </form>
  );
}
