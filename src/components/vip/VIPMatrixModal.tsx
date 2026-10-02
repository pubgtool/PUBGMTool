"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { CrownBadge } from "@/components/vip/CrownBadge";
import { usdt } from "@/components/vip/cta";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { formatAmount } from "@/lib/format";
import { currentNode, dailyOutputOf, isTrialTier, quoteAllocation, tierDailyOutput } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.95 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

interface Props {
  open: boolean;
  /** Level to compare against first; falls back to the next level up. */
  targetLevel: number | null;
  onClose: () => void;
  onAllocate: (tierId: string) => void;
}

export function VIPMatrixModal({ open, targetLevel, onClose, onAllocate }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {open && <Body targetLevel={targetLevel} onClose={onClose} onAllocate={onAllocate} />}
    </BottomSheet>
  );
}

interface SideProps {
  label: string;
  level: number | null;
  daily: number;
  detail: string;
  accent?: boolean;
  testId: string;
}

function Side({ label, level, daily, detail, accent = false, testId }: SideProps) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center rounded-2xl border px-2 py-3.5 text-center ${
        accent ? "border-amber-400/50 bg-gradient-to-b from-amber-400/10 to-transparent" : "border-gray-200 bg-gray-50"
      }`}
    >
      <p className={`text-[10px] font-bold uppercase tracking-wider ${accent ? "text-amber-700" : "text-fg-muted"}`}>{label}</p>
      <div data-testid={`${testId}-badge`} className="mt-2">
        {level === null ? <span className="text-xs text-fg-muted">No node</span> : <CrownBadge level={level} size="pill" />}
      </div>
      <p data-testid={`${testId}-daily`} className={`mt-3 max-w-full truncate font-mono text-lg font-black tabular-nums ${level === null ? "text-fg-muted" : "text-emerald-600"}`}>
        {level === null ? "—" : `+${formatAmount(daily)}`}
      </p>
      <p className="text-[10px] font-semibold text-fg-muted">USDT / day</p>
      <p className="mt-2 max-w-full truncate text-[11px] text-fg-secondary">{detail}</p>
    </div>
  );
}

function Body({ targetLevel, onClose, onAllocate }: { targetLevel: number | null; onClose: () => void; onAllocate: (tierId: string) => void }) {
  const tiers = useAppStore((s) => s.tiers);
  const positions = useAppStore((s) => s.positions);
  const balances = useAppStore((s) => s.balances);
  const kycTier = useAppStore((s) => s.user.kycTier);
  const guest = useAppStore((s) => s.user.isGuest);

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.level - b.level), [tiers]);
  const node = currentNode(positions);
  const nodeTier = node ? sorted.find((t) => t.id === node.tierId) : undefined;
  const candidates = sorted.filter((t) => t.isActive && (node ? t.level > node.tierLevel : t.level > 0));

  const initial = candidates.find((t) => t.level === targetLevel) ?? candidates[0];
  const [pick, setPick] = useState<string | null>(initial?.id ?? null);
  const target = candidates.find((t) => t.id === pick) ?? initial;
  const quote = target ? quoteAllocation({ tier: target, positions, balances, kycTier, isGuest: guest, useVoucher: false }) : null;

  const nowOut = node ? dailyOutputOf(node) : 0;
  const nextOut = target ? tierDailyOutput(target) : 0;
  const gain = nextOut - nowOut;
  const gainPct = nowOut > 0 ? (gain / nowOut) * 100 : null;
  const payback = quote && gain > 0 && quote.price > 0 ? Math.ceil(quote.price / gain) : null;

  const detailOf = (fee: number, rate: number, trial: boolean) => (trial ? "Free · fixed reward" : `${usdt(fee)} USDT · ${rate.toFixed(2)}%`);

  return (
    <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SheetTitle className="text-lg font-extrabold tracking-tight">Upgrade Matrix</SheetTitle>
          <SheetDescription className="mt-1 text-xs text-fg-secondary">Your current node against the next tier.</SheetDescription>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={onClose}
          aria-label="Close"
          className="rounded-full bg-gray-100 p-2.5 text-fg-secondary outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="h-4 w-4" aria-hidden />
        </motion.button>
      </div>

      {target && quote ? (
        <section aria-label="Node comparison" data-testid="comparison" className="mt-5">
          <label htmlFor="matrix-target" className="text-[11px] font-bold uppercase tracking-wider text-fg-secondary">
            Compare with
          </label>
          <select
            id="matrix-target"
            data-testid="matrix-target"
            value={target.id}
            onChange={(event) => setPick(event.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-canvas px-4 py-3 text-base outline-none focus:border-amber-400"
          >
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.title}
              </option>
            ))}
          </select>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Side
              label={node ? "Your node" : "Now"}
              level={node ? node.tierLevel : null}
              daily={nowOut}
              detail={node ? detailOf(node.principal, node.dailyRatePct, isTrialTier(nodeTier ?? target) && node.tierLevel === 0) : "Nothing running"}
              testId="cmp-now"
            />
            <span className="btn-primary flex h-8 w-8 items-center justify-center rounded-full shadow-btn" aria-hidden>
              <ArrowRight className="h-4 w-4" />
            </span>
            <Side label="Next tier" level={target.level} daily={nextOut} detail={detailOf(target.feeUsdt, target.dailyRatePct, isTrialTier(target))} accent testId="cmp-next" />
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4" data-testid="cmp-summary">
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg-secondary">Extra output</p>
            <p className="mt-1 flex items-baseline gap-2">
              <AnimatedNumber
                value={gain}
                prefix="+"
                testId="cmp-gain"
                className="font-mono text-3xl font-black tabular-nums text-emerald-600 [text-shadow:0_0_22px_rgba(16,185,129,0.5)]"
              />
              <span className="text-sm font-bold text-emerald-700/80">USDT / day</span>
            </p>
            {gainPct !== null && <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-amber-700">+{gainPct.toFixed(1)}% vs your node</p>}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">{quote.kind === "upgrade" ? "Upgrade cost" : "Allocation fee"}</dt>
                <dd data-testid="cmp-cost" className="mt-1 font-mono text-sm font-bold tabular-nums text-fg">
                  {usdt(quote.price)} USDT
                </dd>
                {quote.credit > 0 && <dd className="text-[11px] text-fg-muted">after {usdt(quote.credit)} credit</dd>}
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Extra output pays back</dt>
                <dd data-testid="cmp-payback" className="mt-1 font-mono text-sm font-bold tabular-nums text-fg">
                  {payback ? `~${payback} days` : "n/a"}
                </dd>
              </div>
            </dl>
          </div>

          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={() => {
              onClose();
              onAllocate(target.id);
            }}
            data-testid="cmp-upgrade"
            className="btn-primary mt-3 w-full rounded-2xl py-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
          >
            {quote.kind === "upgrade" ? `Upgrade to ${target.name}` : `Allocate ${target.name}`}
          </motion.button>
        </section>
      ) : (
        <p data-testid="cmp-top" className="mt-5 rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-fg-secondary">
          You already run the highest level available. There is nothing above it to compare.
        </p>
      )}

      <section aria-label="All node levels" className="mt-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-fg-secondary">All levels</h3>
        <ul data-testid="matrix-table" className="no-scrollbar -mx-5 mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-2">
          {sorted.map((t) => {
            const yours = node?.tierLevel === t.level;
            return (
              <li
                key={t.id}
                data-testid={`matrix-row-${t.level}`}
                className={`w-36 shrink-0 snap-start rounded-2xl border p-3.5 ${
                  yours ? "border-amber-400/60 bg-gradient-to-b from-amber-400/10 to-transparent" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <CrownBadge level={t.level} size="pill" />
                  {yours && <span className="text-[10px] font-black uppercase tracking-wide text-amber-700">You</span>}
                </div>
                <p className="mt-3 truncate font-mono text-base font-black tabular-nums text-emerald-600">+{formatAmount(tierDailyOutput(t))}</p>
                <p className="text-[10px] font-semibold text-fg-muted">USDT / day</p>
                <p className="mt-2 truncate text-[11px] text-fg-secondary">{t.feeUsdt === 0 ? "Free trial" : `${formatAmount(t.feeUsdt, 0)} USDT`}</p>
                <p className="truncate text-[11px] text-fg-muted">{isTrialTier(t) ? "Fixed reward" : `${t.dailyRatePct.toFixed(1)}% daily`}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
