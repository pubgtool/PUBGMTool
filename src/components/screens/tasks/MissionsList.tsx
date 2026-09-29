"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Cpu, Loader2, Send, UserPlus, type LucideIcon } from "lucide-react";
import { BurstEffect } from "@/components/ui/Burst";
import { TASKS, type TaskCategory, type TaskDef } from "@/config/rewards";
import { formatAmount } from "@/lib/format";
import type { TaskView } from "@/lib/rewards";

const TAP = { scale: 0.96 } as const;
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
    <section aria-label="Missions" className="flex flex-col gap-4">
      {CATEGORIES.map((category) => {
        const tasks = TASKS.filter((t) => t.category === category);
        if (tasks.length === 0) return null;
        return (
          <div key={category}>
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{category}</h2>
            <ul className="mt-2 flex flex-col gap-3">
              {tasks.map((def) => {
                const view = views[def.id];
                if (!view) return null;
                return (
                  <TaskCard key={def.id} def={def} view={view} guest={guest} invites={invites} {...actions} />
                );
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
    "relative w-full rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto";

  let cta: React.ReactNode;
  if (guest) {
    cta = (
      <motion.button
        type="button"
        whileTap={TAP}
        transition={SPRING}
        onClick={onAuth}
        className={`${base} bg-slate-950 text-white hover:bg-slate-900 focus-visible:ring-slate-950`}
      >
        Sign in
      </motion.button>
    );
  } else if (view.status === "claimed") {
    cta = (
      <button type="button" disabled className={`${base} flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700`}>
        <Check className="h-3.5 w-3.5" aria-hidden /> Completed
      </button>
    );
  } else if (view.status === "processing") {
    cta = (
      <button type="button" disabled className={`${base} flex items-center justify-center gap-1.5 bg-slate-100 text-slate-500`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
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
        className={`${base} bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 focus-visible:ring-amber-600`}
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
        className={`${base} border border-slate-200 bg-white text-slate-800 focus-visible:ring-slate-900`}
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
        className={`${base} bg-slate-950 text-white hover:bg-slate-900 focus-visible:ring-slate-950`}
      >
        {def.kind === "invite" ? "Invite" : "Start"}
      </motion.button>
    );
  }

  return (
    <li
      data-testid={`task-${def.id}`}
      data-status={view.status}
      className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug">{def.title}</h3>
            <span
              data-testid={`task-reward-${def.id}`}
              className="shrink-0 rounded-full bg-amber-50 px-2 py-1 font-mono text-[11px] font-semibold leading-none tabular-nums text-amber-700"
            >
              +{formatAmount(view.reward)} USDT
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{def.description}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span data-testid={`task-status-${def.id}`}>{statusLine(def, view, invites)}</span>
        </div>
        <div
          role="progressbar"
          aria-label={`${def.title} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(view.progress * 100)}
          className="h-1.5 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
              view.status === "claimed" ? "bg-emerald-500" : view.status === "ready" ? "bg-amber-500" : "bg-slate-900"
            }`}
            style={{ width: `${view.progress * 100}%` }}
          />
        </div>
      </div>

      <div className="relative mt-3 flex sm:justify-end">
        {cta}
        <BurstEffect burstKey={burst} count={14} radius={60} />
      </div>
    </li>
  );
}
