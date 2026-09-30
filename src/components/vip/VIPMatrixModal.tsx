"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { TierBadge } from "@/components/vip/parts";
import { usdt } from "@/components/vip/cta";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { formatAmount } from "@/lib/format";
import { currentNode, dailyOutputOf, isTrialTier, quoteAllocation, tierDailyOutput, tierMonthlyOutput } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";
import type { VipTier } from "@/types/domain";

const TAP = { scale: 0.98 } as const;
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

const kycText = (t: Pick<VipTier, "minKycTier">) => (t.minKycTier === 0 ? "None" : `Level ${t.minKycTier}`);
const fee = (n: number) => (n === 0 ? "Free" : `${formatAmount(n, 0)}`);

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

  const rows: Array<{ label: string; now: string; next: string; testId: string }> = target
    ? [
        { label: "Allocation fee", now: node ? fee(node.principal) : "—", next: fee(target.feeUsdt), testId: "fee" },
        { label: "Daily distribution", now: node ? (isTrialTier(nodeTier ?? target) && node.tierLevel === 0 ? "Fixed" : `${node.dailyRatePct.toFixed(2)}%`) : "—", next: isTrialTier(target) ? "Fixed" : `${target.dailyRatePct.toFixed(2)}%`, testId: "rate" },
        { label: "Daily output", now: node ? formatAmount(nowOut) : "—", next: formatAmount(nextOut), testId: "daily" },
        { label: "Monthly projected", now: node ? formatAmount(Math.round(nowOut * 30 * 1e6) / 1e6) : "—", next: formatAmount(tierMonthlyOutput(target)), testId: "monthly" },
        { label: "Hashrate capacity", now: nodeTier ? `${formatAmount(nodeTier.hashrateTh, nodeTier.hashrateTh < 10 ? 1 : 0)} TH/s` : "—", next: `${formatAmount(target.hashrateTh, target.hashrateTh < 10 ? 1 : 0)} TH/s`, testId: "hash" },
        { label: "Minimum KYC", now: nodeTier ? kycText(nodeTier) : "—", next: kycText(target), testId: "kyc" },
      ]
    : [];

  return (
    <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SheetTitle className="text-lg font-semibold tracking-tight">Upgrade Matrix</SheetTitle>
          <SheetDescription className="mt-1 text-xs text-slate-500">Your current node against the next tier.</SheetDescription>
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

      {target && quote ? (
        <section aria-label="Node comparison" data-testid="comparison" className="mt-5">
          <label htmlFor="matrix-target" className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Compare with
          </label>
          <select
            id="matrix-target"
            data-testid="matrix-target"
            value={target.id}
            onChange={(event) => setPick(event.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-950"
          >
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.title}
              </option>
            ))}
          </select>

          <div className="mt-4 grid grid-cols-[1.1fr_1fr_1fr] gap-x-2 text-[11px]">
            <span />
            <span className="pb-2 text-right font-semibold uppercase tracking-wider text-slate-400">{node ? "Your node" : "Now"}</span>
            <span className="pb-2 text-right font-semibold uppercase tracking-wider text-slate-950">Next tier</span>
            <span />
            <span data-testid="cmp-now-badge" className="pb-3 text-right">
              {node ? <TierBadge level={node.tierLevel} /> : <span className="text-slate-400">No node</span>}
            </span>
            <span className="pb-3 text-right">
              <TierBadge level={target.level} />
            </span>
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <span className="border-t border-slate-100 py-2.5 text-slate-500">{row.label}</span>
                <span data-testid={`cmp-now-${row.testId}`} className="border-t border-slate-100 py-2.5 text-right font-mono text-sm tabular-nums text-slate-600">
                  {row.now}
                </span>
                <span data-testid={`cmp-next-${row.testId}`} className="border-t border-slate-100 py-2.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-950">
                  {row.next}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl bg-slate-950 p-4 text-white" data-testid="cmp-summary">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Incremental daily network reward</p>
            <p data-testid="cmp-gain" className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-300">
              +{formatAmount(gain)} <span className="text-sm text-slate-400">USDT / day</span>
            </p>
            {gainPct !== null && <p className="mt-0.5 font-mono text-xs tabular-nums text-emerald-400">+{gainPct.toFixed(1)}% vs your node</p>}
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-400">{quote.kind === "upgrade" ? "Upgrade cost" : "Allocation fee"}</dt>
                <dd data-testid="cmp-cost" className="mt-0.5 font-mono font-semibold tabular-nums">
                  {usdt(quote.price)} USDT
                </dd>
                {quote.credit > 0 && <dd className="text-[11px] text-slate-400">after {usdt(quote.credit)} USDT credit</dd>}
              </div>
              <div>
                <dt className="text-slate-400">Extra output pays back</dt>
                <dd data-testid="cmp-payback" className="mt-0.5 font-mono font-semibold tabular-nums">
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
            className="mt-3 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
          >
            {quote.kind === "upgrade" ? `Upgrade to ${target.name}` : `Allocate ${target.name}`}
          </motion.button>
        </section>
      ) : (
        <p data-testid="cmp-top" className="mt-5 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          You already run the highest level available. There is nothing above it to compare.
        </p>
      )}

      <section aria-label="All node levels" className="mt-6">
        <h3 className="text-sm font-semibold">All levels</h3>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-100" tabIndex={0} role="region" aria-label="Node level matrix, scrollable">
          <table data-testid="matrix-table" className="w-full min-w-[540px] text-xs">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {["Level", "Fee", "Daily %", "Output/day", "Monthly", "TH/s", "KYC"].map((h, i) => (
                  <th key={h} scope="col" className={`px-3 py-2 font-medium ${i > 0 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {sorted.map((t) => (
                <tr key={t.id} data-testid={`matrix-row-${t.level}`} className={node?.tierLevel === t.level ? "bg-amber-50" : ""}>
                  <th scope="row" className="px-3 py-2 text-left font-sans font-semibold">
                    VIP {t.level}
                    {node?.tierLevel === t.level && <span className="ml-1.5 text-[10px] font-semibold text-amber-700">YOU</span>}
                  </th>
                  <td className="px-3 py-2 text-right">{fee(t.feeUsdt)}</td>
                  <td className="px-3 py-2 text-right">{isTrialTier(t) ? "Fixed" : `${t.dailyRatePct.toFixed(1)}%`}</td>
                  <td className="px-3 py-2 text-right">{formatAmount(tierDailyOutput(t))}</td>
                  <td className="px-3 py-2 text-right">{formatAmount(tierMonthlyOutput(t))}</td>
                  <td className="px-3 py-2 text-right">{formatAmount(t.hashrateTh, t.hashrateTh < 10 ? 1 : 0)}</td>
                  <td className="px-3 py-2 text-right">{t.minKycTier === 0 ? "—" : `L${t.minKycTier}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Simulated figures for a sandbox. Not a guarantee of future output.</p>
      </section>
    </div>
  );
}
