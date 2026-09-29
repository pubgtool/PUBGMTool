"use client";

import { motion } from "framer-motion";
import { Bell, LayoutGrid, User, Wallet, Zap, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { selectUnreadCount, useAppStore } from "@/lib/store";
import type { AppTab } from "@/types/domain";

interface NavItem {
  tab: AppTab;
  label: string;
  Icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { tab: "main", label: "Main", Icon: LayoutGrid },
  { tab: "vaults", label: "VIP", Icon: Zap },
  { tab: "wallet", label: "Wallet", Icon: Wallet },
  { tab: "notifications", label: "Alerts", Icon: Bell },
  { tab: "profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const unread = useAppStore(selectUnreadCount);
  const pathname = usePathname();
  const router = useRouter();

  const select = (tab: AppTab) => {
    setActiveTab(tab);
    if (pathname !== "/") router.push("/");
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-slate-100 bg-white/90 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <ul className="flex items-center justify-between">
        {NAV_ITEMS.map(({ tab, label, Icon }) => {
          const shown = activeTab === "tasks" ? "main" : activeTab;
          const active = tab === shown && pathname === "/";
          return (
            <li key={tab}>
              <button
                type="button"
                onClick={() => select(tab)}
                aria-current={active ? "page" : undefined}
                className="relative flex w-16 touch-manipulation flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-2xl bg-slate-100"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 transition-colors ${active ? "text-slate-950" : "text-slate-400"}`}
                    aria-hidden
                  />
                  {tab === "notifications" && unread > 0 && (
                    <motion.span
                      key={unread}
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}
                      className="tabular absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white"
                      aria-label={`${unread} unread`}
                    >
                      {unread > 99 ? "99+" : unread}
                    </motion.span>
                  )}
                </span>
                <span
                  className={`relative text-[10px] font-medium ${active ? "text-slate-950" : "text-slate-400"}`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
