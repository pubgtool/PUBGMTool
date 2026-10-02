"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { DemoTools } from "@/components/ui/DemoTools";
import { toast } from "@/components/ui/Toast";
import { KYC, rejectionReasonsFor } from "@/config/kyc";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 32 } as const;

/** Demo-only drawer that resolves a pending review, standing in for the reviewer. */
export function SandboxReviewTools() {
  const level = useAppStore((s) => s.user.kycSubmission?.tier ?? 1);
  const reviewKyc = useAppStore((s) => s.reviewKyc);

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
    <section aria-label="Demo review tools">
      <DemoTools label="Demo tools" testId="sandbox-tools-toggle">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-fg-secondary">Resolve the review yourself to try both outcomes. For demo use only.</p>

          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={approve}
            data-testid="sandbox-approve"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 outline-none transition-colors hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
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
                  className={`min-h-11 rounded-full border px-3.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    selected
                      ? "border-rose-400 bg-rose-500/20 text-rose-800"
                      : "border-gray-200 bg-canvas text-fg hover:bg-gray-50"
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
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/50 bg-canvas py-3 text-sm font-bold text-rose-600 outline-none transition-colors hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-rose-400 disabled:border-gray-200 disabled:text-fg-muted disabled:hover:bg-canvas"
          >
            <XCircle className="h-4 w-4" aria-hidden />
            Reject with Reason
          </motion.button>
          {!reason && <p className="-mt-1 text-center text-[11px] text-fg-secondary">Pick a reason to enable rejection.</p>}
        </div>
      </DemoTools>
    </section>
  );
}
