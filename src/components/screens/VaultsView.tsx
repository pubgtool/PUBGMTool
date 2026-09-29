"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Ticket } from "lucide-react";
import { PlanActivationSheet, type ActivationRequest } from "@/components/screens/PlanActivationSheet";
import { formatAmount, formatRate } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import {
  PROJECTION_DAYS,
  isVoucherEligible,
  maxStakeFor,
  remainingCapacity,
  utilizationPct,
} from "@/lib/vaults";
import type { VipTier } from "@/types/domain";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const HIGHLIGHT_MS = 2_400;

export function VaultsView() {
  const tiers = useAppStore((s) => s.tiers);
  const balances = useAppStore((s) => s.balances);
  const focusedTierId = useAppStore((s) => s.focusedTierId);
  const setFocusedTierId = useAppStore((s) => s.setFocusedTierId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setWalletSection = useAppStore((s) => s.setWalletSection);
  const reduceMotion = useReducedMotion();

  const [request, setRequest] = useState<ActivationRequest | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const activeTiers = useMemo(
    () => tiers.filter((t) => t.isActive).sort((a, b) => a.level - b.level),
    [tiers],
  );
  const maxRate = activeTiers.reduce((max, t) => Math.max(max, t.dailyRatePct), 0);
  const starterId = activeTiers[0]?.id ?? null;
  const popularId = useMemo(() => {
    let best: VipTier | null = null;
    for (const tier of activeTiers.slice(1)) {
      if (utilizationPct(tier) > (best ? utilizationPct(best) : 0)) best = tier;
    }
    return best?.id ?? null;
  }, [activeTiers]);

  // Consume the navigation intent from Main: scroll to the tier and ring it briefly.
  useEffect(() => {
    if (!focusedTierId) return;
    const el = cardRefs.current.get(focusedTierId);
    setFocusedTierId(null);
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setHighlightId(focusedTierId);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  }, [focusedTierId, setFocusedTierId, reduceMotion]);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const closeSheet = useCallback(() => setRequest(null), []);

  const openDeposit = () => {
    setWalletSection("deposit");
    setActiveTab("wallet");
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-slate-50/90 px-4 pb-3 pt-5 backdrop-blur-xl">
        <h1 className="text-xl font-semibold tracking-tight">VIP Investment Tiers</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Select a computational contract tier to boost daily yields
        </p>

        <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-2">
          <div className="min-w-0 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
            <dt className="text-[10px] uppercase leading-tight tracking-wider text-slate-400">Available Tiers</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{activeTiers.length}</dd>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
            <dt className="text-[10px] uppercase leading-tight tracking-wider text-slate-400">Max Daily Return</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-emerald-600">
              {formatRate(maxRate)}
            </dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white py-2 pl-3 pr-2 shadow-sm">
            <div className="min-w-0">
              <dt className="text-[10px] uppercase leading-tight tracking-wider text-slate-400">Available USDT</dt>
              <dd className="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums">
                {formatAmount(balances.available)}
              </dd>
            </div>
            <motion.button
              type="button"
              whileTap={TAP}
              transition={SPRING}
              onClick={openDeposit}
              aria-label="Deposit"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </motion.button>
          </div>
        </dl>
      </header>

      <main className="flex flex-col gap-4 px-4 pb-4 pt-4">
        {activeTiers.length === 0 && (
          <p className="rounded-3xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
            No VIP packages are open for new investments right now.
          </p>
        )}

        {activeTiers.map((tier) => {
          const utilization = utilizationPct(tier);
          const remaining = remainingCapacity(tier);
          const full = remaining < tier.minDeposit;
          const voucherOffer = isVoucherEligible(tier, balances.trialVoucher);
          const voucherAmount = maxStakeFor(tier, balances.trialVoucher);
          const badge = tier.id === starterId ? "Starter" : tier.id === popularId ? "Popular" : null;
          const highlighted = highlightId === tier.id;

          return (
            <article
              key={tier.id}
              ref={(el) => {
                if (el) cardRefs.current.set(tier.id, el);
                else cardRefs.current.delete(tier.id);
              }}
              aria-label={`${tier.name} investment plan`}
              className={`relative flex scroll-mt-44 flex-col gap-4 overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition-shadow duration-300 ${
                highlighted
                  ? "border-slate-900 ring-2 ring-slate-900 ring-offset-2 ring-offset-slate-50"
                  : "border-slate-100"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold leading-none text-white">
                      {tier.name}
                    </span>
                    {badge && (
                      <span
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide ${
                          badge === "Popular" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-medium tabular-nums text-slate-500">
                    {utilization.toFixed(1)}% allocated
                  </span>
                </div>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={`${tier.name} allocation`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(utilization)}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      utilization >= 90 ? "bg-amber-500" : "bg-slate-900"
                    }`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-[11px] tabular-nums text-slate-400">
                  {formatAmount(tier.filled, 0)} / {formatAmount(tier.capacity, 0)} USDT
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <p className="flex min-h-8 items-end text-[11px] uppercase leading-4 tracking-wider text-slate-400">Daily Income</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums text-emerald-600">
                    +{formatAmount(tier.dailyRatePct)}%{" "}
                    <span className="text-xs font-medium text-emerald-600/70">/ Day</span>
                  </p>
                </div>
                <div>
                  <p className="flex min-h-8 items-end text-[11px] uppercase leading-4 tracking-wider text-slate-400">Total Expected Return</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums">
                    {formatAmount(tier.dailyRatePct * PROJECTION_DAYS)}%
                  </p>
                  <p className="text-[11px] text-slate-400">Total ROI · {PROJECTION_DAYS} days</p>
                </div>
                <div className="col-span-2 rounded-2xl bg-slate-50 px-3.5 py-2.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Investment Range</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-3 font-mono text-[13px] font-medium tabular-nums">
                    <p className="min-w-0">
                      <span className="block font-sans text-[10px] text-slate-400">Min:</span>
                      {formatAmount(tier.minDeposit)} USDT
                    </p>
                    <p className="min-w-0 border-l border-slate-200 pl-3">
                      <span className="block font-sans text-[10px] text-slate-400">Max:</span>
                      {formatAmount(tier.maxDeposit)} USDT
                    </p>
                  </div>
                </div>
              </div>

              {full ? (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-2xl bg-slate-200 py-3 text-sm font-medium text-slate-400"
                >
                  Capacity Full
                </button>
              ) : voucherOffer ? (
                <motion.button
                  type="button"
                  whileTap={TAP}
                  transition={SPRING}
                  onClick={() => setRequest({ tierId: tier.id, source: "voucher" })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-semibold text-slate-950 outline-none transition-colors hover:bg-amber-600 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                >
                  <Ticket className="h-4 w-4" aria-hidden />
                  Activate with {formatAmount(voucherAmount, Number.isInteger(voucherAmount) ? 0 : 2)} USDT Voucher
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileTap={TAP}
                  transition={SPRING}
                  onClick={() => setRequest({ tierId: tier.id, source: "balance" })}
                  className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-medium text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                >
                  Unlock VIP Tier
                </motion.button>
              )}
            </article>
          );
        })}
      </main>

      <PlanActivationSheet request={request} onClose={closeSheet} />
    </div>
  );
}
