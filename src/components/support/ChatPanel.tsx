"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SendHorizontal } from "lucide-react";
import { SUPPORT } from "@/config/protocol";
import { MAX_MESSAGE_LENGTH, useChatStore } from "@/lib/chat";
import { FAQ_PILLS } from "@/lib/support";

const SPRING = { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } as const;
const TAP = { scale: 0.94 } as const;

const clock = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

/** Thread, quick questions and composer. Shared by the floating sheet and the Support tab. */
export function ChatPanel({ className = "" }: { className?: string }) {
  const messages = useChatStore((s) => s.messages);
  const typing = useChatStore((s) => s.pending > 0);
  const send = useChatStore((s) => s.send);
  const reduceMotion = useReducedMotion();

  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstScroll = useRef(true);

  // Pin to the newest message; jump on open, glide afterwards.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: firstScroll.current || reduceMotion ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [messages.length, typing, reduceMotion]);

  const submit = () => {
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div
        ref={threadRef}
        role="log"
        aria-label="Support conversation"
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain bg-canvas/60 px-4 py-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.from === "user";
            return (
              <motion.div
                key={m.id}
                data-testid="chat-message"
                data-from={m.from}
                initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={SPRING}
                className={`flex max-w-[86%] flex-col ${mine ? "items-end self-end" : "items-start self-start"}`}
              >
                <p
                  className={`whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    mine ? "btn-primary rounded-br-md font-medium" : "rounded-bl-md border border-gray-200 bg-surface text-fg"
                  }`}
                >
                  {m.text}
                </p>
                <span className="mt-1 px-1 text-[10px] tabular-nums text-fg-muted">
                  {mine ? "You" : SUPPORT.agentName} · {clock.format(m.at)}
                </span>
              </motion.div>
            );
          })}

          {typing && (
            <motion.div
              key="typing"
              role="status"
              data-testid="typing-indicator"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
              className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md border border-gray-200 bg-surface px-3.5 py-2.5"
            >
              <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: `${i * 140}ms` }} />
                ))}
              </span>
              <span className="text-xs text-fg-secondary">{SUPPORT.agentName} is typing…</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-gray-200 bg-surface px-4 pb-3 pt-3">
        <div className="flex flex-wrap gap-2 pb-2.5" role="group" aria-label="Frequently asked questions">
          {FAQ_PILLS.map((pill) => (
            <motion.button
              key={pill}
              type="button"
              whileTap={TAP}
              transition={SPRING}
              onClick={() => send(pill)}
              className="rounded-full border border-slate-100 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-700 outline-none transition-colors hover:bg-amber-500/20 focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {pill}
            </motion.button>
          ))}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            enterKeyHint="send"
            autoComplete="off"
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Write a message…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 rounded-full border border-gray-200 bg-canvas px-4 py-3 text-base outline-none transition-colors placeholder:text-slate-500 focus:border-amber-400"
          />
          <motion.button
            type="submit"
            whileTap={draft.trim() ? TAP : undefined}
            transition={SPRING}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
          >
            <SendHorizontal className="h-[18px] w-[18px]" aria-hidden />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
