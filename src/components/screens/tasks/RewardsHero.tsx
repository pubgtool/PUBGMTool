"use client";

import { Flame, Trophy } from "lucide-react";
import { CHECK_IN_CYCLE, CHECK_IN_REWARDS } from "@/config/rewards";
import { formatAmount } from "@/lib/format";

interface Props {
  totalBounty: number;
  claimed: number;
}

export function RewardsHero({ totalBounty, claimed }: Props) {
  const remaining = CHECK_IN_CYCLE - claimed;
  const milestone = CHECK_IN_REWARDS[CHECK_IN_CYCLE - 1] ?? 0;
  const pct = (claimed / CHECK_IN_CYCLE) * 100;

  return (
    <section
      aria-label="Rewards overview"
      className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-50" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Bounty Claimed</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Trophy className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span data-testid="total-bounty" className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
            {formatAmount(totalBounty)}
          </span>
          <span className="text-sm font-medium text-slate-400">USDT</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">From check-ins, missions and red envelopes</p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Flame className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
              Active Compute Streak
            </p>
            <p data-testid="streak-label" className="shrink-0 whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
              Day {claimed} of {CHECK_IN_CYCLE}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Progress to the 7-day milestone bonus"
            aria-valuemin={0}
            aria-valuemax={CHECK_IN_CYCLE}
            aria-valuenow={claimed}
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {remaining > 0
              ? `${remaining} more ${remaining === 1 ? "day" : "days"} to the Day ${CHECK_IN_CYCLE} bonus: +${formatAmount(milestone)} USDT + Mystery Node Bonus`
              : "Milestone reached. A new 7-day cycle starts tomorrow."}
          </p>
        </div>
      </div>
    </section>
  );
}
