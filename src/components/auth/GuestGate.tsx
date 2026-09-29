"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

interface Props {
  title: string;
  text: string;
  /** Shown at the top of the sign-in modal so the user knows why it opened. */
  reason: string;
  compact?: boolean;
}

/** Locked-feature card for guests, with one-tap routes into the auth modal. */
export function GuestGate({ title, text, reason, compact = false }: Props) {
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  return (
    <section
      aria-label={title}
      data-testid="guest-gate"
      className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className={compact ? "flex items-start gap-3" : "flex flex-col items-center text-center"}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <div className={compact ? "min-w-0" : "mt-3"}>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{text}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={() => openAuthModal("login", reason)}
          className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-900 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Sign In
        </motion.button>
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={() => openAuthModal("register", reason)}
          className="rounded-2xl bg-slate-950 py-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          Create Account
        </motion.button>
      </div>
    </section>
  );
}
