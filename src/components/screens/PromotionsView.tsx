"use client";

import { Fragment, useMemo, useState } from "react";
import { Check, ChevronRight, Sparkles, Ticket } from "lucide-react";
import { SubScreenHeader } from "@/components/layout/SubScreenHeader";
import { BurstEffect } from "@/components/ui/Burst";
import { GoldGlow } from "@/components/ui/GoldGlow";
import { BTN_GOLD, CARD, GOLD_TEXT, VIP_PANEL } from "@/components/ui/styles";
import { CYCLE_LABEL } from "@/config/nodes";
import { FESTIVAL, countdownParts, msUntilRoundEnd, payoutEpoch, payoutFeed, poolAllocated, type Payout } from "@/lib/festival";
import { formatAmount } from "@/lib/format";
import { useLiveNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { relativeAge } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";
import { useBoost } from "@/lib/useBoost";

const pad2 = (n: number) => String(n).padStart(2, "0");

function Banner() {
  const now = useLiveNow(1_000);
  const { status, claim, bonusAmount } = useBoost();
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const [burst, setBurst] = useState(0);

  // These depend on the visitor's clock, so they appear once mounted.
  const parts = now === null ? null : countdownParts(msUntilRoundEnd(now));
  const pool = now === null ? null : poolAllocated(now);
  const pct = pool === null ? 0 : (pool / FESTIVAL.poolTotal) * 100;

  return (
    <section aria-label="Festival event" data-testid="event-banner" data-status={status} className={`${VIP_PANEL} p-6`}>
      <GoldGlow />
      <GoldGlow className="-bottom-16 -left-12" />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/10 to-transparent motion-reduce:hidden" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200">{FESTIVAL.eyebrow}</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            LIMITED TIME
          </span>
        </div>

        <h2 data-testid="event-title" className="mt-4 font-black leading-[1.08] tracking-tight">
          <span className="block text-2xl">{FESTIVAL.title} ·</span>
          <span className={`mt-1 block text-[28px] ${GOLD_TEXT}`}>{FESTIVAL.headline}</span>
        </h2>

        <div
          role="timer"
          aria-label={parts ? `Round ends in ${parts.h} hours, ${parts.m} minutes, ${parts.s} seconds` : "Round countdown"}
          data-testid="event-countdown"
          className="mt-5 flex items-center justify-center gap-1.5 font-mono"
        >
          {(
            [
              [parts?.h, "h"],
              [parts?.m, "m"],
              [parts?.s, "s"],
            ] as const
          ).map(([value, unit], i) => (
            <Fragment key={unit}>
              {i > 0 && <span className="text-2xl font-black text-amber-100/60">:</span>}
              <span className="flex items-baseline gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                <span className="text-3xl font-black tabular-nums">{value === undefined ? "--" : pad2(value)}</span>
                <span className="text-sm font-bold text-amber-200">{unit}</span>
              </span>
            </Fragment>
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-amber-100/80">Round ends at {CYCLE_LABEL}</p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-xs font-bold">
            <span className="uppercase tracking-wider text-amber-100">Prize pool allocation</span>
            <span data-testid="pool-pct" className="font-mono tabular-nums text-amber-200">
              {pool === null ? "--" : `${pct.toFixed(1)}%`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Prize pool allocated"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            className="mt-2 h-3 overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            >
              <span className="absolute inset-y-0 left-0 w-1/2 animate-shine bg-gradient-to-r from-transparent via-white/50 to-transparent motion-reduce:hidden" />
            </div>
          </div>
          <p data-testid="pool-amount" className="mt-2 font-mono text-sm font-bold tabular-nums">
            ${pool === null ? "--" : formatAmount(pool, 0)} <span className="font-semibold text-amber-100/80">/ ${formatAmount(FESTIVAL.poolTotal, 0)} USD Allocation</span>
          </p>
        </div>

        <div className="relative mt-5">
          {(status === "guest" || status === "available") && (
            <button
              type="button"
              onClick={() => {
                if (claim()) setBurst((n) => n + 1);
              }}
              data-testid="claim-boost"
              className={BTN_GOLD}
            >
              <Ticket className="h-5 w-5" aria-hidden />
              Claim Boost Ticket
            </button>
          )}
          {status === "held" && (
            <>
              <button type="button" onClick={() => setActiveTab("vaults")} data-testid="boost-held" className={BTN_GOLD}>
                <Sparkles className="h-5 w-5" aria-hidden />
                Ticket Active · Allocate a Node
              </button>
              <p className="mt-2.5 text-center text-xs font-semibold text-amber-100">Ticket valid until {CYCLE_LABEL} · applies to your first paid node</p>
            </>
          )}
          {status === "paid" && (
            <p data-testid="boost-paid" className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-3.5 text-[15px] font-bold text-emerald-200">
              <Check className="h-5 w-5" aria-hidden />
              Bonus credited{bonusAmount > 0 ? ` · +${formatAmount(bonusAmount)} USDT` : ""}
            </p>
          )}
          {status === "ineligible" && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("vaults")}
                data-testid="boost-ineligible"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 text-[15px] font-bold text-white outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Explore Staking
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
              <p className="mt-2.5 text-center text-xs font-semibold text-amber-100">The bonus is for a first activation. Your node is already running.</p>
            </>
          )}
          <BurstEffect burstKey={burst} count={22} radius={110} />
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  "Claim a boost ticket. One ticket per account per round, valid until the round ends.",
  `Allocate your first paid node before ${CYCLE_LABEL}. The free trial does not use up the bonus.`,
  `The bonus, ${FESTIVAL.bonusPct}% of the allocation (up to ${formatAmount(FESTIVAL.maxBonus, 0)} USDT), is added to your balance once.`,
] as const;

function HowItWorks() {
  return (
    <section aria-label="How it works" className={`${CARD} p-5`}>
      <h2 className="text-base font-bold text-gray-900">How it works</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {STEPS.map((text, i) => (
          <li key={text} className="flex items-start gap-3">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm text-fg-secondary">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PayoutPill({ payout, now }: { payout: Payout; now: number }) {
  return (
    <span
      data-testid="payout-item"
      className="mr-3 inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-fg-secondary"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span>
        User <span className="font-mono text-gray-900">{payout.address}</span> claimed
      </span>
      <span className="font-mono font-bold tabular-nums text-emerald-700">+{formatAmount(payout.amount)} USDT</span>
      <span className="text-fg-muted">· {relativeAge(now - payout.at)}</span>
    </span>
  );
}

function PayoutTicker() {
  const now = useLiveNow(5_000);
  const epoch = now === null ? null : payoutEpoch(now);
  const feed = useMemo(() => (epoch === null ? [] : payoutFeed(epoch)), [epoch]);

  return (
    <section aria-label="Recent payouts" data-testid="payout-ticker" className={`${CARD} overflow-hidden py-4`}>
      <p className="mb-3 flex items-center gap-2 px-5 text-xs font-bold uppercase tracking-wider text-fg-muted">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Recent payouts
        <span className="ml-auto rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-fg-muted">Demo feed</span>
      </p>
      <div className="min-h-[42px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] motion-reduce:overflow-x-auto">
        {now !== null && (
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none" style={{ animationDuration: `${feed.length * 4.5}s` }}>
            {feed.map((p) => (
              <PayoutPill key={p.id} payout={p} now={now} />
            ))}
            <div aria-hidden className="flex">
              {feed.map((p) => (
                <PayoutPill key={`${p.id}-b`} payout={p} now={now} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function PromotionsView() {
  const { t } = useT();
  return (
    <div className="flex flex-1 flex-col">
      <SubScreenHeader title={t("grid.promotions")} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
      <Banner />
      <HowItWorks />
      <PayoutTicker />
      </main>
    </div>
  );
}
