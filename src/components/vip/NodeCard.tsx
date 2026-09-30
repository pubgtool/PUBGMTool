"use client";

import { motion } from "framer-motion";
import { Cpu, Lock } from "lucide-react";
import { ctaFor, type Cta } from "@/components/vip/cta";
import { CARD, GlowMeter, Stat, TierBadge } from "@/components/vip/parts";
import { formatAmount } from "@/lib/format";
import { isTrialTier, tierDailyOutput, tierMonthlyOutput, utilizationPct, type AllocationQuote } from "@/lib/nodes";
import type { VipTier } from "@/types/domain";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

interface Props {
  tier: VipTier;
  quote: AllocationQuote;
  highlighted: boolean;
  register: (el: HTMLElement | null) => void;
  onAction: (cta: Cta) => void;
}

export function NodeCard({ tier, quote, highlighted, register, onAction }: Props) {
  const cta = ctaFor(quote);
  const trial = isTrialTier(tier);
  const isCurrent = quote.blocked === "same_tier";
  const primary = !cta.disabled && (cta.kind === "activate" || cta.kind === "upgrade");
  const utilization = utilizationPct(tier);

  return (
    <article
      ref={register}
      aria-label={`${tier.name} ${tier.title}`}
      data-testid={`node-card-${tier.level}`}
      data-cta={cta.kind}
      className={`${CARD} relative flex scroll-mt-4 flex-col gap-4 overflow-hidden p-5 transition-shadow duration-300 ${
        highlighted ? "border-amber-400 ring-2 ring-amber-400/70" : isCurrent ? "border-amber-400/60" : ""
      }`}
    >
      {isCurrent && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />}
      <div className="flex flex-wrap items-center gap-2">
        <TierBadge level={tier.level} />
        {isCurrent && (
          <span className="rounded-md bg-amber-400/15 px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-amber-300">Your node</span>
        )}
        {trial && (
          <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-emerald-300">Free trial</span>
        )}
        {tier.minKycTier > 0 && (
          <span
            data-testid={`kyc-chip-${tier.level}`}
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold leading-none text-slate-300"
          >
            <Lock className="h-3 w-3" aria-hidden />
            KYC Level {tier.minKycTier}+
          </span>
        )}
      </div>

      <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-100">
        <Cpu className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <span className="min-w-0">{tier.title}</span>
      </h3>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat label="Allocation fee" value={tier.feeUsdt === 0 ? "Free" : formatAmount(tier.feeUsdt, 0)} sub={tier.feeUsdt === 0 ? undefined : "USDT one-off"} testId={`fee-${tier.level}`} />
        <Stat
          label="Daily distribution"
          value={trial ? "Fixed" : `+${tier.dailyRatePct.toFixed(2)}%`}
          sub={trial ? `${tier.durationDays} days only` : "of the fee, per day"}
          tone="green"
          testId={`rate-${tier.level}`}
        />
        <Stat label="Daily output" value={formatAmount(tierDailyOutput(tier))} sub="USDT / day" tone="gold" testId={`daily-${tier.level}`} />
        <Stat label="Monthly projected" value={formatAmount(tierMonthlyOutput(tier))} sub={trial ? "USDT over its life" : "USDT / 30 days"} testId={`monthly-${tier.level}`} />
      </dl>

      <div className="rounded-2xl bg-slate-950/60 p-3.5">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-slate-400">Hashrate capacity</span>
          <span data-testid={`hash-${tier.level}`} className="font-mono font-semibold tabular-nums text-slate-100">
            {formatAmount(tier.hashrateTh, tier.hashrateTh < 10 ? 1 : 0)} TH/s
          </span>
        </div>
        <div className="mt-3">
          <GlowMeter pct={utilization} label={`${tier.name} network capacity in use`} tone={utilization >= 90 ? "amber" : "emerald"} />
          <p className="mt-1.5 flex justify-between gap-2 text-[11px] tabular-nums text-slate-400">
            <span data-testid={`nodes-${tier.level}`} className="truncate">{formatAmount(tier.activeNodes, 0)} active nodes</span>
            <span className="shrink-0">{utilization.toFixed(0)}% of {formatAmount(tier.capacity, 0)}</span>
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={cta.disabled ? undefined : TAP}
        transition={SPRING}
        disabled={cta.disabled}
        onClick={() => onAction(cta)}
        data-testid={`node-cta-${tier.level}`}
        className={`w-full rounded-2xl px-3 py-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed ${
          cta.disabled
            ? "bg-slate-800 text-slate-400"
            : primary
              ? "bg-gradient-to-b from-amber-300 to-amber-500 font-bold text-slate-950 hover:opacity-95"
              : "border border-amber-400/60 text-amber-200 hover:bg-amber-400/10"
        }`}
      >
        {cta.label}
      </motion.button>
    </article>
  );
}
