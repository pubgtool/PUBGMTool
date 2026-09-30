"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, Timer, Volume2, VolumeX } from "lucide-react";
import { FloatingRewards } from "@/components/vip/FloatingRewards";
import { CARD, GlowMeter, TierBadge } from "@/components/vip/parts";
import { toast } from "@/components/ui/Toast";
import { CYCLE_LABEL, MIN_COLLECT_USDT } from "@/config/nodes";
import { isSoundOn, setSoundOn } from "@/lib/feedback";
import { formatAmount } from "@/lib/format";
import { useNow, useRequireAuth } from "@/lib/hooks";
import { currentNode, dailyOutputOf } from "@/lib/nodes";
import { selectPendingOutput, selectTodayProfit, useAppStore } from "@/lib/store";
import { MS_PER_DAY, formatCountdown, msUntilNextUtcDay } from "@/lib/time";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

export function SettlementCard() {
  const positions = useAppStore((s) => s.positions);
  const tiers = useAppStore((s) => s.tiers);
  const guest = useAppStore((s) => s.user.isGuest);
  const pending = useAppStore(selectPendingOutput);
  const today = useAppStore(selectTodayProfit);
  const collectOutput = useAppStore((s) => s.collectOutput);
  const requireAuth = useRequireAuth();
  const now = useNow(1_000);

  const [sound, setSound] = useState(true);
  useEffect(() => setSound(isSoundOn()), []);

  const node = currentNode(positions);
  const tier = node ? tiers.find((t) => t.id === node.tierId) : undefined;
  const untilMs = msUntilNextUtcDay(now);
  const cyclePct = ((MS_PER_DAY - untilMs) / MS_PER_DAY) * 100;
  const ready = pending >= MIN_COLLECT_USDT;

  const onCollect = () => {
    if (!requireAuth("Sign in to collect compute output")) return;
    const result = collectOutput();
    if (!result.ok) toast.error(result.error);
    else toast.success(`Collected +${formatAmount(result.amount, result.amount < 1 ? 4 : 2)} USDT`);
  };

  const hint = guest
    ? "Sign in to start a compute node."
    : !node
      ? "Allocate a node to start producing output."
      : ready
        ? "Ready to collect now, or it is distributed automatically at 00:00 UTC."
        : `Collection opens at ${formatAmount(MIN_COLLECT_USDT)} USDT. It is distributed automatically at ${CYCLE_LABEL}.`;

  return (
    <section aria-label="Compute cycle" data-testid="settlement-card" className={`${CARD} relative overflow-hidden p-5`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/5 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Timer className="h-3.5 w-3.5 text-amber-400" aria-hidden />
            Compute cycle
          </p>
          <button
            type="button"
            aria-pressed={sound}
            aria-label={sound ? "Mute distribution sound" : "Unmute distribution sound"}
            data-testid="sound-toggle"
            onClick={() => {
              setSoundOn(!sound);
              setSound(!sound);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {sound ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">Next compute cycle distribution in:</p>
        <p
          role="timer"
          data-testid="cycle-countdown"
          className="mt-1 font-mono text-4xl font-semibold tracking-tight tabular-nums text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]"
        >
          {formatCountdown(untilMs)}
        </p>
        <div className="mt-3">
          <GlowMeter pct={cyclePct} label="Progress through today's compute cycle" />
          <p className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-400">
            <span>Cycle {cyclePct.toFixed(0)}% complete</span>
            <span>Resets {CYCLE_LABEL}</span>
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-950/60 p-4">
          <div className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Pending output</dt>
            <dd data-testid="pending-output" className="mt-1 truncate font-mono text-lg font-semibold tabular-nums text-emerald-400">
              +{formatAmount(pending, 6)}
            </dd>
            <dd className="text-[11px] text-slate-400">USDT · builds live</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Today&apos;s profit</dt>
            <dd data-testid="today-profit" className="mt-1 truncate font-mono text-lg font-semibold tabular-nums text-slate-100">
              +{formatAmount(today, 4)}
            </dd>
            <dd className="text-[11px] text-slate-400">USDT · collected + pending</dd>
          </div>
        </dl>

        <div data-testid="node-summary" className="mt-4 flex items-center gap-2 text-xs text-slate-300">
          {node ? (
            <>
              <TierBadge level={node.tierLevel} />
              <span className="min-w-0 flex-1 truncate">{tier?.title ?? node.tierName}</span>
              <span className="shrink-0 font-mono tabular-nums text-slate-400">{formatAmount(dailyOutputOf(node))} USDT/day</span>
            </>
          ) : (
            <span className="text-slate-400">No compute node running</span>
          )}
        </div>

        <div className="relative mt-4">
          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={onCollect}
            disabled={!guest && !ready}
            data-testid="collect-output"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 py-3.5 text-sm font-bold text-slate-950 outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400"
          >
            <Coins className="h-4 w-4" aria-hidden />
            Collect Compute Output
          </motion.button>
          <FloatingRewards />
        </div>
        <p data-testid="collect-hint" className="mt-2 text-center text-[11px] text-slate-400">
          {hint}
        </p>
      </div>
    </section>
  );
}
