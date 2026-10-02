"use client";

import { Bot, Megaphone, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { useChatStore } from "@/lib/chat";
import { type MessageKey, useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import type { AppTab } from "@/types/domain";

const ITEMS: ReadonlyArray<{ id: string; tab: AppTab; label: MessageKey; Icon: LucideIcon }> = [
  { id: "wallet", tab: "wallet", label: "grid.wallet", Icon: Wallet },
  { id: "invite", tab: "invite", label: "grid.invite", Icon: UserPlus },
  { id: "promos", tab: "promos", label: "grid.promotions", Icon: Megaphone },
  { id: "support", tab: "support", label: "grid.support", Icon: Bot },
];

/** Four shortcuts in one row. */
export function UtilityGrid() {
  const { t } = useT();
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const unread = useChatStore((s) => s.unread);

  return (
    <nav aria-label={t("grid.label")} data-testid="utility-grid" className={`${CARD} p-2`}>
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ id, tab, label, Icon }) => {
          const badge = id === "support" && unread > 0;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-label={badge ? t("grid.supportUnread", { n: unread }) : undefined}
                data-testid={`util-${id}`}
                className="flex min-h-[76px] w-full flex-col items-center justify-center gap-2 rounded-xl px-1 py-3 text-gray-800 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900"
              >
                <span className="relative">
                  <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden />
                  {badge && (
                    <span
                      data-testid="chat-unread"
                      className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none tabular-nums text-white ring-2 ring-white"
                    >
                      {unread}
                    </span>
                  )}
                </span>
                <span className="text-xs font-medium leading-tight text-gray-700">{t(label)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
