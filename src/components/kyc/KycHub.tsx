"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Check, Lock, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { BurstEffect } from "@/components/ui/Burst";
import { KYC, KYC_TIERS, type KycTierDef } from "@/config/kyc";
import { nextTier, tierDef } from "@/lib/kyc";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.95 } as const;
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
  const topTier = KYC_TIERS[KYC_TIERS.length - 1]?.tier ?? 2;
  const progress = Math.min(100, (tier / topTier) * 100);

  const cta =
    next === null ? null : rejected ? (tier === 0 ? "Resubmit Verification" : "Resubmit Tier 2") : tier === 0 ? "Start Verification" : "Upgrade to Tier 2";

  return (
    <div className="flex flex-col gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <section
        aria-label="Current verification level"
        data-testid="kyc-hero"
        data-tier={tier}
        className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
      >
        <span aria-hidden className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              data-testid="kyc-level"
              className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-black tracking-wide text-amber-700 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
            >
              KYC Level {tier}
            </p>
            <p className="mt-3 text-2xl font-extrabold tracking-tight">{current.name}</p>
            <p className="mt-0.5 text-xs text-fg-secondary">{tier === 0 ? "Verify your identity to unlock withdrawals" : "Identity verified for this level"}</p>
          </div>
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${
              tier > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-btn-green" : "border-slate-100 bg-amber-400/10 text-amber-700"
            }`}
          >
            {tier > 0 ? <ShieldCheck className="h-6 w-6" aria-hidden /> : <ShieldAlert className="h-6 w-6" aria-hidden />}
          </span>
        </div>

        <div className="relative mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-fg-secondary">
            <span>Verification progress</span>
            <span className="font-bold tabular-nums text-amber-700">
              {tier} / {topTier}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Verification progress"
            aria-valuemin={0}
            aria-valuemax={topTier}
            aria-valuenow={tier}
            className="h-2 overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.55)] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p
          data-testid="kyc-limit"
          className={`relative mt-4 inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${
            tier > 0 ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700" : "border-rose-500/25 bg-rose-500/10 text-rose-600"
          }`}
        >
          {current.limitLabel}
        </p>
        <BurstEffect burstKey={celebrateKey} count={22} radius={110} />
      </section>

      {rejected && (
        <div role="alert" data-testid="kyc-rejected" className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3.5">
          <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-bold text-rose-600">Verification rejected</p>
            <p data-testid="kyc-rejection-reason" className="mt-0.5 text-xs text-rose-600">
              {user.kycRejectionReason ?? "Verification could not be completed"}
            </p>
            <p className="mt-1 text-xs text-fg-secondary">
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
              className={`rounded-2xl border p-3.5 ${
                state === "current"
                  ? "border-amber-400/60 bg-gradient-to-b from-amber-400/[0.09] to-transparent"
                  : state === "done"
                    ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    state === "done"
                      ? "bg-emerald-500 text-slate-950"
                      : state === "current"
                        ? "btn-primary shadow-btn"
                        : state === "next"
                          ? "border border-gray-300 bg-canvas text-fg"
                          : "bg-gray-100 text-fg-muted"
                  }`}
                >
                  {state === "done" ? <Check className="h-4 w-4" aria-label="completed" /> : state === "locked" ? <Lock className="h-4 w-4" aria-label="locked" /> : def.tier}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    Level {def.tier} · {def.name}
                  </p>
                  <p className="text-xs text-fg-secondary">{def.tier === 0 ? def.summary : requirement(def)}</p>
                </div>
                {state === "current" && (
                  <span className="shrink-0 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[11px] font-bold uppercase leading-none tracking-wide text-amber-700">
                    Current
                  </span>
                )}
                {state === "done" && (
                  <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-bold uppercase leading-none tracking-wide text-emerald-700">
                    Done
                  </span>
                )}
              </div>
              <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-fg">
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
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
          className="btn-primary w-full rounded-2xl py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          {cta}
        </motion.button>
      )}
      {next === null && (
        <p data-testid="kyc-complete" className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3.5 text-center text-sm font-semibold text-emerald-700">
          You&apos;re fully verified. No withdrawal limits apply.
        </p>
      )}
    </div>
  );
}
