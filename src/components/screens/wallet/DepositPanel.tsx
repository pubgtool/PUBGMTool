"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, CircleAlert, CircleDollarSign, Copy, Loader2, QrCode, RefreshCw } from "lucide-react";
import { NetworkPicker } from "@/components/screens/wallet/NetworkPicker";
import { QrSheet } from "@/components/screens/wallet/QrSheet";
import {
  CARD,
  EYEBROW,
  FOCUS,
  PREMIUM_CARD,
  SPRING,
  TAP,
  TAP_CTA,
  WARNING_STRIP,
} from "@/components/screens/wallet/styles";
import { AmountField } from "@/components/ui/AmountField";
import { DemoTools } from "@/components/ui/DemoTools";
import { toast } from "@/components/ui/Toast";
import { parseAmountInput, toInputText } from "@/lib/amount";
import { copyText } from "@/lib/clipboard";
import { formatAmount } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { DEPOSIT_WINDOW_MS, MIN_DEPOSIT, depositAddressFor, getNetwork } from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

const QUICK_AMOUNTS = [100, 500, 1_000, 5_000] as const;
const ARRIVAL_DELAY_MS = 500;
const WARN_AT_SECONDS = 60;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/** Whole seconds left, derived from wall-clock time so background throttling cannot drift it. */
function useSecondsLeft(expiresAt: number): number {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
  useEffect(() => {
    const read = () => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    setSeconds(read());
    const id = setInterval(() => setSeconds(read()), 250);
    return () => clearInterval(id);
  }, [expiresAt]);
  return seconds;
}

interface DepositPanelProps {
  /** Pre-fills the demo amount, e.g. the exact shortfall for a purchase. */
  initialAmount?: number;
  onDeposited?: (amount: number) => void;
}

