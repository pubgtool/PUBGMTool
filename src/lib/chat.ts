import { create } from "zustand";
import { SUPPORT } from "@/config/protocol";
import { useAppStore } from "@/lib/store";
import { GREETING, pickSupportReply } from "@/lib/support";

export interface ChatMessage {
  id: string;
  from: "agent" | "user";
  text: string;
  at: number;
}

interface ChatState {
  messages: ChatMessage[];
  /** Replies still on their way; drives the typing indicator. */
  pending: number;
  /** Replies that arrived while nobody was looking at the chat. */
  unread: number;
  /** The inline chat on the Support tab. */
  inlineViewing: boolean;
  send: (text: string) => void;
  setInlineViewing: (viewing: boolean) => void;
  reset: () => void;
}

const MAX_MESSAGES = 200;
export const MAX_MESSAGE_LENGTH = 500;

let nextId = 1;
const timers = new Set<ReturnType<typeof setTimeout>>();

const message = (from: ChatMessage["from"], text: string): ChatMessage => ({
  id: `msg_${nextId++}`,
  from,
  text,
  at: Date.now(),
});

/**
 * In-memory on purpose: the conversation survives tab switches and closing
 * the sheet for the rest of the session, but not a reload.
 */
export const useChatStore = create<ChatState>()((set) => ({
  messages: [message("agent", GREETING)],
  pending: 0,
  unread: 0,
  inlineViewing: false,

  send: (raw) => {
    const text = raw.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return;
    set((s) => ({
      messages: [...s.messages, message("user", text)].slice(-MAX_MESSAGES),
      pending: s.pending + 1,
    }));
    const timer = setTimeout(() => {
      timers.delete(timer);
      const reply = pickSupportReply(text, useAppStore.getState().tiers);
      set((s) => ({
        messages: [...s.messages, message("agent", reply)].slice(-MAX_MESSAGES),
        pending: Math.max(0, s.pending - 1),
        unread: s.inlineViewing ? s.unread : s.unread + 1,
      }));
    }, SUPPORT.replyDelayMs);
    timers.add(timer);
  },

  setInlineViewing: (inlineViewing) => set((s) => ({ inlineViewing, unread: inlineViewing ? 0 : s.unread })),

  reset: () => {
    timers.forEach(clearTimeout);
    timers.clear();
    set({ messages: [message("agent", GREETING)], pending: 0, unread: 0 });
  },
}));
