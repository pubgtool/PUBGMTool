"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Headset, Send, Ticket } from "lucide-react";
import { ChatPanel } from "@/components/support/ChatPanel";
import { StatusDot } from "@/components/support/StatusDot";
import { TicketSheet } from "@/components/support/TicketSheet";
import { SUPPORT } from "@/config/protocol";
import { useChatStore } from "@/lib/chat";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const stamp = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export function SupportView() {
  const setInlineViewing = useChatStore((s) => s.setInlineViewing);
  const tickets = useAppStore((s) => s.tickets);
  const [ticketOpen, setTicketOpen] = useState(false);

  // While this screen is showing, replies are read as they arrive.
  useEffect(() => {
    setInlineViewing(true);
    return () => setInlineViewing(false);
  }, [setInlineViewing]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight">{SUPPORT.deskName}</h1>
            <p data-testid="support-status" className="mt-1.5 flex items-center gap-2 text-xs text-fg-secondary">
              <StatusDot />
              <span>Automated assistant</span>
              <span aria-hidden className="text-gray-400">·</span>
              <span>{SUPPORT.replyNote}</span>
            </p>
          </div>
          <span className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-btn">
            <Headset className="h-5 w-5" aria-hidden />
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <motion.a
            href={SUPPORT.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={TAP}
            transition={SPRING}
            data-testid="telegram-link"
            className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 outline-none transition-colors hover:bg-sky-500/15 focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
              <Send className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-xs font-bold">
                Telegram Support VIP
                <ExternalLink className="h-3 w-3 shrink-0 text-fg-muted" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </span>
              <span className="block truncate text-[11px] text-fg-secondary">Talk to the team</span>
            </span>
          </motion.a>

          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={() => setTicketOpen(true)}
            data-testid="open-ticket"
            className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-100 bg-amber-500/10 p-3 text-left outline-none transition-colors hover:bg-amber-500/15 focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span className="btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <Ticket className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold">Open a ticket</span>
              <span className="block truncate text-[11px] text-fg-secondary">Add screenshots</span>
            </span>
          </motion.button>
        </div>

        <section
          aria-label="Live chat"
          data-testid="inline-chat"
          className="flex h-[min(34rem,calc(100dvh-21rem))] min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-surface shadow-card"
        >
          <ChatPanel className="flex-1" />
        </section>

        {tickets.length > 0 && (
          <section aria-label="Your tickets">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Your tickets</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {tickets.slice(0, 3).map((t) => (
                <li key={t.id} data-testid="ticket-row" className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-surface px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
                    <Ticket className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className="font-mono tabular-nums">{t.ref}</span>
                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-emerald-700">{t.status}</span>
                    </span>
                    <span className="block truncate text-xs text-fg-secondary">
                      {t.subject} · {stamp.format(new Date(t.createdAt))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <TicketSheet open={ticketOpen} onClose={() => setTicketOpen(false)} />
    </div>
  );
}
