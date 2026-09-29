"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Check, Gift } from "lucide-react";
import { BurstEffect } from "@/components/ui/Burst";
import { CHECK_IN_CYCLE, CHECK_IN_REWARDS } from "@/config/rewards";
import { formatAmount } from "@/lib/format";
import { formatCountdown } from "@/lib/time";
import type { CheckInView } from "@/lib/rewards";

const TAP = { scale: 0.97 } as const;
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
    <section aria-label="Daily node check-in" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarCheck className="h-4 w-4 text-slate-400" aria-hidden />
        Daily Node Check-In
      </h2>
      <p className="mt-1 text-xs text-slate-500">
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
            ? "border-slate-950 bg-slate-950 text-white"
            : current
              ? "border-amber-400 bg-amber-50 text-slate-900 ring-2 ring-amber-300/60"
              : milestone
                ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 text-slate-500"
                : "border-slate-100 bg-slate-50 text-slate-400";

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
              {claimed && <Check className="absolute right-1 top-1 h-3 w-3 opacity-80" aria-label="claimed" />}
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider opacity-80">
                Day {day}
              </span>
              <span className="mt-1 flex items-center gap-1 font-mono text-sm font-semibold tabular-nums">
                {milestone && <Gift className={`h-3.5 w-3.5 ${claimed ? "text-amber-300" : "text-amber-500"}`} aria-hidden />}
                +{formatAmount(reward)}
              </span>
              {milestone && (
                <span className={`mt-0.5 text-[10px] font-medium ${claimed ? "text-amber-200" : "text-amber-600"}`}>
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
          className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500"
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
