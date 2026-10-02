"use client";

import { useLayoutEffect } from "react";
import { AboutView } from "@/components/screens/AboutView";
import { AlertsView } from "@/components/screens/AlertsView";
import { ProfileView } from "@/components/screens/ProfileView";
import { PromotionsView } from "@/components/screens/PromotionsView";
import { SettingsView } from "@/components/screens/SettingsView";
import { SupportView } from "@/components/screens/SupportView";
import { TasksView } from "@/components/screens/TasksView";
import { TeamView } from "@/components/screens/TeamView";
import { ValidatorView } from "@/components/screens/ValidatorView";
import { WalletView } from "@/components/screens/WalletView";
import { InviteView } from "@/components/screens/InviteView";
import { LanguageView } from "@/components/screens/LanguageView";
import { SecurityView } from "@/components/screens/SecurityView";
import { HomeView } from "@/components/views/HomeView";
import { VIPView } from "@/components/vip/VIPView";
import { useAppStore } from "@/lib/store";

/** Screens that have not shipped yet. */
function ComingSoon() {
  return (
    <main className="flex-1 px-4 pt-6">
      <h1 className="text-xl font-bold tracking-tight">Coming soon</h1>
      <p className="mt-2 rounded-2xl border border-slate-100 bg-white px-4 py-6 text-sm text-fg-secondary shadow-card">This section opens in an upcoming release.</p>
    </main>
  );
}

export function TabOutlet() {
  const tab = useAppStore((s) => s.activeTab);

  // Tabs share one document scroll; start each at the top. Runs before child
  // effects, so a scroll-to-tier from Home still wins.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  switch (tab) {
    case "main":
      return <HomeView />;
    case "vaults":
      return <VIPView />;
    case "validator":
      return <ValidatorView />;
    case "wallet":
      return <WalletView />;
    case "profile":
      return <ProfileView />;
    case "tasks":
      return <TasksView />;
    case "support":
      return <SupportView />;
    case "notifications":
      return <AlertsView />;
    case "promos":
      return <PromotionsView />;
    case "settings":
      return <SettingsView />;
    case "team":
      return <TeamView />;
    case "about":
      return <AboutView />;
    case "invite":
      return <InviteView />;
    case "security":
      return <SecurityView />;
    case "language":
      return <LanguageView />;
    default:
      return <ComingSoon />;
  }
}