export function DepositPanel({ initialAmount, onDeposited }: DepositPanelProps = {}) {
  const userId = useAppStore((s) => s.user.id);
  const deposit = useAppStore((s) => s.deposit);
  const reduceMotion = useReducedMotion();

  const [network, setNetwork] = useState<PaymentNetwork>("trc20");
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + DEPOSIT_WINDOW_MS);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [amountText, setAmountText] = useState(() => (initialAmount ? toInputText(initialAmount) : "100"));
  const [busy, setBusy] = useState(false);

  const mounted = useRef(true);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(copiedTimer.current);
    };
  }, []);

  const info = getNetwork(network);
  const address = useMemo(() => depositAddressFor(userId, network), [userId, network]);
  const secondsLeft = useSecondsLeft(expiresAt);
  const expired = secondsLeft === 0;
  const urgent = !expired && secondsLeft <= WARN_AT_SECONDS;

  const amount = parseAmountInput(amountText);
  const amountError =
    amount !== null && amount < MIN_DEPOSIT ? `Minimum deposit is ${formatAmount(MIN_DEPOSIT)} USDT.` : null;
  const canCredit = amount !== null && !amountError && !expired && !busy;

  const restartWindow = () => setExpiresAt(Date.now() + DEPOSIT_WINDOW_MS);

  const changeNetwork = (next: PaymentNetwork) => {
    setNetwork(next);
    restartWindow();
    setCopied(false);
  };

  const onCopy = async () => {
    if (expired) return;
    const ok = await copyText(address);
    if (!ok) {
      toast.error("Couldn't copy. Select the address and copy it manually.");
      return;
    }
    toast.success("Deposit address copied");
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2_000);
  };

  const creditDeposit = async () => {
    if (!canCredit || amount === null) return;
    setBusy(true);
    await wait(ARRIVAL_DELAY_MS);
    if (!mounted.current) return;
    const result = deposit(amount, network);
    setBusy(false);
    if (result.ok) {
      toast.success(`Deposit of ${formatAmount(amount)} USDT credited via ${info.label}`);
      onDeposited?.(amount);
    } else toast.error(result.error);
  };

  const fillPct = (secondsLeft / (DEPOSIT_WINDOW_MS / 1000)) * 100;

  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} p-5`} aria-label="Deposit network">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-400/25">
            <CircleDollarSign className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight tracking-tight">USDT · Tether</p>
            <p className="mt-0.5 text-xs text-fg-secondary">Fixed settlement currency</p>
          </div>
        </div>
        <div className="mt-4">
          <NetworkPicker name="deposit-network" value={network} onChange={changeNetwork} />
        </div>
      </section>

      <section className={`${PREMIUM_CARD} p-5`} aria-label="Payment details">
        <p className={WARNING_STRIP}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <span>
            <strong className="font-bold text-amber-900">Demo address</strong> — nobody holds its keys. Never send real
            funds to it.
          </span>
        </p>

        <p className={`${EYEBROW} mt-5`}>Deposit address · {info.short}</p>
        <p
          data-testid="deposit-address"
          className={`mt-2 break-all rounded-2xl border border-gray-200 bg-canvas/70 px-3.5 py-3.5 font-mono text-[13px] font-medium leading-relaxed text-fg transition-opacity ${
            expired ? "opacity-50" : ""
          }`}
        >
          {address}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={expired ? undefined : TAP_CTA}
            transition={SPRING}
            onClick={onCopy}
            disabled={expired}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl btn-primary px-3 py-3 text-sm disabled:cursor-not-allowed ${FOCUS}`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden /> Copy
              </>
            )}
          </motion.button>
          <motion.button
            type="button"
            whileTap={expired ? undefined : TAP}
            transition={SPRING}
            onClick={() => setQrOpen(true)}
            disabled={expired}
            aria-haspopup="dialog"
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/[0.07] px-3 py-3 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
          >
            <QrCode className="h-4 w-4" aria-hidden /> Show QR
          </motion.button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-medium text-fg-secondary">
              {expired ? (
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              ) : (
                <span className="relative flex h-2 w-2">
                  {!reduceMotion && (
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                        urgent ? "bg-rose-400" : "bg-amber-400"
                      }`}
                    />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${urgent ? "bg-rose-500" : "bg-amber-500"}`}
                  />
                </span>
              )}
              Payment window
            </span>
            <span
              role="timer"
              aria-label={expired ? "Payment window expired" : `${clock(secondsLeft)} remaining`}
              data-testid="deposit-countdown"
              className={`font-mono text-base font-bold tabular-nums ${
                expired ? "text-rose-600" : urgent ? "text-rose-600" : "text-fg"
              }`}
            >
              {clock(secondsLeft)}
            </span>
          </div>
          <div className="relative mt-2.5 h-1.5 rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                expired
                  ? "bg-rose-500"
                  : urgent
                    ? "bg-gradient-to-r from-orange-400 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.65)]"
                    : "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {expired && (
            <motion.button
              type="button"
              whileTap={TAP}
              transition={SPRING}
              onClick={restartWindow}
              className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/50 bg-amber-500/10 py-2.5 text-sm font-bold text-amber-700 ${FOCUS}`}
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Restart payment window
            </motion.button>
          )}
        </div>

        <ul className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-xs leading-relaxed text-fg-secondary">
          <li className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
            <span>
              Send only USDT on{" "}
              <strong className="font-semibold text-fg">
                {info.chain} ({info.short})
              </strong>
              . Other assets or networks can&apos;t be recovered.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
            <span>Minimum deposit {formatAmount(MIN_DEPOSIT)} USDT.</span>
          </li>
        </ul>
      </section>

      <DemoTools label="Demo tools" testId="deposit-demo-tools">
        <div className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-fg-secondary">Credit a demo transfer to your available balance.</p>
          <div>
            <label htmlFor="sim-amount" className="sr-only">
              Demo deposit amount
            </label>
            <AmountField
              id="sim-amount"
              value={amountText}
              onValueChange={setAmountText}
              invalid={amountError !== null}
              describedBy={amountError ? "sim-amount-error" : undefined}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <motion.button
                key={value}
                type="button"
                whileTap={TAP}
                transition={SPRING}
                onClick={() => setAmountText(toInputText(value))}
                className={`min-h-11 rounded-xl border py-2 text-xs font-bold tabular-nums transition-colors ${FOCUS} ${
                  amount === value
                    ? "border-amber-300/60 btn-primary"
                    : "border-gray-200 bg-canvas/50 text-fg hover:border-gray-300"
                }`}
              >
                {formatAmount(value, 0)}
              </motion.button>
            ))}
          </div>
          {amountError && (
            <p id="sim-amount-error" role="alert" className="text-xs text-rose-600">
              {amountError}
            </p>
          )}
          <motion.button
            type="button"
            whileTap={canCredit ? TAP_CTA : undefined}
            transition={SPRING}
            onClick={creditDeposit}
            disabled={!canCredit && !busy}
            aria-busy={busy}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl btn-primary py-4 text-sm disabled:cursor-not-allowed ${FOCUS}`}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Crediting…
              </>
            ) : (
              "Credit Demo Deposit"
            )}
          </motion.button>
          {expired && (
            <p className="text-center text-xs text-fg-secondary">
              Restart the payment window to credit a demo deposit.
            </p>
          )}
        </div>
      </DemoTools>

      <QrSheet
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        network={network}
        address={address}
        copied={copied}
        expired={expired}
        onCopy={onCopy}
        onRestart={restartWindow}
      />
    </div>
  );
}
