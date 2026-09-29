"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { create } from "zustand";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

const TOAST_DURATION_MS = 3_500;
const MAX_VISIBLE = 3;
let nextId = 1;

const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }].slice(-MAX_VISIBLE) }));
    setTimeout(() => get().dismiss(id), TOAST_DURATION_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper usable from anywhere on the client, including store callbacks. */
export const toast = {
  success: (message: string) => useToastStore.getState().push("success", message),
  error: (message: string) => useToastStore.getState().push("error", message),
  info: (message: string) => useToastStore.getState().push("info", message),
};

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />,
  error: <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden />,
  info: <Info className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />,
} as const;

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className="flex w-full max-w-md flex-col items-center gap-2"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 32, mass: 0.8 }}
              className="flex max-w-full items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-950/20"
            >
              {ICONS[t.kind]}
              <span className="truncate">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
