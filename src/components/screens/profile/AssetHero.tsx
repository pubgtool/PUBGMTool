"use client";

import { Star } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { rankLabel } from "@/components/vip/CrownBadge";
import { formatAmount } from "@/lib/format";
import { formatPoints, useT } from "@/lib/i18n";
import { currentNode } from "@/lib/nodes";
import { accountPoints } from "@/lib/points";
import { selectTotalBalance, useAppStore } from "@/lib/store";

const MASK = "••••";

interface RowProps {
  glyph: string;
  tone: "green" | "ink";
  amount: string;
  unit: string;
  label: string;
  testId: string;
}

function AssetRow({ glyph, tone, amount, unit, label, testId }: RowProps) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${tone === "green" ? "bg-emerald-500" : "bg-gray-900"}`}
      >
        {glyph}
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-1">
          <span data-testid={testId} className="min-w-0 truncate text-[17px] font-bold leading-tight tabular-nums text-gray-900">
            {amount}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-fg-muted">{unit}</span>
        </span>
        <span className="block truncate text-xs text-fg-muted">{label}</span>
      </span>
    </li>
  );
}

/** Assets on the left, the dark VIP pass with account points on the right. */
export function AssetHero({ hidden }: { hidden: boolean }) {
  const { t, lang } = useT();
  const user = useAppStore((s) => s.user);
  const balances = useAppStore((s) => s.balances);
  const positions = useAppStore((s) => s.positions);
  const equity = useAppStore(selectTotalBalance);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const node = currentNode(positions);
  const points = accountPoints(user);
  const show = (n: number) => (hidden ? MASK : formatAmount(n));

  return (
    <section aria-label={t("profile.totalAssets")} data-testid="asset-hero" className={`${CARD} grid grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] gap-3 p-4`}>
      <div className="min-w-0">
        <p className="text-xs leading-snug text-fg-muted">
          {t("profile.totalAssets")}{" "}
          <span className="whitespace-nowrap">
            ≈ <span data-testid="profile-total">{show(equity)}</span> USD
          </span>
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          <AssetRow glyph="$" tone="green" amount={show(balances.available)} unit="USDT" label={t("profile.available")} testId="profile-available" />
          <AssetRow glyph="Σ" tone="ink" amount={show(balances.staked)} unit="USDT" label={t("profile.staked")} testId="profile-staked" />
        </ul>
      </div>

      <button
        type="button"
        onClick={() => setActiveTab("tasks")}
        aria-label={t("profile.pointsOpen", { n: points })}
        data-testid="vip-pass"
        className="relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-[#1C1A17] via-[#2A241C] to-[#453823] p-3 text-left text-white shadow-[0_10px_24px_rgba(69,56,35,0.32)] outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
      >
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.45),transparent_68%)]" />
        <span aria-hidden className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-500 text-[#2A241C] shadow">
          <Star className="h-4 w-4 fill-current" />
        </span>
        <span className="relative">
          <span className="block text-[11px] leading-tight text-amber-100/80">{t("profile.accountPoints")}</span>
          <span className="mt-1 flex items-baseline gap-1">
            <span data-testid="profile-points" className="text-3xl font-black leading-none tabular-nums">
              {points}
            </span>
            <span className="text-xs font-semibold text-amber-200">{formatPoints(lang, points)}</span>
          </span>
          {node && (
            <span className="mt-2 inline-block rounded-full border border-amber-300/30 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
              {rankLabel(node.tierLevel)}
            </span>
          )}
        </span>
      </button>
    </section>
  );
}
