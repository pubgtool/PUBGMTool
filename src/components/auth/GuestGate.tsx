"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const TAP_CTA = { scale: 0.95 } as const;
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
      className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
    >
      <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
      <div className={`relative ${compact ? "flex items-start gap-3" : "flex flex-col items-center text-center"}`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-amber-400/10 text-amber-700">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <div className={compact ? "min-w-0" : "mt-3"}>
          <h2 className="text-sm font-extrabold">{title}</h2>
          <p className="mt-1 text-xs text-fg-secondary">{text}</p>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={() => openAuthModal("login", reason)}
          className="min-h-11 rounded-2xl border border-gray-200 bg-surface py-3.5 text-sm font-semibold text-fg outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Sign In
        </motion.button>
        <motion.button
          type="button"
          whileTap={TAP_CTA}
          transition={SPRING}
          onClick={() => openAuthModal("register", reason)}
          className="btn-primary min-h-11 rounded-2xl py-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          Create Account
        </motion.button>
      </div>
    </section>
  );
}
