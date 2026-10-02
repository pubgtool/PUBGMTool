"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Cpu, Loader2, Send, UserPlus, type LucideIcon } from "lucide-react";
import { BurstEffect } from "@/components/ui/Burst";
import { TASKS, type TaskCategory, type TaskDef } from "@/config/rewards";
import { formatAmount } from "@/lib/format";
import type { TaskView } from "@/lib/rewards";

const TAP = { scale: 0.95 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

const ICONS: Record<TaskDef["id"], LucideIcon> = {
  "daily-compute": Cpu,
  telegram: Send,
  invite: UserPlus,
};

const CATEGORIES: readonly TaskCategory[] = ["Daily Node Task", "Community Mission", "Growth Mission"];

export interface MissionActions {
  onStart: (def: TaskDef) => void;
  /** Resolves true when the bounty was credited. */
  onClaim: (def: TaskDef) => boolean;
  onInvite: () => void;
  onGetPlan: () => void;
  onAuth: () => void;
}

interface Props extends MissionActions {
  views: Record<string, TaskView>;
  guest: boolean;
  invites: number;
}

export function MissionsList({ views, guest, invites, ...actions }: Props) {
  return (
    <section aria-label="Missions" className="flex flex-col gap-5">
      {CATEGORIES.map((category) => {
        const tasks = TASKS.filter((t) => t.category === category);
        if (tasks.length === 0) return null;
        return (
          <div key={category}>
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-fg-secondary">{category}</h2>
            <ul className="mt-2.5 flex flex-col gap-3">
              {tasks.map((def) => {
                const view = views[def.id];
                if (!view) return null;
                return <TaskCard key={def.id} def={def} view={view} guest={guest} invites={invites} {...actions} />;
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function statusLine(def: TaskDef, view: TaskView, invites: number): string {
  switch (view.status) {
    case "locked":
      return "Locked · needs an active VIP plan";
    case "idle":
      return def.kind === "invite" ? `${Math.min(invites, def.target)}/${def.target} invited` : "Not started";
    case "processing":
      return `${def.kind === "timed" ? "Verifying" : "Processing"} · ${Math.floor(view.progress * 100)}%`;
    case "ready":
      return "Ready to claim";
    case "claimed":
      return def.repeat === "daily" ? "Completed · resets 00:00 UTC" : "Completed";
  }
}

function TaskCard({
  def,
  view,
  guest,
  invites,
  onStart,
  onClaim,
  onInvite,
  onGetPlan,
  onAuth,
}: { def: TaskDef; view: TaskView; guest: boolean; invites: number } & MissionActions) {
  const [burst, setBurst] = useState(0);
  const Icon = ICONS[def.id];
  const seconds = Math.ceil(view.remainingMs / 1000);

  const base =
    "relative flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const ghostGold = `${base} border border-amber-400/50 bg-amber-400/10 text-amber-700 transition-colors hover:bg-amber-400/15 focus-visible:ring-amber-400`;

  let cta: React.ReactNode;
  if (guest) {
    cta = (
      <motion.button type="button" whileTap={TAP} transition={SPRING} onClick={onAuth} className={ghostGold}>
        Sign in
      </motion.button>
    );
  } else if (view.status === "claimed") {
    cta = (
      <button type="button" disabled className={`${base} border border-emerald-500/30 bg-emerald-500/10 text-emerald-700`}>
        <Check className="h-4 w-4" aria-hidden /> Completed
      </button>
    );
  } else if (view.status === "processing") {
    cta = (
      <button type="button" disabled className={`${base} border border-gray-200 bg-gray-50 text-fg-secondary`}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {def.kind === "timed" ? "Verifying" : "Processing"} · {seconds}s
      </button>
    );
  } else if (view.status === "ready") {
    cta = (
      <motion.button
        type="button"
        whileTap={TAP}
        transition={SPRING}
        onClick={() => {
          if (onClaim(def)) setBurst((n) => n + 1);
        }}
        className={`${base} btn-primary focus-visible:ring-amber-400`}
      >
        Claim Bounty
      </motion.button>
    );
  } else if (view.status === "locked") {
    cta = (
      <motion.button
        type="button"
        whileTap={TAP}
        transition={SPRING}
        onClick={onGetPlan}
        className={`${base} border border-gray-200 bg-surface text-fg transition-colors hover:bg-gray-50 focus-visible:ring-amber-400`}
      >
        Get a VIP plan
      </motion.button>
    );
  } else {
    cta = (
      <motion.button
        type="button"
        whileTap={TAP}
        transition={SPRING}
        onClick={() => (def.kind === "invite" ? onInvite() : onStart(def))}
        className={ghostGold}
      >
        {def.kind === "invite" ? "Invite" : "Start"}
      </motion.button>
    );
  }

  const ready = view.status === "ready";
  const done = view.status === "claimed";

  return (
    <li
      data-testid={`task-${def.id}`}
      data-status={view.status}
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-card ${
        ready
          ? "border-amber-400/50 bg-amber-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
            done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-slate-100 bg-amber-400/10 text-amber-700"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-snug">{def.title}</h3>
            <span
              data-testid={`task-reward-${def.id}`}
              className="shrink-0 rounded-full border border-slate-100 bg-amber-400/10 px-2.5 py-1 font-mono text-[11px] font-bold leading-none tabular-nums text-amber-700"
            >
              +{formatAmount(view.reward)} USDT
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-secondary">{def.description}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-fg-secondary">
          <span data-testid={`task-status-${def.id}`}>{statusLine(def, view, invites)}</span>
        </div>
        <div
          role="progressbar"
          aria-label={`${def.title} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(view.progress * 100)}
          className="h-2 overflow-hidden rounded-full bg-gray-100"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
              done
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.55)]"
            }`}
            style={{ width: `${view.progress * 100}%` }}
          />
        </div>
      </div>

      <div className="relative mt-4">
        {cta}
        <BurstEffect burstKey={burst} count={14} radius={60} />
      </div>
    </li>
  );
}
