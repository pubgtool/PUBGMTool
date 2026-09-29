"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock, SendHorizontal, ShieldCheck, X } from "lucide-react";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { SUPPORT } from "@/config/protocol";
import { MAX_MESSAGE_LENGTH, useChatStore } from "@/lib/chat";
import { FAQ_PILLS } from "@/lib/support";

const SPRING = { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } as const;
const TAP = { scale: 0.94 } as const;

const clock = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LiveChatSheet({ open, onClose }: Props) {
  const setSheetOpen = useChatStore((s) => s.setSheetOpen);
  useEffect(() => {
    setSheetOpen(open);
    return () => setSheetOpen(false);
  }, [open, setSheetOpen]);

  return (
    <BottomSheet open={open} onClose={onClose} keyboardAware>
      {open && <ChatBody onClose={onClose} />}
    </BottomSheet>
  );
}

function ChatBody({ onClose }: { onClose: () => void }) {
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
    thread.scrollTo({
      top: thread.scrollHeight,
      behavior: firstScroll.current || reduceMotion ? "auto" : "smooth",
    });
    firstScroll.current = false;
  }, [messages.length, typing, reduceMotion]);

  const submit = () => {
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "min(620px, calc(var(--sheet-max, 92dvh) - 1.75rem))" }}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 pb-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <div className="min-w-0 flex-1">
          <SheetTitle className="truncate text-sm font-semibold leading-tight">
            {SUPPORT.agentName} <span className="font-medium text-emerald-600">(Online)</span>
          </SheetTitle>
          <SheetDescription asChild>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              <Clock className="h-3 w-3" aria-hidden />
              Avg. Reply: {SUPPORT.avgReply}
            </span>
          </SheetDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-full bg-slate-100 p-2 text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        ref={threadRef}
        role="log"
        aria-label="Support conversation"
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4"
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
                    mine
                      ? "rounded-br-md bg-slate-950 text-white"
                      : "rounded-bl-md border border-slate-100 bg-white text-slate-800 shadow-sm"
                  }`}
                >
                  {m.text}
                </p>
                <span className="mt-1 px-1 text-[10px] tabular-nums text-slate-400">
                  {mine ? "You" : "Officer"} · {clock.format(m.at)}
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
              className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md border border-slate-100 bg-white px-3.5 py-2.5 shadow-sm"
            >
              <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs text-slate-500">Officer is typing…</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-slate-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2.5" role="group" aria-label="Frequently asked questions">
          {FAQ_PILLS.map((pill) => (
            <motion.button
              key={pill}
              type="button"
              whileTap={TAP}
              transition={SPRING}
              onClick={() => send(pill)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900"
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
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition-colors placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
          />
          <motion.button
            type="submit"
            whileTap={draft.trim() ? TAP : undefined}
            transition={SPRING}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
          >
            <SendHorizontal className="h-[18px] w-[18px]" aria-hidden />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
