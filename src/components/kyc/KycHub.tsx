"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Check, Lock, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { BurstEffect } from "@/components/ui/Burst";
import { KYC, KYC_TIERS, type KycTierDef } from "@/config/kyc";
import { nextTier, tierDef } from "@/lib/kyc";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.98 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

function requirement(def: KycTierDef): string {
  if (def.tier === 1) return `Government ID, front and back${KYC.enableLivenessStep ? " + facial liveness check" : ""}`;
  return def.summary;
}

interface Props {
  onStart: (tier: 1 | 2) => void;
  /** Increments each time a level is granted while the center is open. */
  celebrateKey: number;
}

export function KycHub({ onStart, celebrateKey }: Props) {
  const user = useAppStore((s) => s.user);
  const tier = user.kycTier;
  const next = nextTier(tier);
  const current = tierDef(tier);
  const rejected = user.kycStatus === "REJECTED";

  const cta =
    next === null ? null : rejected ? (tier === 0 ? "Resubmit Verification" : "Resubmit Tier 2") : tier === 0 ? "Start Verification" : "Upgrade to Tier 2";

  return (
    <div className="flex flex-col gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <section
        aria-label="Current verification level"
        data-testid="kyc-hero"
        data-tier={tier}
        className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Verification level</p>
            <p data-testid="kyc-level" className="mt-1 text-2xl font-semibold tracking-tight">
              Level {tier}
            </p>
            <p className="text-sm text-slate-300">{current.name}</p>
          </div>
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tier > 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-300"}`}
          >
            {tier > 0 ? <ShieldCheck className="h-6 w-6" aria-hidden /> : <ShieldAlert className="h-6 w-6" aria-hidden />}
          </span>
        </div>
        <p data-testid="kyc-limit" className="relative mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
          {current.limitLabel}
        </p>
        <BurstEffect burstKey={celebrateKey} count={22} radius={110} />
      </section>

      {rejected && (
        <div role="alert" data-testid="kyc-rejected" className="flex items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3.5">
          <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-900">Verification rejected</p>
            <p data-testid="kyc-rejection-reason" className="mt-0.5 text-xs text-rose-800">
              {user.kycRejectionReason ?? "Verification could not be completed"}
            </p>
            <p className="mt-1 text-xs text-rose-800/80">
              {tier === 0 ? "Correct the issue and submit again to unlock withdrawals." : "Your current level is unaffected. Submit again to upgrade."}
            </p>
          </div>
        </div>
      )}

      <ol aria-label="Verification levels" className="flex flex-col gap-2.5">
        {KYC_TIERS.map((def) => {
          const state = def.tier < tier ? "done" : def.tier === tier ? "current" : def.tier === tier + 1 ? "next" : "locked";
          return (
            <li
              key={def.tier}
              data-testid={`kyc-tier-${def.tier}`}
              data-state={state}
              className={`rounded-2xl border p-3.5 ${state === "current" ? "border-slate-950 bg-slate-50" : "border-slate-100 bg-white"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    state === "done" ? "bg-emerald-500 text-white" : state === "current" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {state === "done" ? <Check className="h-4 w-4" aria-label="completed" /> : state === "locked" ? <Lock className="h-4 w-4" aria-label="locked" /> : def.tier}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    Level {def.tier} · {def.name}
                  </p>
                  <p className="text-xs text-slate-500">{def.tier === 0 ? def.summary : requirement(def)}</p>
                </div>
                {state === "current" && (
                  <span className="shrink-0 rounded-md bg-slate-950 px-1.5 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-white">Current</span>
                )}
                {state === "done" && (
                  <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-emerald-700">Done</span>
                )}
              </div>
              <p className="mt-2.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-100">
                <BadgeCheck className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" aria-hidden />
                {def.limitLabel}
              </p>
            </li>
          );
        })}
      </ol>

      {cta && next && (
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={() => onStart(next)}
          data-testid="kyc-start"
          className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          {cta}
        </motion.button>
      )}
      {next === null && (
        <p data-testid="kyc-complete" className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          You&apos;re fully verified. No withdrawal limits apply.
        </p>
      )}
    </div>
  );
}
