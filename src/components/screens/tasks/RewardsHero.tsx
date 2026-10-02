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
      className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
    >
      <span aria-hidden className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-secondary">Total Bounty Claimed</p>
          <span className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-btn">
            <Trophy className="h-[18px] w-[18px]" aria-hidden />
          </span>
        </div>
        <p className="-mt-1 flex flex-wrap items-baseline gap-x-2">
          <span
            data-testid="total-bounty"
            className="font-mono text-[2rem] font-extrabold leading-tight tracking-tight tabular-nums text-amber-700 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)] min-[360px]:text-4xl"
          >
            {formatAmount(totalBounty)}
          </span>
          <span className="text-sm font-bold text-fg-secondary">USDT</span>
        </p>
        <p className="mt-1 text-xs text-fg-secondary">From check-ins, missions and red envelopes</p>

        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-secondary">
              <Flame className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
              Active Compute Streak
            </p>
            <p data-testid="streak-label" className="shrink-0 whitespace-nowrap font-mono text-sm font-bold tabular-nums">
              Day {claimed} of {CHECK_IN_CYCLE}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Progress to the 7-day milestone bonus"
            aria-valuemin={0}
            aria-valuemax={CHECK_IN_CYCLE}
            aria-valuenow={claimed}
            className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.55)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-fg-secondary">
            {remaining > 0
              ? `${remaining} more ${remaining === 1 ? "day" : "days"} to the Day ${CHECK_IN_CYCLE} bonus: +${formatAmount(milestone)} USDT + Mystery Node Bonus`
              : "Milestone reached. A new 7-day cycle starts tomorrow."}
          </p>
        </div>
      </div>
    </section>
  );
}
