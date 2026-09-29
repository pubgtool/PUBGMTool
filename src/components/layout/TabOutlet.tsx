"use client";

import { NAV_ITEMS } from "@/components/layout/BottomNav";
import { MainView } from "@/components/screens/MainView";
import { formatUsdt } from "@/lib/format";
import { selectTotalBalance, selectUnreadCount, useAppStore } from "@/lib/store";

/** Live summary for tabs whose full screen has not shipped yet. */
function PlaceholderView() {
  const tab = useAppStore((s) => s.activeTab);
  const total = useAppStore(selectTotalBalance);
  const balances = useAppStore((s) => s.balances);
  const unread = useAppStore(selectUnreadCount);
  const tiers = useAppStore((s) => s.tiers);
  const user = useAppStore((s) => s.user);

  const title = NAV_ITEMS.find((i) => i.tab === tab)?.label ?? "Main";
  const rows: Array<[string, string]> =
    tab === "vaults"
      ? tiers.map((t) => [t.name, `${t.dailyRatePct}% daily${t.isActive ? "" : " · closed"}`])
      : tab === "notifications"
        ? [["Unread alerts", String(unread)]]
        : tab === "profile"
          ? [
              ["Account", user.displayName],
              ["KYC", user.kycStatus],
            ]
          : [
              ["Total balance", formatUsdt(total)],
              ["Available", formatUsdt(balances.available)],
              ["Staked", formatUsdt(balances.staked)],
              ["Earned today", formatUsdt(balances.dailyAccrued)],
            ];

  return (
    <main className="flex-1 px-4 pt-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
            <dt className="text-slate-500">{k}</dt>
            <dd className="tabular font-mono font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}

export function TabOutlet() {
  const tab = useAppStore((s) => s.activeTab);
  return tab === "main" ? <MainView /> : <PlaceholderView />;
}
