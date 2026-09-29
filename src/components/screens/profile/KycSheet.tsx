"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, IdCard, Loader2, ShieldAlert, ShieldX, X } from "lucide-react";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";

const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

const REQUIREMENTS = [
  { Icon: IdCard, title: "Government-issued ID", text: "Passport, national ID card or driver's licence." },
  { Icon: Camera, title: "Selfie check", text: "A clear photo of your face to match the ID." },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KycSheet({ open, onClose }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {open && <Body onClose={onClose} />}
    </BottomSheet>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const status = useAppStore((s) => s.user.kycStatus);
  const updateKyc = useAppStore((s) => s.updateKyc);
  const reviewKyc = useAppStore((s) => s.reviewKyc);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!consent || busy) return;
    setBusy(true);
    const result = updateKyc();
    setBusy(false);
    if (result.ok) toast.success("Verification submitted for review");
    else toast.error(result.error);
  };

  const review = (decision: "VERIFIED" | "REJECTED") => {
    const result = reviewKyc(decision);
    if (result.ok) toast.success(decision === "VERIFIED" ? "Identity verified" : "Verification rejected");
    else toast.error(result.error);
  };

  const canSubmit = status === "NONE" || status === "REJECTED";

  return (
    <div className="flex flex-col gap-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SheetTitle className="text-lg font-semibold tracking-tight">Identity Verification</SheetTitle>
          <SheetDescription className="mt-1 text-xs text-slate-500">
            Level 1 · government ID and selfie check
          </SheetDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full bg-slate-100 p-2 text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {status === "VERIFIED" && (
        <div className="flex flex-col items-center rounded-2xl bg-emerald-50 px-4 py-6 text-center">
          <BadgeCheck className="h-9 w-9 text-emerald-600" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-emerald-900">Verified Level 1</p>
          <p className="mt-1 text-xs text-emerald-800/80">Your identity has been confirmed. No further action is needed.</p>
        </div>
      )}

      {status === "PENDING" && (
        <>
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-4">
            <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Pending Verification</p>
              <p className="mt-0.5 text-xs text-amber-800/80">Your documents are under review. We&apos;ll notify you when it&apos;s done.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 p-4">
            <p className="text-xs font-semibold text-slate-700">Sandbox review</p>
            <p className="mt-0.5 text-xs text-slate-500">Resolve the review yourself to test both outcomes.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                onClick={() => review("VERIFIED")}
                className="rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white outline-none hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                Approve
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                onClick={() => review("REJECTED")}
                className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                Reject
              </motion.button>
            </div>
          </div>
        </>
      )}

      {canSubmit && (
        <>
          {status === "REJECTED" && (
            <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 px-3.5 py-3 text-xs text-rose-700">
              <ShieldX className="mt-px h-4 w-4 shrink-0" aria-hidden />
              Your last submission couldn&apos;t be verified. Please submit your documents again.
            </p>
          )}
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
            {REQUIREMENTS.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-slate-500">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-3.5 py-3 text-xs text-slate-600 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-900">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-slate-950"
            />
            <span>I confirm the documents I provide are mine and the information is accurate.</span>
          </label>
          <motion.button
            type="button"
            whileTap={consent ? { scale: 0.98 } : undefined}
            transition={SPRING}
            onClick={submit}
            disabled={!consent || busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldAlert className="h-4 w-4" aria-hidden />}
            Submit for Verification
          </motion.button>
        </>
      )}

      {(status === "VERIFIED" || status === "PENDING") && (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Close
        </button>
      )}
    </div>
  );
}
