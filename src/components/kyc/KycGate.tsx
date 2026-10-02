"use client";

import { motion } from "framer-motion";
import { Clock, ShieldAlert, ShieldX } from "lucide-react";
import { KYC, KYC_TIERS } from "@/config/kyc";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.95 } as const;
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
        tone: "border-slate-100 bg-amber-400/10 text-amber-700",
        title: "Verification in progress",
        text: `Your documents are under review (${KYC.reviewEta}). Withdrawals unlock as soon as you're approved.`,
        cta: "View Status",
      }
    : rejected
      ? {
          Icon: ShieldX,
          tone: "border-rose-500/30 bg-rose-500/10 text-rose-600",
          title: "Verification rejected",
          text: `${reason ?? "Verification could not be completed"}. Submit your documents again to unlock withdrawals.`,
          cta: "Resubmit Verification",
        }
      : {
          Icon: ShieldAlert,
          tone: "border-slate-100 bg-amber-400/10 text-amber-700",
          title: "Identity Verification Required",
          text: "Verification is required before processing institutional withdrawals.",
          cta: "Verify Identity",
        };

  return (
    <section
      aria-label="Withdrawal security check"
      data-testid="kyc-gate"
      data-status={status}
      className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
    >
      <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative flex flex-col items-center text-center">
        <span className={`flex h-14 w-14 items-center justify-center rounded-full border ${content.tone}`}>
          <content.Icon className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-3 text-base font-extrabold">{content.title}</h2>
        <p className="mt-1 max-w-xs text-xs text-fg-secondary">{content.text}</p>
      </div>

      <ul className="relative mt-4 flex flex-col gap-2">
        {KYC_TIERS.filter((t) => t.tier > 0).map((t) => (
          <li
            key={t.tier}
            className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-xs"
          >
            <span className="min-w-0 font-semibold text-fg">
              Level {t.tier} · {t.name}
            </span>
            <span className="shrink-0 rounded-full bg-gray-50 px-2.5 py-1 font-mono font-bold text-amber-700">{t.limitLabel}</span>
          </li>
        ))}
      </ul>

      <motion.button
        type="button"
        whileTap={TAP}
        transition={SPRING}
        onClick={openKycModal}
        data-testid="kyc-gate-cta"
        className="btn-primary relative mt-4 w-full rounded-2xl py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      >
        {content.cta}
      </motion.button>
    </section>
  );
}
