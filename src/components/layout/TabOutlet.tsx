"use client";

import { useLayoutEffect } from "react";
import { NAV_ITEMS } from "@/components/layout/BottomNav";
import { MainView } from "@/components/screens/MainView";
import { ProfileView } from "@/components/screens/ProfileView";
import { TasksView } from "@/components/screens/TasksView";
import { VaultsView } from "@/components/screens/VaultsView";
import { WalletView } from "@/components/screens/WalletView";
import { selectUnreadCount, useAppStore } from "@/lib/store";

/** Live summary for tabs whose full screen has not shipped yet. */
function PlaceholderView() {
  const tab = useAppStore((s) => s.activeTab);
  const unread = useAppStore(selectUnreadCount);

  const title = NAV_ITEMS.find((i) => i.tab === tab)?.label ?? "Main";
  const rows: Array<[string, string]> =
    tab === "notifications" ? [["Unread alerts", String(unread)]] : [["Status", "Coming soon"]];

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

  // Tabs share one document scroll; start each at the top. Runs before child
  // effects, so a scroll-to-tier from Main still wins.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  if (tab === "main") return <MainView />;
  if (tab === "vaults") return <VaultsView />;
  if (tab === "wallet") return <WalletView />;
  if (tab === "profile") return <ProfileView />;
  if (tab === "tasks") return <TasksView />;
  return <PlaceholderView />;
}
