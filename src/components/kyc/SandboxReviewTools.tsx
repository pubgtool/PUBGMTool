"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronDown, FlaskConical, XCircle } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { KYC, rejectionReasonsFor } from "@/config/kyc";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 32 } as const;

/** Collapsible QA panel that resolves a pending review, standing in for the reviewer. */
export function SandboxReviewTools() {
  const level = useAppStore((s) => s.user.kycSubmission?.tier ?? 1);
  const reviewKyc = useAppStore((s) => s.reviewKyc);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const reasons = rejectionReasonsFor(level, KYC.enableLivenessStep);

  const approve = () => {
    const result = reviewKyc("VERIFIED");
    if (result.ok) toast.success(`Level ${level} verified`);
    else toast.error(result.error);
  };

  const reject = () => {
    if (!reason) return;
    const result = reviewKyc("REJECTED", reason);
    if (result.ok) toast.info(`Verification rejected: ${reason}`);
    else toast.error(result.error);
  };

  return (
    <section aria-label="Sandbox review tools" className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="sandbox-tools-toggle"
        className="flex w-full items-center gap-2 rounded-2xl px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <FlaskConical className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <span className="flex-1 text-xs font-semibold text-amber-900">Sandbox Review Tools</span>
        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-amber-800">QA only</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-amber-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : SPRING}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 px-3.5 pb-3.5">
              <p className="text-xs text-amber-900/80">Resolve the review yourself to test both outcomes. Nothing here exists in production.</p>

              <motion.button
                type="button"
                whileTap={TAP}
                transition={SPRING}
                onClick={approve}
                data-testid="sandbox-approve"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white outline-none hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Approve (Grant Tier {level})
              </motion.button>

              <div role="radiogroup" aria-label="Rejection reason" className="flex flex-wrap gap-2">
                {reasons.map((r) => {
                  const selected = reason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setReason(r)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 ${
                        selected ? "border-rose-500 bg-rose-500 text-white" : "border-amber-300 bg-white text-slate-700 hover:bg-amber-50"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>

              <motion.button
                type="button"
                whileTap={reason ? TAP : undefined}
                transition={SPRING}
                onClick={reject}
                disabled={!reason}
                data-testid="sandbox-reject"
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white py-3 text-sm font-semibold text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
              >
                <XCircle className="h-4 w-4" aria-hidden />
                Reject with Reason
              </motion.button>
              {!reason && <p className="-mt-1 text-center text-[11px] text-amber-900/70">Pick a reason to enable rejection.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
