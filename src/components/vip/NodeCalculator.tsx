"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Calculator, Info } from "lucide-react";
import { CARD, TierBadge } from "@/components/vip/parts";
import { Switch } from "@/components/ui/Switch";
import { HORIZONS, MAX_LEVEL, PROJECTION_NOTE, REALLOCATE_MAX_DAYS, type Horizon } from "@/config/nodes";
import { formatAmount } from "@/lib/format";
import { canReallocate, isTrialTier, projectionTable, projectOutput, tierDailyOutput } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

const horizonLabel = (days: Horizon) => (days === 365 ? "1 year" : days === 1 ? "1 day" : `${days} days`);
/** Two decimals, unless a sub-1 figure would lose precision (0.004 stays 0.0040). */
const money = (n: number) => formatAmount(n, n > 0 && n < 1 && Math.abs(n * 100 - Math.round(n * 100)) > 1e-6 ? 4 : 2);

interface Props {
  level: number;
  onLevel: (level: number) => void;
  onCompare: (level: number) => void;
  onAllocate: (level: number) => void;
}

export function NodeCalculator({ level, onLevel, onCompare, onAllocate }: Props) {
  const tiers = useAppStore((s) => s.tiers);
  const sliderId = useId();
  const [days, setDays] = useState<Horizon>(30);
  const [reallocate, setReallocate] = useState(false);

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.level - b.level), [tiers]);
  const tier = sorted.find((t) => t.level === level) ?? sorted[0];
  const maxLevel = sorted[sorted.length - 1]?.level ?? MAX_LEVEL;
  if (!tier) return null;

  const trial = isTrialTier(tier);
  const compoundable = !trial && tier.feeUsdt > 0;
  const effectiveReallocate = reallocate && compoundable;
  const horizonBlocked = effectiveReallocate && !canReallocate(tier, days);
  const shownDays: Horizon = horizonBlocked ? (REALLOCATE_MAX_DAYS as Horizon) : days;
  const projection = projectOutput(tier, shownDays, effectiveReallocate);
  const table = projectionTable(tier, effectiveReallocate);
  const daily = tierDailyOutput(tier);
  const payback = tier.feeUsdt > 0 && daily > 0 ? Math.ceil(tier.feeUsdt / daily) : null;
  const growth = tier.hashrateTh > 0 ? ((projection.endHashrateTh - tier.hashrateTh) / tier.hashrateTh) * 100 : 0;

  return (
    <section aria-label="Compute output calculator" data-testid="calculator" className={`${CARD} p-5`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Calculator className="h-4 w-4 text-amber-400" aria-hidden />
        Compute Output Calculator
      </h2>
      <p className="mt-1 text-xs text-slate-400">Slide across levels to simulate output over time.</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label htmlFor={sliderId} className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Node level
        </label>
        <span className="flex min-w-0 items-center gap-2">
          <TierBadge level={tier.level} />
          <span data-testid="calc-title" className="truncate text-xs text-slate-300">
            {tier.title}
          </span>
        </span>
      </div>
      <input
        id={sliderId}
        data-testid="calc-slider"
        type="range"
        min={0}
        max={maxLevel}
        step={1}
        value={level}
        onChange={(event) => onLevel(Number(event.target.value))}
        aria-valuetext={`${tier.name}, ${tier.title}`}
        className="mt-1 h-8 w-full cursor-pointer appearance-none rounded-full bg-transparent accent-amber-400 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-slate-800 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-800 [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(251,191,36,0.6)]"
      />
      <div className="mt-1 flex justify-between px-0.5 font-mono text-[10px] tabular-nums text-slate-500" aria-hidden>
        {sorted.map((t) => (
          <span key={t.id} className={t.level === level ? "text-amber-300" : ""}>
            {t.level}
          </span>
        ))}
      </div>

      <div role="radiogroup" aria-label="Projection period" className="mt-4 grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-950/70 p-1">
        {HORIZONS.map((h) => {
          const active = h === shownDays;
          const blocked = effectiveReallocate && !canReallocate(tier, h);
          return (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={blocked}
              data-testid={`calc-horizon-${h}`}
              disabled={blocked}
              onClick={() => setDays(h)}
              className={`relative rounded-xl py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed ${
                active ? "bg-amber-400 text-slate-950" : blocked ? "text-slate-600" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {h === 365 ? "1Y" : `${h}D`}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl bg-slate-950/70 p-3.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">Re-allocate daily output</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {!compoundable
              ? "Not available for the free trial node."
              : `Adds each day's output back into the node. Limited to ${REALLOCATE_MAX_DAYS} days.`}
          </p>
        </div>
        <Switch tone="dark" label="Re-allocate daily output" checked={effectiveReallocate} disabled={!compoundable} onChange={setReallocate} />
      </div>
      {effectiveReallocate && days > REALLOCATE_MAX_DAYS && (
        <p data-testid="calc-cap-note" className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          Compounded projections stop at {REALLOCATE_MAX_DAYS} days because they grow unrealistically fast, so {horizonLabel(shownDays)} is shown.
        </p>
      )}

      <div className="mt-4 rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-transparent p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Projected output · {horizonLabel(shownDays)}</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span data-testid="calc-total" className="font-mono text-3xl font-semibold tabular-nums text-amber-300">
            +{money(projection.total)}
          </span>
          <span className="text-sm text-slate-400">USDT</span>
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-slate-400">Daily output</dt>
            <dd data-testid="calc-daily" className="mt-0.5 font-mono font-semibold tabular-nums text-slate-100">
              {money(daily)} USDT
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">{trial ? "Runs for" : "Break-even"}</dt>
            <dd data-testid="calc-payback" className="mt-0.5 font-mono font-semibold tabular-nums text-slate-100">
              {trial ? `${tier.durationDays} days` : payback ? `~${payback} days` : "n/a"}
            </dd>
          </div>
          {effectiveReallocate && (
            <div className="col-span-2">
              <dt className="text-slate-400">Projected capacity after re-allocation</dt>
              <dd data-testid="calc-capacity" className="mt-0.5 font-mono font-semibold tabular-nums text-emerald-400">
                {formatAmount(projection.endHashrateTh, 1)} TH/s <span className="text-slate-400">({growth >= 0 ? "+" : ""}{growth.toFixed(1)}%)</span>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <table data-testid="calc-table" className="mt-3 w-full text-xs">
        <caption className="sr-only">Projected output by period</caption>
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
            <th scope="col" className="py-1.5 font-medium">Period</th>
            <th scope="col" className="py-1.5 text-right font-medium">Output (USDT)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {table.map(({ days: d, projection: row }) => (
            <tr key={d} className={d === shownDays ? "text-amber-300" : "text-slate-300"}>
              <th scope="row" className="py-2 text-left font-medium">{horizonLabel(d)}</th>
              <td data-testid={`calc-row-${d}`} className="py-2 text-right font-mono tabular-nums">
                {row ? `+${money(row.total)}` : "n/a"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={() => onCompare(level)}
          data-testid="calc-compare"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 py-3 text-xs font-semibold text-slate-100 outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
          Compare with my node
        </motion.button>
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={() => onAllocate(level)}
          data-testid="calc-allocate"
          className="rounded-xl bg-amber-400 py-3 text-xs font-bold text-slate-950 outline-none hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Allocate {tier.name}
        </motion.button>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        {PROJECTION_NOTE}
      </p>
    </section>
  );
}
