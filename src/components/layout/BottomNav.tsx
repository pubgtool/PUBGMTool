"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Box, Home, PieChart, User, Vault, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type MessageKey, useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import type { AppTab } from "@/types/domain";

interface NavItem {
  tab: AppTab;
  label: MessageKey;
  Icon: LucideIcon;
  /** The raised round button in the middle. */
  anchor?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { tab: "vaults", label: "nav.staking", Icon: Vault },
  { tab: "validator", label: "nav.validator", Icon: Box },
  { tab: "main", label: "nav.home", Icon: Home, anchor: true },
  { tab: "wallet", label: "nav.assets", Icon: PieChart },
  { tab: "profile", label: "nav.profile", Icon: User },
];

/** Screens that live under a dock item keep that item lit. */
const PARENT: Partial<Record<AppTab, AppTab>> = {
  tasks: "main",
  notifications: "main",
  promos: "main",
  support: "profile",
  settings: "profile",
  team: "profile",
  about: "profile",
  admin: "profile",
};

const BOUNCE = { type: "spring", stiffness: 520, damping: 22 } as const;

export function BottomNav() {
  const { t } = useT();
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shown = PARENT[activeTab] ?? activeTab;

  const select = (tab: AppTab) => {
    setActiveTab(tab);
    if (pathname !== "/") router.push("/");
  };

  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-gray-100 bg-white/95 pb-safe shadow-dock backdrop-blur-md"
    >
      <ul className="grid grid-cols-5 items-end px-2 pt-1.5">
        {NAV_ITEMS.map(({ tab, label, Icon, anchor }) => {
          const active = tab === shown && pathname === "/";
          const text = t(label);
          return (
            <li key={tab} className="flex min-w-0 justify-center">
              {anchor ? (
                // The wrapper carries the lift: Framer's inline transform on the button would override a translate class.
                <span className="block -translate-y-4">
                  <motion.button
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                    transition={BOUNCE}
                    onClick={() => select(tab)}
                    aria-label={text}
                    aria-current={active ? "page" : undefined}
                    data-testid="dock-home"
                    className="flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-black text-white shadow-lg ring-4 ring-white outline-none focus-visible:ring-gray-900"
                  >
                    <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} aria-hidden />
                  </motion.button>
                </span>
              ) : (
                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  transition={BOUNCE}
                  onClick={() => select(tab)}
                  aria-current={active ? "page" : undefined}
                  data-testid={`dock-${tab}`}
                  className={`flex w-full touch-manipulation flex-col items-center gap-1 rounded-xl px-1 pb-1.5 pt-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gray-900 ${
                    active ? "text-gray-900" : "text-fg-muted"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  <span className={`max-w-full truncate text-[10px] leading-none ${active ? "font-bold" : "font-medium"}`}>{text}</span>
                </motion.button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
