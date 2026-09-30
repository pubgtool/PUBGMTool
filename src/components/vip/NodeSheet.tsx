"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Loader2, ShieldAlert, Ticket, X } from "lucide-react";
import { DepositPanel } from "@/components/screens/wallet/DepositPanel";
import { TierBadge } from "@/components/vip/parts";
import { blockText, usdt } from "@/components/vip/cta";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { BurstEffect } from "@/components/ui/Burst";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { wait } from "@/lib/async";
import { haptic, playChime } from "@/lib/feedback";
import { formatAmount } from "@/lib/format";
import { currentNode, dailyOutputOf, quoteAllocation, tierDailyOutput } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";
import { formatCountdown, msUntilNextUtcDay } from "@/lib/time";
import { MIN_DEPOSIT } from "@/lib/wallet";

const PROCESSING_MS = 550;
const TAP = { scale: 0.98 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

type View = "review" | "deposit" | "done";
interface Done {
  kind: "activate" | "upgrade";
  fromLevel: number | null;
  charged: number;
}

interface Props {
  tierId: string | null;
  onClose: () => void;
}

export function NodeSheet({ tierId, onClose }: Props) {
  return (
    <BottomSheet open={tierId !== null} onClose={onClose} keyboardAware>
      {tierId && <Body key={tierId} tierId={tierId} onClose={onClose} />}
    </BottomSheet>
  );
}

function Row({ label, value, tone = "default", testId }: { label: string; value: React.ReactNode; tone?: "default" | "green"; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd data-testid={testId} className={`text-right font-mono font-medium tabular-nums ${tone === "green" ? "text-emerald-600" : "text-slate-900"}`}>
        {value}
      </dd>
    </div>
  );
}

function Body({ tierId, onClose }: { tierId: string; onClose: () => void }) {
  const tier = useAppStore((s) => s.tiers.find((t) => t.id === tierId));
  const positions = useAppStore((s) => s.positions);
  const balances = useAppStore((s) => s.balances);
  const kycTier = useAppStore((s) => s.user.kycTier);
  const guest = useAppStore((s) => s.user.isGuest);
  const allocateNode = useAppStore((s) => s.allocateNode);
  const openKycModal = useAppStore((s) => s.openKycModal);
  const reduceMotion = useReducedMotion();

  const [useVoucher, setUseVoucher] = useState(balances.trialVoucher > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [burst, setBurst] = useState(0);
  const [depositNote, setDepositNote] = useState<string | null>(null);
  const [forceDeposit, setForceDeposit] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const quote = useMemo(
    () => (tier ? quoteAllocation({ tier, positions, balances, kycTier, isGuest: guest, useVoucher }) : null),
    [tier, positions, balances, kycTier, guest, useVoucher],
  );

  // A removed tier or a sign-out while open leaves nothing sensible to show.
  useEffect(() => {
    if (!tier || guest) onClose();
  }, [tier, guest, onClose]);

  const view: View = done ? "done" : forceDeposit || (quote && quote.shortfall > 0 && !quote.blocked) ? "deposit" : "review";

  const submit = useCallback(async () => {
    if (!tier || !quote || busy) return;
    setBusy(true);
    setError(null);
    await wait(PROCESSING_MS);
    if (!mounted.current) return;
    const result = allocateNode(tier.id, { useVoucher });
    setBusy(false);
    if (result.ok) {
      haptic([20, 50, 30]);
      playChime("allocate");
      setBurst((n) => n + 1);
      setDone({ kind: result.kind, fromLevel: quote.fromLevel, charged: result.charged });
      toast.success(result.kind === "upgrade" ? `Upgraded to ${tier.name}` : `${tier.name} node is running`);
    } else if (result.reason === "funds") {
      setForceDeposit(true);
    } else {
      setError(result.error);
    }
  }, [tier, quote, busy, allocateNode, useVoucher]);

  if (!tier || !quote) return null;

  const upgrading = quote.kind === "upgrade";
  const current = currentNode(positions);
  const currentOutput = current ? dailyOutputOf(current) : 0;
  const output = tierDailyOutput(tier);
  const blocked = blockText(quote);
  const prefill = Math.max(quote.shortfall, MIN_DEPOSIT);
  const heading = view === "done" ? (done?.kind === "upgrade" ? "Node upgraded" : "Node running") : view === "deposit" ? "Deposit USDT" : upgrading ? `Upgrade to ${tier.name}` : `Allocate ${tier.name}`;

  return (
    <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TierBadge level={tier.level} />
            <SheetTitle className="truncate text-lg font-semibold tracking-tight">{heading}</SheetTitle>
          </div>
          <SheetDescription className="mt-1.5 truncate text-xs text-slate-500">{tier.title}</SheetDescription>
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

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          data-testid={`node-sheet-${view}`}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
          className="mt-5"
        >
          {view === "review" && (
            <div className="flex flex-col gap-4">
              <dl className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                <Row label="Allocation fee" value={quote.fee === 0 ? "Free" : `${formatAmount(quote.fee)} USDT`} testId="sheet-fee" />
                {upgrading && quote.credit > 0 && (
                  <Row label={`Credit from VIP ${quote.fromLevel}`} value={`-${formatAmount(quote.credit)} USDT`} tone="green" testId="sheet-credit" />
                )}
                {quote.voucherApplied > 0 && <Row label="Trial voucher" value={`-${formatAmount(quote.voucherApplied)} USDT`} tone="green" testId="sheet-voucher" />}
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-3.5 py-3 text-sm">
                  <dt className="font-semibold">{upgrading ? "You pay (difference)" : "You pay"}</dt>
                  <dd data-testid="sheet-pay" className="font-mono text-base font-semibold tabular-nums">
                    {formatAmount(quote.cashDue)} USDT
                  </dd>
                </div>
                <Row label="Wallet after" value={`${formatAmount(Math.max(0, quote.available - quote.cashDue))} USDT`} testId="sheet-after" />
              </dl>

              {balances.trialVoucher > 0 && quote.price > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <Ticket className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                  <span className="min-w-0 flex-1 text-xs">
                    <span className="block font-semibold text-amber-900">Use trial voucher ({formatAmount(balances.trialVoucher)} USDT)</span>
                    <span className="block text-amber-800/80">Counts toward the fee. Its value can&apos;t be withdrawn.</span>
                  </span>
                  <Switch label="Use trial voucher" checked={useVoucher} onChange={setUseVoucher} />
                </div>
              )}

              <dl className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 px-3.5 py-3">
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Daily output</dt>
                  <dd data-testid="sheet-output" className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatAmount(output)} USDT
                  </dd>
                  {upgrading && output > currentOutput && (
                    <dd data-testid="sheet-gain" className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-emerald-600">
                      +{formatAmount(output - currentOutput)} / day
                    </dd>
                  )}
                </div>
                <div className="rounded-2xl bg-slate-50 px-3.5 py-3">
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Next distribution</dt>
                  <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">{formatCountdown(msUntilNextUtcDay(Date.now()))}</dd>
                  <dd className="mt-0.5 text-xs text-slate-500">then every 00:00 UTC</dd>
                </div>
              </dl>

              {blocked && (
                <p role="alert" data-testid="sheet-blocked" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                  <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  {blocked}
                </p>
              )}
              {error && (
                <p role="alert" data-testid="sheet-error" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                  {error}
                </p>
              )}
              {depositNote && (
                <p role="status" data-testid="sheet-deposit-note" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
                  {depositNote}
                </p>
              )}

              {quote.blocked === "kyc" ? (
                <motion.button
                  type="button"
                  whileTap={TAP}
                  transition={SPRING}
                  onClick={() => {
                    onClose();
                    openKycModal();
                  }}
                  data-testid="sheet-verify"
                  className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                >
                  Verify identity (Level {quote.kycRequired})
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileTap={busy || quote.blocked ? undefined : TAP}
                  transition={SPRING}
                  onClick={() => void submit()}
                  disabled={busy || quote.blocked !== null}
                  aria-busy={busy}
                  data-testid="sheet-confirm"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-300"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Allocating…
                    </>
                  ) : upgrading ? (
                    "Confirm Upgrade"
                  ) : quote.fee === 0 ? (
                    "Start Free Trial"
                  ) : (
                    "Confirm Allocation"
                  )}
                </motion.button>
              )}
            </div>
          )}

          {view === "deposit" && (
            <div className="flex flex-col gap-4">
              <div data-testid="deposit-banner" className="rounded-2xl bg-slate-950 px-4 py-3.5 text-white">
                <p className="text-sm font-semibold">
                  Deposit {usdt(quote.shortfall > 0 ? quote.shortfall : prefill)} USDT to allocate {tier.name}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  You have {formatAmount(quote.available)} USDT and need {formatAmount(quote.cashDue)} USDT.
                  {quote.shortfall > 0 && quote.shortfall < MIN_DEPOSIT && ` The minimum deposit is ${formatAmount(MIN_DEPOSIT)} USDT, so that amount is pre-filled.`}
                </p>
              </div>
              <DepositPanel
                initialAmount={prefill}
                onDeposited={(amount) => {
                  setForceDeposit(false);
                  setDepositNote(`${formatAmount(amount)} USDT added to your wallet. Confirm your allocation.`);
                }}
              />
              {forceDeposit && quote.shortfall <= 0 && (
                <button
                  type="button"
                  onClick={() => setForceDeposit(false)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm font-semibold outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden /> Back to allocation
                </button>
              )}
            </div>
          )}

          {view === "done" && done && (
            <div className="flex flex-col items-center py-2 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <motion.span
                  initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-lg"
                >
                  <Check className="h-8 w-8" aria-hidden />
                </motion.span>
                <BurstEffect burstKey={burst} count={18} radius={84} />
              </div>
              <p data-testid="sheet-done-title" className="mt-4 text-lg font-semibold tracking-tight">
                {done.kind === "upgrade" ? `Upgraded to ${tier.name}` : `${tier.name} node is running`}
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                {done.kind === "upgrade" && done.fromLevel !== null
                  ? `Only the difference (${formatAmount(done.charged)} USDT) was charged. The new rate applies from now.`
                  : "Output starts building now and is distributed at 00:00 UTC."}
              </p>
              <p className="mt-3 font-mono text-sm font-semibold tabular-nums text-emerald-600">+{formatAmount(output)} USDT / day</p>
              <button
                type="button"
                onClick={onClose}
                data-testid="sheet-done"
                className="mt-5 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
