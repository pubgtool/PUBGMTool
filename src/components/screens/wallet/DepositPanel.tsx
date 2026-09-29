"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, CircleDollarSign, Copy, FlaskConical, Loader2, RefreshCw } from "lucide-react";
import { NetworkPicker } from "@/components/screens/wallet/NetworkPicker";
import { AmountField } from "@/components/ui/AmountField";
import { QrCode } from "@/components/ui/QrCode";
import { toast } from "@/components/ui/Toast";
import { parseAmountInput, toInputText } from "@/lib/amount";
import { copyText } from "@/lib/clipboard";
import { formatAmount } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { DEPOSIT_WINDOW_MS, MIN_DEPOSIT, depositAddressFor, getNetwork } from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

const CARD = "rounded-3xl border border-slate-100 bg-white shadow-sm";
const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
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

export function DepositPanel() {
  const userId = useAppStore((s) => s.user.id);
  const deposit = useAppStore((s) => s.deposit);

  const [network, setNetwork] = useState<PaymentNetwork>("trc20");
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + DEPOSIT_WINDOW_MS);
  const [copied, setCopied] = useState(false);
  const [amountText, setAmountText] = useState("100");
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
  const canSimulate = amount !== null && !amountError && !expired && !busy;

  const changeNetwork = (next: PaymentNetwork) => {
    setNetwork(next);
    setExpiresAt(Date.now() + DEPOSIT_WINDOW_MS);
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

  const simulate = async () => {
    if (!canSimulate || amount === null) return;
    setBusy(true);
    await wait(ARRIVAL_DELAY_MS);
    if (!mounted.current) return;
    const result = deposit(amount, network);
    setBusy(false);
    if (result.ok) toast.success(`Deposit of ${formatAmount(amount)} USDT credited via ${info.label}`);
    else toast.error(result.error);
  };

  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} p-5`} aria-label="Deposit network">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CircleDollarSign className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">USDT · Tether</p>
            <p className="text-xs text-slate-500">Fixed settlement currency</p>
          </div>
        </div>
        <div className="mt-4">
          <NetworkPicker name="deposit-network" value={network} onChange={changeNetwork} />
        </div>
      </section>

      <section className={`${CARD} p-5`} aria-label="Payment details">
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Sandbox address.</strong> This address is simulated and nobody
            holds its keys. Never send real funds to it.
          </span>
        </p>

        <div className="relative mx-auto mt-4 w-48">
          <div
            className={`rounded-2xl border border-slate-200 bg-white p-2 transition-opacity ${
              expired ? "opacity-20" : ""
            }`}
          >
            <QrCode value={address} label={`${info.label} deposit address QR code`} className="block h-auto w-full" />
          </div>
          {expired && (
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-700">
              Window expired
            </span>
          )}
        </div>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Deposit address · {info.short}
        </p>
        <p
          data-testid="deposit-address"
          className="mt-1.5 break-all rounded-2xl bg-slate-50 px-3.5 py-3 font-mono text-[13px] font-medium leading-relaxed text-slate-900"
        >
          {address}
        </p>

        <motion.button
          type="button"
          whileTap={expired ? undefined : TAP}
          transition={SPRING}
          onClick={onCopy}
          disabled={expired}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-sm font-medium text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden /> Copy Deposit Address
            </>
          )}
        </motion.button>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
              {expired ? (
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              ) : (
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      urgent ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${urgent ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                </span>
              )}
              Payment window
            </span>
            <span
              role="timer"
              aria-label={expired ? "Payment window expired" : `${clock(secondsLeft)} remaining`}
              data-testid="deposit-countdown"
              className={`font-mono text-lg font-semibold tabular-nums ${
                expired ? "text-rose-600" : urgent ? "text-amber-600" : "text-slate-950"
              }`}
            >
              {clock(secondsLeft)}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                expired ? "bg-rose-500" : urgent ? "bg-amber-500" : "bg-slate-900"
              }`}
              style={{ width: `${(secondsLeft / (DEPOSIT_WINDOW_MS / 1000)) * 100}%` }}
            />
          </div>
          {expired && (
            <button
              type="button"
              onClick={() => setExpiresAt(Date.now() + DEPOSIT_WINDOW_MS)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Restart payment window
            </button>
          )}
        </div>

        <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-slate-500">
          <li>
            Send only USDT on <strong className="font-semibold text-slate-700">{info.chain} ({info.short})</strong>.
            Other assets or networks can&apos;t be recovered.
          </li>
          <li>Minimum deposit {formatAmount(MIN_DEPOSIT)} USDT.</li>
        </ul>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5" aria-label="Testnet sandbox">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-slate-500" aria-hidden />
          <h2 className="text-sm font-semibold">Testnet Sandbox</h2>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-slate-500">
            QA only
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">Credit a simulated transfer to your available balance.</p>

        <div className="mt-3">
          <label htmlFor="sim-amount" className="sr-only">
            Simulated deposit amount
          </label>
          <AmountField
            id="sim-amount"
            value={amountText}
            onValueChange={setAmountText}
            invalid={amountError !== null}
            describedBy={amountError ? "sim-amount-error" : undefined}
          />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <motion.button
              key={value}
              type="button"
              whileTap={TAP}
              transition={SPRING}
              onClick={() => setAmountText(toInputText(value))}
              className={`rounded-xl border py-2 text-xs font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                amount === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {formatAmount(value, 0)}
            </motion.button>
          ))}
        </div>
        {amountError && (
          <p id="sim-amount-error" role="alert" className="mt-2 text-xs text-rose-600">
            {amountError}
          </p>
        )}

        <motion.button
          type="button"
          whileTap={canSimulate ? { scale: 0.98 } : undefined}
          transition={SPRING}
          onClick={simulate}
          disabled={!canSimulate && !busy}
          aria-busy={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white outline-none transition-colors hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Crediting…
            </>
          ) : (
            "Simulate Deposit Arrival (Instant Credit)"
          )}
        </motion.button>
        {expired && <p className="mt-2 text-center text-xs text-slate-500">Restart the payment window to simulate a deposit.</p>}
      </section>
    </div>
  );
}
