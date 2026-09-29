"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SandboxReviewTools } from "@/components/kyc/SandboxReviewTools";
import { StepIndicator } from "@/components/kyc/StepIndicator";
import { DOCUMENT_TYPES, KYC } from "@/config/kyc";
import { countryName, flagEmoji, kycSteps, tierDef } from "@/lib/kyc";
import { useAppStore } from "@/lib/store";

const stamp = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export function KycPending({ onClose }: { onClose: () => void }) {
  const user = useAppStore((s) => s.user);
  const reduceMotion = useReducedMotion();
  const submission = user.kycSubmission;
  const level = submission?.tier ?? 1;
  const steps = kycSteps(level);

  const rows: Array<[string, React.ReactNode]> = [
    ["Level requested", `Level ${level} · ${tierDef(level).name}`],
    ...(submission ? ([["Document", DOCUMENT_TYPES[submission.documentType]?.label ?? "—"]] as Array<[string, React.ReactNode]>) : []),
    ...(submission?.country
      ? ([["Country", <span key="c">{flagEmoji(submission.country)} {countryName(submission.country)}</span>]] as Array<[string, React.ReactNode]>)
      : []),
    ...(user.kycSubmittedAt ? ([["Submitted", stamp.format(new Date(user.kycSubmittedAt))]] as Array<[string, React.ReactNode]>) : []),
  ];

  return (
    <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="pt-1">
        <StepIndicator tier={level} steps={steps} current={steps.length - 1} />
      </div>

      <div className="mt-6 flex flex-col items-center text-center" data-testid="kyc-pending">
        <div className="relative flex h-24 w-24 items-center justify-center" aria-hidden>
          {!reduceMotion &&
            [0, 0.6, 1.2].map((delay) => (
              <motion.span
                key={delay}
                className="absolute inset-0 rounded-full border-2 border-amber-400"
                initial={{ scale: 0.55, opacity: 0.6 }}
                animate={{ scale: 1.25, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeOut" }}
              />
            ))}
          {reduceMotion && <span className="absolute inset-2 rounded-full border-2 border-amber-300" />}
          <motion.span
            initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 shadow-lg"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M5.5 12.5l4.2 4.2 8.8-9.4"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
              />
            </svg>
          </motion.span>
        </div>

        <h3 className="mt-4 text-lg font-semibold tracking-tight">Verification submitted</h3>
        <p className="mt-1 max-w-xs text-xs text-slate-500">We&apos;re reviewing your documents. You&apos;ll get a notification the moment it&apos;s done.</p>

        <p
          data-testid="kyc-eta"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Automated AI Review: {KYC.reviewEta}
        </p>
      </div>

      <dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <SandboxReviewTools />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
      >
        Close
      </button>
    </div>
  );
}
