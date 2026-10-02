"use client";

import { useId } from "react";
import { formatAge, useFeed } from "@/components/home/feed";
import { CARD } from "@/components/ui/styles";
import { formatAmount } from "@/lib/format";
import { useT } from "@/lib/i18n";

const ROWS = 5;
const AVATARS = ["bg-emerald-50 text-emerald-700", "bg-amber-50 text-amber-700", "bg-sky-50 text-sky-700", "bg-violet-50 text-violet-700", "bg-rose-50 text-rose-700"] as const;

function Skeleton() {
  return (
    <li aria-hidden className="flex items-center gap-3 py-2.5">
      <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
      <span className="min-w-0 flex-1 space-y-2">
        <span className="block h-3.5 w-24 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <span className="block h-3 w-16 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
      </span>
      <span className="h-7 w-24 shrink-0 animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
    </li>
  );
}

export function SettlementFeed() {
  const { t } = useT();
  const headingId = useId();
  const { now, payouts } = useFeed();
  const rows = now === null ? [] : payouts.slice(0, ROWS);

  return (
    <section aria-labelledby={headingId} data-testid="settlements" className={`${CARD} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="min-w-0 text-lg font-extrabold tracking-tight text-gray-900">
          {t("home.settlements.title")}
        </h2>
        <span title={t("home.demoFeedHint")} className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase leading-4 tracking-wide text-fg-secondary">
          {t("home.demoFeed")}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-gray-100">
        {now === null
          ? Array.from({ length: ROWS }, (_, i) => <Skeleton key={i} />)
          : rows.map((p) => {
              const hex = p.address.slice(2, 4);
              return (
                <li key={p.id} data-testid="settlement-row" className="flex items-center gap-3 py-2.5">
                  <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase ${AVATARS[parseInt(hex, 16) % AVATARS.length]}`}>
                    {hex}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-semibold text-gray-900">{p.address}</p>
                    <p className="text-xs tabular-nums text-fg-muted">{formatAge(t, now - p.at)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold tabular-nums text-emerald-700">+{formatAmount(p.amount)} USDT</span>
                </li>
              );
            })}
      </ul>
    </section>
  );
}
