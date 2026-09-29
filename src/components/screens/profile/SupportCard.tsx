"use client";

import { motion } from "framer-motion";
import { ExternalLink, Headset, MessageCircle, Send } from "lucide-react";
import { SUPPORT } from "@/config/protocol";
import { useChatStore } from "@/lib/chat";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

export function SupportCard({ onOpenChat }: { onOpenChat: () => void }) {
  const unread = useChatStore((s) => s.unread);

  const links = [
    { label: "Telegram VIP Concierge", href: SUPPORT.telegramUrl, Icon: Send, tint: "bg-sky-50 text-sky-600" },
    { label: "WhatsApp Desk", href: SUPPORT.whatsappUrl, Icon: MessageCircle, tint: "bg-emerald-50 text-emerald-600" },
  ] as const;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" aria-label="Support">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Headset className="h-4 w-4 text-slate-400" aria-hidden />
        Institutional Concierge &amp; Support
      </h2>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Officers online · Avg. reply {SUPPORT.avgReply}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {links.map(({ label, href, Icon, tint }) => (
          <motion.a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={TAP}
            transition={SPRING}
            className="flex flex-col items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3.5 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tint}`}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="flex w-full items-start justify-between gap-1 text-xs font-semibold leading-snug">
              {label}
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </span>
          </motion.a>
        ))}
      </div>

      <motion.button
        type="button"
        whileTap={TAP}
        transition={SPRING}
        onClick={onOpenChat}
        className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Open Live In-App Chat
        {unread > 0 && (
          <span
            data-testid="chat-unread"
            aria-label={`${unread} unread ${unread === 1 ? "reply" : "replies"}`}
            className="absolute right-3 top-1/2 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold leading-none tabular-nums"
          >
            {unread}
          </span>
        )}
      </motion.button>
    </section>
  );
}
