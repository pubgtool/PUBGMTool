"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Check, Gift } from "lucide-react";
import { BurstEffect } from "@/components/ui/Burst";
import { CHECK_IN_CYCLE, CHECK_IN_REWARDS } from "@/config/rewards";
import { formatAmount } from "@/lib/format";
import { formatCountdown } from "@/lib/time";
import type { CheckInView } from "@/lib/rewards";

const TAP = { scale: 0.95 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

interface Props {
  view: CheckInView;
  guest: boolean;
  /** Time until the next UTC day, for the "already checked in" state. */
  resetInMs: number;
  burstKey: number;
  /** Day that was just claimed, to pop its cell. */
  popDay: number | null;
  onCheckIn: () => void;
}

export function CheckInGrid({ view, guest, resetInMs, burstKey, popDay, onCheckIn }: Props) {
  const days = Array.from({ length: CHECK_IN_CYCLE }, (_, i) => i + 1);

  return (
    <section
      aria-label="Daily node check-in"
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card"
    >
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
        <CalendarCheck className="h-4 w-4 text-amber-700" aria-hidden />
        Daily Node Check-In
      </h2>
      <p className="mt-1 text-xs text-fg-secondary">
        Check in every UTC day to build a 7-day yield streak. Missing a day restarts it.
      </p>

      <ol className="mt-4 grid grid-cols-4 gap-2">
        {days.map((day) => {
          const reward = CHECK_IN_REWARDS[day - 1] ?? 0;
          const claimed = day <= view.claimed;
          const current = !view.doneToday && day === view.nextDay;
          const milestone = day === CHECK_IN_CYCLE;
          const state = claimed ? "claimed" : current ? "current" : "upcoming";

          const tone = claimed
            ? "border-emerald-400/40 bg-gradient-to-b from-emerald-500/20 to-emerald-500/[0.04] text-emerald-800"
            : current
              ? "border-amber-400 bg-gradient-to-b from-amber-400/25 to-amber-500/[0.06] text-amber-900"
              : milestone
                ? "border-slate-100 bg-gradient-to-br from-amber-500/10 to-orange-500/[0.04] text-fg-secondary"
                : "border-gray-200 bg-gray-50 text-fg-muted";

          return (
            <motion.li
              key={day}
              data-testid={`checkin-day-${day}`}
              data-state={state}
              animate={popDay === day ? { scale: [1, 1.14, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className={`relative flex flex-col items-center justify-center rounded-2xl border px-1 pb-3 pt-4 text-center ${tone} ${
                milestone ? "col-span-2" : ""
              }`}
            >
              {current && (
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl motion-safe:animate-glow-pulse" />
              )}
              {claimed && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-emerald-700" aria-label="claimed" />}
              <span className="relative whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider opacity-80">Day {day}</span>
              <span className="relative mt-1 flex items-center gap-1 font-mono text-sm font-bold tabular-nums">
                {milestone && <Gift className={`h-3.5 w-3.5 ${claimed ? "text-emerald-700" : "text-amber-700"}`} aria-hidden />}+{formatAmount(reward)}
              </span>
              {milestone && (
                <span className={`relative mt-0.5 text-[11px] font-semibold ${claimed ? "text-emerald-700" : "text-amber-700"}`}>
                  + Mystery Node Bonus
                </span>
              )}
            </motion.li>
          );
        })}
      </ol>

      <div className="relative mt-4">
        <motion.button
          type="button"
          whileTap={view.doneToday ? undefined : TAP}
          transition={SPRING}
          onClick={onCheckIn}
          disabled={view.doneToday}
          className={`w-full rounded-2xl py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
            view.doneToday ? "border border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-700" : "btn-primary"
          }`}
        >
          {guest ? (
            "Sign in to check in"
          ) : view.doneToday ? (
            <>
              Checked in · Next in <span data-testid="checkin-countdown" className="font-mono tabular-nums">{formatCountdown(resetInMs)}</span>
            </>
          ) : (
            "Check-In & Claim Yield"
          )}
        </motion.button>
        <BurstEffect burstKey={burstKey} count={20} radius={96} />
      </div>
    </section>
  );
}
