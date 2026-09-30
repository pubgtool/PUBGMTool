"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatAmount } from "@/lib/format";
import { haptic, playChime } from "@/lib/feedback";
import { useAppStore } from "@/lib/store";

interface Badge {
  key: string;
  x: number;
  delay: number;
  text: string;
}

const LIFETIME_MS = 2_600;
const COUNT = 4;

/**
 * Floats "+X USDT" badges up from the card when compute output reaches the
 * wallet, whether the user collected it or the 00:00 UTC cycle did. Events that
 * were already there when the screen opened are ignored.
 */
export function FloatingRewards() {
  const event = useAppStore((s) => s.distribution);
  const reduceMotion = useReducedMotion();
  const seen = useRef(event?.id ?? 0);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!event || event.id === seen.current) return;
    seen.current = event.id;
    const text = `+${formatAmount(event.amount, event.amount < 1 ? 4 : 2)} USDT`;
    const spread = reduceMotion ? 1 : COUNT;
    const created = Array.from({ length: spread }, (_, i) => ({
      key: `${event.id}-${i}`,
      x: reduceMotion ? 0 : (i - (spread - 1) / 2) * 34,
      delay: i * 0.14,
      text,
    }));
    setBadges((current) => [...current, ...created]);
    playChime("collect");
    haptic([16, 40, 24]);
    const timer = setTimeout(() => setBadges((current) => current.filter((b) => !created.some((c) => c.key === b.key))), LIFETIME_MS + spread * 140);
    return () => clearTimeout(timer);
  }, [event, reduceMotion]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
      <AnimatePresence>
        {badges.map((b) => (
          <motion.span
            key={b.key}
            data-testid="floating-reward"
            initial={{ opacity: 0, y: 12, x: b.x, scale: 0.8 }}
            animate={reduceMotion ? { opacity: 1, y: -20, x: b.x, scale: 1 } : { opacity: [0, 1, 1, 0], y: -90, x: b.x, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: LIFETIME_MS / 1000, delay: b.delay, ease: "easeOut" }}
            className="absolute rounded-full bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.55)]"
          >
            {b.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
