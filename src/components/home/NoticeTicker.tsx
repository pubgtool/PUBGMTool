"use client";

import { useReducedMotion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { formatAge, useFeed } from "@/components/home/feed";
import { formatAmount } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Payout } from "@/lib/festival";

const SECONDS_PER_ITEM = 5;

function Items({ payouts, now, hidden = false }: { payouts: Payout[]; now: number; hidden?: boolean }) {
  const { t } = useT();
  return (
    <ul aria-hidden={hidden || undefined} className={`flex shrink-0 items-center gap-8 pr-8 ${hidden ? "motion-reduce:hidden" : ""}`}>
      {payouts.map((p) => (
        <li key={p.id} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] text-gray-800">
          <span>{t("home.ticker.claimed", { address: p.address })}</span>
          <span className="font-bold tabular-nums text-emerald-700">+{formatAmount(p.amount)} USDT</span>
          <span className="text-fg-muted">· {formatAge(t, now - p.at)}</span>
        </li>
      ))}
    </ul>
  );
}

export function NoticeTicker() {
  const { t } = useT();
  const { now, payouts } = useFeed();
  // Known only on the client, so it is applied after mount like the list itself.
  const scrollable = useReducedMotion() === true && now !== null;

  return (
    <section aria-label={t("home.ticker.label")} data-testid="home-ticker" className="group flex h-11 items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 shadow-sm">
      <Megaphone className="h-[18px] w-[18px] shrink-0 text-amber-600" aria-hidden />
      {/* The list exists only after mount (it depends on the clock); the bar's fixed height keeps the layout still. */}
      <div
        tabIndex={scrollable ? 0 : undefined}
        role={scrollable ? "group" : undefined}
        aria-label={scrollable ? t("home.ticker.label") : undefined}
        className="no-scrollbar min-w-0 flex-1 overflow-hidden rounded-md outline-none [mask-image:linear-gradient(to_right,transparent,#000_14px,#000_calc(100%_-_14px),transparent)] focus-visible:ring-2 focus-visible:ring-gray-900 motion-reduce:overflow-x-auto"
      >
        {now !== null && (
          <div
            style={{ animationDuration: `${payouts.length * SECONDS_PER_ITEM}s` }}
            className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] motion-reduce:animate-none"
          >
            <Items payouts={payouts} now={now} />
            <Items payouts={payouts} now={now} hidden />
          </div>
        )}
      </div>
      <span
        title={t("home.demoFeedHint")}
        className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase leading-4 tracking-wide text-fg-secondary"
      >
        {t("home.demoFeed")}
      </span>
    </section>
  );
}
