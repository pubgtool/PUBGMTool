"use client";

import { motion } from "framer-motion";
import { Clock, ShieldAlert, ShieldX } from "lucide-react";
import { KYC, KYC_TIERS } from "@/config/kyc";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

/** Shown in place of the withdrawal form until the account holds at least Level 1. */
export function KycGate() {
  const status = useAppStore((s) => s.user.kycStatus);
  const reason = useAppStore((s) => s.user.kycRejectionReason);
  const openKycModal = useAppStore((s) => s.openKycModal);

  const pending = status === "PENDING";
  const rejected = status === "REJECTED";

  const content = pending
    ? {
        Icon: Clock,
        tone: "bg-amber-50 text-amber-600",
        title: "Verification in progress",
        text: `Your documents are under review (${KYC.reviewEta}). Withdrawals unlock as soon as you're approved.`,
        cta: "View Status",
      }
    : rejected
      ? {
          Icon: ShieldX,
          tone: "bg-rose-50 text-rose-600",
          title: "Verification rejected",
          text: `${reason ?? "Verification could not be completed"}. Submit your documents again to unlock withdrawals.`,
          cta: "Resubmit Verification",
        }
      : {
          Icon: ShieldAlert,
          tone: "bg-slate-100 text-slate-600",
          title: "Identity Verification Required",
          text: "Verification is required before processing institutional withdrawals.",
          cta: "Verify Identity",
        };

  return (
    <section aria-label="Withdrawal security check" data-testid="kyc-gate" data-status={status} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${content.tone}`}>
          <content.Icon className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-3 text-base font-semibold">{content.title}</h2>
        <p className="mt-1 max-w-xs text-xs text-slate-500">{content.text}</p>
      </div>

      <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 text-xs">
        {KYC_TIERS.filter((t) => t.tier > 0).map((t) => (
          <li key={t.tier} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="font-medium text-slate-700">
              Level {t.tier} · {t.name}
            </span>
            <span className="shrink-0 font-mono text-slate-500">{t.limitLabel}</span>
          </li>
        ))}
      </ul>

      <motion.button
        type="button"
        whileTap={TAP}
        transition={SPRING}
        onClick={openKycModal}
        data-testid="kyc-gate-cta"
        className="mt-4 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
      >
        {content.cta}
      </motion.button>
    </section>
  );
}
