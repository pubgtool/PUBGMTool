"use client";

import { Bell } from "lucide-react";
import { useT } from "@/lib/i18n";
import { selectUnreadCount, useAppStore } from "@/lib/store";

/** Notification bell with the unread count as a red pill. */
export function BellButton() {
  const { t } = useT();
  const unread = useAppStore(selectUnreadCount);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  return (
    <button
      type="button"
      onClick={() => setActiveTab("notifications")}
      aria-label={unread > 0 ? t("profile.alertsUnread", { n: unread }) : t("profile.alerts")}
      data-testid="bell"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-800 outline-none transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-gray-900"
    >
      <Bell className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      {unread > 0 && (
        <span
          data-testid="bell-count"
          className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none tabular-nums text-white ring-2 ring-canvas"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
