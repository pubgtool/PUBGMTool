"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { KycHub } from "@/components/kyc/KycHub";
import { KycPending } from "@/components/kyc/KycPending";
import { KycWizard } from "@/components/kyc/KycWizard";
import { useKycDraft } from "@/components/kyc/useKycDraft";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { nextTier, tierDef } from "@/lib/kyc";
import { useAppStore } from "@/lib/store";

type Mode = { kind: "hub" } | { kind: "wizard"; tier: 1 | 2; step: number };
type View = "hub" | "wizard" | "pending";

const HUB: Mode = { kind: "hub" };

/**
 * Global KYC center. Mounted once in the app shell and opened from the store, so
 * Profile and the withdrawal gate share it. Wizard progress survives closing the
 * sheet, and is dropped on submission or when the account changes.
 */
export function KYCModal() {
  const open = useAppStore((s) => s.isKycModalOpen);
  const isGuest = useAppStore((s) => s.user.isGuest);
  const userId = useAppStore((s) => s.user.id);
  const status = useAppStore((s) => s.user.kycStatus);
  const tier = useAppStore((s) => s.user.kycTier);
  const close = useAppStore((s) => s.closeKycModal);

  const api = useKycDraft();
  const { reset } = api;
  const [mode, setMode] = useState<Mode>(HUB);
  const [celebrate, setCelebrate] = useState(0);
  const reduceMotion = useReducedMotion();

  const account = useRef(userId);
  useEffect(() => {
    if (account.current === userId) return;
    account.current = userId;
    reset();
    setMode(HUB);
  }, [userId, reset]);

  // The overview mounts only after a review resolves, so the level change is caught here, where it is always mounted.
  const grantedTier = useRef(tier);
  useEffect(() => {
    if (tier > grantedTier.current && open) setCelebrate((n) => n + 1);
    grantedTier.current = tier;
  }, [tier, open]);

  useEffect(() => {
    if (open && isGuest) close();
  }, [open, isGuest, close]);

  const expected = nextTier(tier);
  const stale = mode.kind === "wizard" && (status === "PENDING" || mode.tier !== expected);
  useEffect(() => {
    if (!stale) return;
    if (status !== "PENDING") reset();
    setMode(HUB);
  }, [stale, status, reset]);

  const startWizard = useCallback(
    (target: 1 | 2) => {
      setMode((current) => (current.kind === "wizard" && current.tier === target ? current : { kind: "wizard", tier: target, step: 0 }));
    },
    [],
  );

  const setStep = useCallback((step: number) => setMode((m) => (m.kind === "wizard" ? { ...m, step } : m)), []);
  const onSubmitted = useCallback(() => {
    reset();
    setMode(HUB);
  }, [reset]);
  const toHub = useCallback(() => setMode(HUB), []);

  const view: View = status === "PENDING" ? "pending" : mode.kind;
  const level = mode.kind === "wizard" ? mode.tier : 1;
  const submissionTier = useAppStore((s) => s.user.kycSubmission?.tier);

  const heading =
    view === "pending"
      ? { title: "Identity Verification", text: `Level ${mode.kind === "wizard" ? mode.tier : (submissionTier ?? 1)} under review` }
      : view === "wizard"
        ? level === 1
          ? { title: "Verify your identity", text: `Level 1 · ${tierDef(1).name}` }
          : { title: "Enhanced verification", text: `Level 2 · ${tierDef(2).name}` }
        : { title: "Identity Verification", text: "Levels and daily limits" };

  return (
    <BottomSheet open={open && !isGuest} onClose={close} tone="dark">
      {open && (
        <div>
          <div className="flex items-start justify-between gap-3 px-5 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-lg font-semibold leading-tight tracking-tight">{heading.title}</SheetTitle>
                <SheetDescription className="truncate text-xs text-slate-500">{heading.text}</SheetDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-full bg-slate-100 p-2 text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              data-testid={`kyc-view-${view}`}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
            >
              {view === "hub" && <KycHub onStart={startWizard} celebrateKey={celebrate} />}
              {view === "wizard" && mode.kind === "wizard" && (
                <KycWizard
                  tier={mode.tier}
                  step={mode.step}
                  onStep={setStep}
                  api={api}
                  onExit={toHub}
                  onSubmitted={onSubmitted}
                />
              )}
              {view === "pending" && <KycPending onClose={close} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </BottomSheet>
  );
}
