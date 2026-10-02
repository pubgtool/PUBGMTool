"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { StepIndicator } from "@/components/kyc/StepIndicator";
import { DetailsStep, detailsErrors } from "@/components/kyc/steps/DetailsStep";
import { DocumentStep, documentComplete } from "@/components/kyc/steps/DocumentStep";
import { LivenessStep } from "@/components/kyc/steps/LivenessStep";
import type { KycDraftApi } from "@/components/kyc/useKycDraft";
import { toast } from "@/components/ui/Toast";
import { kycSteps } from "@/lib/kyc";
import { useAppStore } from "@/lib/store";
import { wait } from "@/lib/async";

const TAP = { scale: 0.95 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const SUBMIT_MS = 700;

interface Props {
  tier: 1 | 2;
  step: number;
  onStep: (step: number) => void;
  api: KycDraftApi;
  /** Leave the wizard for the overview. */
  onExit: () => void;
  onSubmitted: () => void;
}

export function KycWizard({ tier, step, onStep, api, onExit, onSubmitted }: Props) {
  const submitKyc = useAppStore((s) => s.submitKyc);
  const reduceMotion = useReducedMotion();
  const { draft, patch } = api;

  const steps = useMemo(() => kycSteps(tier), [tier]);
  const id = steps[Math.min(step, steps.length - 2)]!;
  const lastInput = step >= steps.length - 2;

  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const direction = useRef(1);

  // Move focus to a step's heading only after the user has navigated, never when the sheet first opens.
  const [navigated, setNavigated] = useState(false);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    setNavigated(true);
  }, [step]);

  useEffect(() => setShowErrors(false), [step]);

  const stepValid = (): boolean => {
    if (id === "details") return Object.values(detailsErrors(draft, now)).every((e) => e === null);
    if (id === "document") return documentComplete(draft);
    if (id === "liveness") return draft.livenessDone;
    return true;
  };

  const go = (next: number) => {
    direction.current = next >= step ? 1 : -1;
    setError(null);
    onStep(next);
  };

  const submit = async () => {
    if (!draft.consent || !draft.documentType) return;
    setBusy(true);
    setError(null);
    await wait(SUBMIT_MS);
    const result = submitKyc({
      tier,
      documentType: draft.documentType,
      country: tier === 1 ? draft.country : undefined,
      livenessCompleted: draft.livenessDone,
    });
    setBusy(false);
    if (result.ok) {
      toast.success("Verification submitted for review");
      onSubmitted();
    } else {
      setError(result.error);
    }
  };

  const onPrimary = () => {
    if (busy) return;
    if (!stepValid()) {
      setShowErrors(true);
      return;
    }
    if (!lastInput) return go(step + 1);
    if (!draft.consent) {
      setShowErrors(true);
      return;
    }
    void submit();
  };

  const primaryLabel = !lastInput ? "Continue" : "Submit for Verification";
  const primaryDisabled = id === "liveness" && !draft.livenessDone;

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-surface/95 px-5 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            onClick={() => (step === 0 ? onExit() : go(step - 1))}
            aria-label={step === 0 ? "Back to overview" : "Previous step"}
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-canvas/60 text-fg-secondary outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </motion.button>
          <div className="min-w-0 flex-1">
            <StepIndicator tier={tier} steps={steps} current={step} />
          </div>
        </div>
      </div>

      <div className="px-5 pb-4 pt-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={id}
            initial={reduceMotion ? false : { opacity: 0, x: 22 * direction.current }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -22 * direction.current }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
          >
            {id === "details" && <DetailsStep api={api} now={now} showErrors={showErrors} moveFocus={navigated} />}
            {id === "document" && <DocumentStep tier={tier} api={api} showErrors={showErrors} moveFocus={navigated} />}
            {id === "liveness" && <LivenessStep api={api} moveFocus={navigated} />}
          </motion.div>
        </AnimatePresence>

        {lastInput && (
          <div className="mt-5">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 px-3.5 py-3 text-xs text-fg-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-400">
              <input
                type="checkbox"
                checked={draft.consent}
                onChange={(event) => patch({ consent: event.target.checked })}
                data-testid="kyc-consent"
                className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
              />
              <span>I confirm the documents are genuine, belong to me and the details I entered are accurate.</span>
            </label>
            {showErrors && !draft.consent && (
              <p role="alert" className="mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-600">
                Confirm this to submit.
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" data-testid="kyc-error" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-600">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <p className="mt-5 flex items-start gap-1.5 text-[11px] text-fg-secondary">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          Demo mode: files stay in your browser and are never uploaded.{" "}
          {tier === 1 ? "Only your document type and country are saved." : "Only the document type is saved."}
        </p>
      </div>

      <div className="sticky bottom-0 border-t border-gray-200 bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <motion.button
          type="button"
          whileTap={busy || primaryDisabled ? undefined : TAP}
          transition={SPRING}
          onClick={onPrimary}
          disabled={busy || primaryDisabled}
          aria-busy={busy}
          data-testid="kyc-primary"
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Submitting…
            </>
          ) : (
            primaryLabel
          )}
        </motion.button>
        {id === "liveness" && !draft.livenessDone && (
          <p className="mt-2 text-center text-[11px] text-fg-secondary">Complete the face scan to continue.</p>
        )}
      </div>
    </div>
  );
}
