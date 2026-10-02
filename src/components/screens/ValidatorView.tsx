"use client";

import { useMemo } from "react";
import { Box, ChevronRight, Flame } from "lucide-react";
import { BurstEffect } from "@/components/ui/Burst";
import { GoldGlow } from "@/components/ui/GoldGlow";
import { BTN_GOLD, BTN_PRIMARY, CARD, GOLD_TEXT, VIP_PANEL } from "@/components/ui/styles";
import { CrownBadge, rankLabel } from "@/components/vip/CrownBadge";
import { usdt } from "@/components/vip/cta";
import { CYCLE_LABEL } from "@/config/nodes";
import { formatAmount } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { currentNode, dailyOutputOf } from "@/lib/nodes";
import { selectPendingOutput, selectTodayProfit, useAppStore } from "@/lib/store";
import { MS_PER_DAY, formatCountdown, msUntilNextUtcDay } from "@/lib/time";
import { useClaimOutput } from "@/lib/useClaimOutput";

function Spec({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-sm text-amber-100/70">{label}</dt>
      <dd data-testid={testId} className="min-w-0 truncate text-right font-mono text-sm font-semibold tabular-nums text-white">
        {value}
      </dd>
    </div>
  );
}

/** The user's own compute node: status, the daily cycle, claiming, and every node they have run. */
export function ValidatorView() {
  const { t, lang } = useT();
  const positions = useAppStore((s) => s.positions);
  const tiers = useAppStore((s) => s.tiers);
  const pending = useAppStore(selectPendingOutput);
  const today = useAppStore(selectTodayProfit);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setFocusedTierId = useAppStore((s) => s.setFocusedTierId);
  const { claim, burst } = useClaimOutput();
  const now = useNow(1_000);

  const node = currentNode(positions);
  const sorted = useMemo(() => [...tiers].sort((a, b) => a.level - b.level), [tiers]);
  const tier = node ? sorted.find((x) => x.id === node.tierId) : undefined;
  const next = node ? sorted.find((x) => x.level > node.tierLevel && x.isActive) : undefined;
  const date = useMemo(() => new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", { year: "numeric", month: "short", day: "numeric" }), [lang]);
  const history = useMemo(() => [...positions].sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt)), [positions]);

  const untilMs = msUntilNextUtcDay(now);
  const cyclePct = ((MS_PER_DAY - untilMs) / MS_PER_DAY) * 100;
  const daysLeft = node?.expiresAt ? Math.max(0, Math.ceil((Date.parse(node.expiresAt) - now) / MS_PER_DAY)) : null;
  const goStaking = (tierId: string | null) => {
    setFocusedTierId(tierId);
    setActiveTab("vaults");
  };

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("validator.title")}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t("validator.sub")}</p>
      </header>

      {!node ? (
        <section aria-label={t("validator.noNode")} data-testid="validator-empty" className={`${CARD} flex flex-col items-center px-6 py-8 text-center`}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <Box className="h-8 w-8" strokeWidth={1.5} aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-bold text-gray-900">{t("validator.noNode")}</h2>
          <p className="mt-1 text-sm text-fg-secondary">{t("validator.noNodeText")}</p>
          <button type="button" onClick={() => goStaking(null)} data-testid="validator-explore" className={`${BTN_PRIMARY} mt-5`}>
            {t("validator.explore")}
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </section>
      ) : (
        <>
          <section aria-label={t("validator.title")} data-testid="validator-node" className={`${VIP_PANEL} p-5`}>
            <GoldGlow />
            <div className="relative">
              <div className="flex items-center gap-4">
                <CrownBadge level={node.tierLevel} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-black leading-tight tracking-tight ${GOLD_TEXT}`}>{rankLabel(node.tierLevel)}</p>
                  <p className="mt-0.5 truncate text-sm text-amber-100/75">{tier?.title ?? node.tierName}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-black tracking-wide text-emerald-300">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {t("validator.status")}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-amber-100/70">{t("validator.dailyOutput")}</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-emerald-400">
                <span data-testid="validator-daily">+{formatAmount(dailyOutputOf(node))}</span>{" "}
                <span className="text-lg font-extrabold text-emerald-300/85">{t("validator.perDay")}</span>
              </p>

              <dl className="mt-5 divide-y divide-white/10 border-y border-white/10">
                <Spec label={t("validator.allocation")} value={node.principal > 0 ? `${usdt(node.principal)} USDT` : "Free"} />
                {tier && <Spec label={t("validator.power")} value={`${formatAmount(tier.hashrateTh, 0)} TH/s`} />}
                <Spec label={t("validator.term")} value={daysLeft === null ? t("validator.openTerm") : t("validator.daysLeft", { n: daysLeft })} />
                <Spec label={t("validator.since")} value={date.format(new Date(node.openedAt))} />
                <Spec label={t("validator.lifetime")} value={`${formatAmount(node.accrued, 4)} USDT`} />
              </dl>
            </div>
          </section>

          <section aria-label={t("validator.cycle")} data-testid="validator-cycle" className={`${CARD} p-5`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{t("validator.nextSettlement")}</p>
            <p data-testid="validator-countdown" className="mt-1 font-mono text-4xl font-black tabular-nums text-gray-900">
              {formatCountdown(untilMs)}
            </p>
            <div
              role="progressbar"
              aria-label={t("validator.cycle")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(cyclePct)}
              className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"
            >
              <div className="h-full rounded-full bg-amber-500 transition-[width] duration-1000 ease-linear" style={{ width: `${cyclePct}%` }} />
            </div>
            <p className="mt-2 text-xs text-fg-muted">{t("validator.settlesAt", { time: CYCLE_LABEL })}</p>

            <dl className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-sm text-fg-secondary">{t("validator.pending")}</dt>
                <dd data-testid="validator-pending" className="font-mono text-base font-bold tabular-nums text-emerald-700">
                  +{formatAmount(pending, 6)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-sm text-fg-secondary">{t("validator.today")}</dt>
                <dd className="font-mono text-base font-bold tabular-nums text-gray-900">+{formatAmount(today, 4)}</dd>
              </div>
            </dl>

            <div className="relative mt-2">
              <button type="button" onClick={() => void claim()} data-testid="validator-claim" className={BTN_PRIMARY}>
                <Flame className="h-5 w-5" aria-hidden />
                {t("validator.claim")}
              </button>
              <BurstEffect burstKey={burst} palette="profit" count={22} radius={110} />
            </div>
          </section>

          {next && (
            <section aria-label={t("validator.upgrade", { rank: rankLabel(next.level) })} className={`${VIP_PANEL} p-5`}>
              <GoldGlow className="-left-12 -bottom-16" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <CrownBadge level={next.level} size="pill" />
                  <p className="min-w-0 truncate text-sm font-semibold text-amber-100/85">{next.title}</p>
                </div>
                <p className="mt-3 text-sm text-amber-100/75">{t("validator.upgradeNote")}</p>
                <button type="button" onClick={() => goStaking(next.id)} data-testid="validator-upgrade" className={`${BTN_GOLD} mt-4`}>
                  {t("validator.upgrade", { rank: rankLabel(next.level) })}
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {history.length > 0 && (
        <section aria-label={t("validator.history")} className={`${CARD} p-4`}>
          <h2 className="text-base font-bold text-gray-900">{t("validator.history")}</h2>
          <ul className="mt-1 divide-y divide-gray-100" data-testid="validator-history">
            {history.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <CrownBadge level={p.tierLevel} size="pill" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{sorted.find((x) => x.id === p.tierId)?.title ?? p.tierName}</span>
                  <span className="block truncate text-xs text-fg-muted">
                    {date.format(new Date(p.openedAt))}
                    {p.upgradedFrom !== undefined ? ` · ${t("validator.upgradedFrom", { n: p.upgradedFrom })}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-sm font-bold tabular-nums text-gray-900">{p.principal > 0 ? usdt(p.principal) : "Free"}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-fg-muted"}`}
                  >
                    {p.status === "active" ? t("validator.active") : t("validator.closed")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

