"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BellOff, CheckCheck, ChevronLeft, Gift, ShieldCheck, Server, X, type LucideIcon } from "lucide-react";
import { ALERT_CATEGORIES, ageLabel, categoryOf, groupByDay, type AlertCategory } from "@/lib/alerts";
import { useNow } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";

type Filter = "all" | AlertCategory;

const SPRING = { type: "spring", stiffness: 500, damping: 35 } as const;

const CATEGORY_STYLE: Record<AlertCategory, { Icon: LucideIcon; tile: string }> = {
  rewards: { Icon: Gift, tile: "bg-amber-500/15 text-amber-700" },
  security: { Icon: ShieldCheck, tile: "bg-emerald-500/15 text-emerald-700" },
  system: { Icon: Server, tile: "bg-sky-500/15 text-sky-300" },
};

export function AlertsView() {
  const notifications = useAppStore((s) => s.notifications);
  const markAsRead = useAppStore((s) => s.markAsRead);
  const markAllAsRead = useAppStore((s) => s.markAllAsRead);
  const deleteNotification = useAppStore((s) => s.deleteNotification);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const reduceMotion = useReducedMotion();
  const now = useNow(30_000);
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(() => [...notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [notifications]);
  const counts = useMemo(() => {
    const c: Record<Filter, { total: number; unread: number }> = {
      all: { total: 0, unread: 0 },
      rewards: { total: 0, unread: 0 },
      security: { total: 0, unread: 0 },
      system: { total: 0, unread: 0 },
    };
    for (const n of sorted) {
      for (const key of ["all", categoryOf(n)] as const) {
        c[key].total += 1;
        if (!n.read) c[key].unread += 1;
      }
    }
    return c;
  }, [sorted]);
  const visible = useMemo(() => sorted.filter((n) => filter === "all" || categoryOf(n) === filter), [sorted, filter]);
  const groups = useMemo(() => groupByDay(visible, now), [visible, now]);

  const tabs: ReadonlyArray<{ id: Filter; label: string }> = [{ id: "all", label: "All" }, ...ALERT_CATEGORIES];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 px-4 pb-1 pt-5">
        <button
          type="button"
          onClick={() => setActiveTab("main")}
          aria-label="Back to Home"
          className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-full text-fg-secondary outline-none transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold tracking-tight">Alerts</h1>
          <p data-testid="alerts-summary" className="text-xs text-fg-secondary">
            {counts.all.unread > 0 ? `${counts.all.unread} unread` : "You're all caught up"}
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={markAllAsRead}
          disabled={counts.all.unread === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-surface px-3 py-2 text-xs font-semibold text-fg outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-40"
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden />
          Mark all read
        </motion.button>
      </header>

      <div role="group" aria-label="Filter alerts" className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-1 pt-3">
        {tabs.map((t) => {
          const active = t.id === filter;
          const unread = counts[t.id].unread;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              data-testid={`alert-filter-${t.id}`}
              onClick={() => setFilter(t.id)}
              className="relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {active ? (
                <motion.span layoutId="alerts-filter-pill" className="btn-primary absolute inset-0 rounded-full" transition={SPRING} />
              ) : (
                <span className="absolute inset-0 rounded-full border border-gray-200 bg-surface" />
              )}
              <span className={`relative ${active ? "text-white" : "text-fg-secondary"}`}>{t.label}</span>
              {unread > 0 && (
                <span
                  className={`relative flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <main className="flex flex-col gap-4 px-4 pb-4 pt-3">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-surface px-4 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-fg-muted">
              <BellOff className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-semibold">Nothing here yet</p>
            <p className="mt-1 text-xs text-fg-secondary">New alerts will appear here as they happen.</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{group.label}</h2>
              <ul className="mt-2 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {group.items.map((n) => {
                    const category = categoryOf(n);
                    const { Icon, tile } = CATEGORY_STYLE[category];
                    return (
                      <motion.li
                        key={n.id}
                        layout={!reduceMotion}
                        initial={false}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
                        transition={SPRING}
                        data-testid="alert-item"
                        data-category={category}
                        data-read={n.read}
                        className={`relative flex items-start gap-3 overflow-hidden rounded-2xl border p-3.5 ${
                          n.read ? "border-gray-200 bg-surface" : "border-amber-200 bg-amber-50/70"
                        }`}
                      >
                        {!n.read && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-amber-400" />}
                        <button
                          type="button"
                          onClick={() => markAsRead(n.id)}
                          aria-label={`${n.title}${n.read ? "" : " (unread, tap to mark as read)"}`}
                          className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tile}`}>
                            <Icon className="h-[18px] w-[18px]" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">{n.title}</span>
                              {!n.read && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />}
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-fg-secondary">{n.body}</span>
                            <span className="mt-1.5 block text-[11px] tabular-nums text-fg-muted">{ageLabel(n.createdAt, now)}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNotification(n.id)}
                          aria-label={`Dismiss ${n.title}`}
                          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-muted outline-none transition-colors hover:bg-gray-100 hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
