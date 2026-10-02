"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, RotateCcw, ScanFace, ShieldCheck } from "lucide-react";
import { StepHeading } from "@/components/kyc/StepHeading";
import type { KycDraftApi } from "@/components/kyc/useKycDraft";
import { KYC } from "@/config/kyc";

type Phase =
  | { kind: "idle" }
  | { kind: "prompt"; index: number }
  | { kind: "analyzing"; progress: number }
  | { kind: "done" };

const TICK_MS = 50;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

const analyzeLabel = (progress: number) =>
  progress < 55 ? "Analyzing biometric data..." : progress < 90 ? "Matching face to document..." : "Finalizing...";

/** Scripted scan: each prompt, then an analysis pass. Nothing is captured or sent anywhere. */
function useLivenessScan(initiallyDone: boolean, onDone: () => void) {
  const [phase, setPhase] = useState<Phase>(initiallyDone ? { kind: "done" } : { kind: "idle" });
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const prompts = KYC.liveness.prompts;

  useEffect(() => {
    if (phase.kind === "prompt") {
      const id = setTimeout(() => {
        setPhase(phase.index + 1 < prompts.length ? { kind: "prompt", index: phase.index + 1 } : { kind: "analyzing", progress: 0 });
      }, KYC.liveness.promptMs);
      return () => clearTimeout(id);
    }
    if (phase.kind === "analyzing") {
      const id = setInterval(() => {
        setPhase((current) => {
          if (current.kind !== "analyzing") return current;
          const next = current.progress + (100 * TICK_MS) / KYC.liveness.analyzeMs;
          return next >= 100 ? { kind: "done" } : { kind: "analyzing", progress: next };
        });
      }, TICK_MS);
      return () => clearInterval(id);
    }
  }, [phase, prompts.length]);

  useEffect(() => {
    if (phase.kind === "done" && !initiallyDone) onDoneRef.current();
    // Fires once per completed scan, not on remounts that start already done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  const start = useCallback(() => setPhase({ kind: "prompt", index: 0 }), []);
  const retake = useCallback(() => setPhase({ kind: "idle" }), []);
  return { phase, start, retake, prompts };
}

interface Props {
  api: KycDraftApi;
  moveFocus: boolean;
}

export function LivenessStep({ api, moveFocus }: Props) {
  const reduceMotion = useReducedMotion();
  const { draft, patch } = api;
  const { phase, start, retake, prompts } = useLivenessScan(draft.livenessDone, () => patch({ livenessDone: true }));

  const running = phase.kind === "prompt" || phase.kind === "analyzing";
  const done = phase.kind === "done";
  const aligned = phase.kind === "prompt" && phase.index === prompts.length - 1;
  const ring = done || aligned ? "#34d399" : running ? "#fbbf24" : "#ffffff";
  const progress = phase.kind === "analyzing" ? Math.round(phase.progress) : done ? 100 : 0;

  const caption =
    phase.kind === "prompt"
      ? prompts[phase.index]
      : phase.kind === "analyzing"
        ? analyzeLabel(phase.progress)
        : done
          ? "Liveness confirmed"
          : "Position your face inside the oval";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <StepHeading moveFocus={moveFocus}>Facial liveness check</StepHeading>
        <p className="mt-1 text-xs text-fg-secondary">A short scan confirms a real person is present and matches your document.</p>
      </div>

      <div
        data-testid="liveness-viewport"
        data-phase={phase.kind}
        className="relative mx-auto aspect-[3/4] w-56 overflow-hidden rounded-2xl border border-slate-100 bg-slate-950 shadow-card min-[380px]:w-64"
      >
        <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <clipPath id="face-oval">
              <ellipse cx="150" cy="190" rx="105" ry="140" />
            </clipPath>
            <pattern id="mesh" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M22 0H0V22" fill="none" stroke="#fbbf24" strokeOpacity="0.45" strokeWidth="0.8" />
            </pattern>
            <linearGradient id="sweep" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fbbf24" stopOpacity="0" />
              <stop offset="1" stopColor="#fbbf24" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          <g clipPath="url(#face-oval)">
            <rect x="0" y="0" width="300" height="400" fill="#0f172a" />
            <circle cx="150" cy="165" r="48" fill="#1e293b" />
            <path d="M60 340c6-70 44-100 90-100s84 30 90 100z" fill="#1e293b" />
            {running && <rect x="0" y="0" width="300" height="400" fill="url(#mesh)" opacity="0.5" />}
            {running && !reduceMotion && (
              <motion.rect
                x="0"
                width="300"
                height="70"
                fill="url(#sweep)"
                initial={{ y: 40 }}
                animate={{ y: [40, 260, 40] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </g>

          <path d="M0 0H300V400H0Z M45 190a105 140 0 1 0 210 0a105 140 0 1 0 -210 0Z" fill="#020617" fillOpacity="0.72" fillRule="evenodd" />
          <ellipse
            cx="150"
            cy="190"
            rx="105"
            ry="140"
            fill="none"
            stroke={ring}
            strokeWidth="3"
            strokeDasharray={running || done ? undefined : "10 8"}
            style={{ transition: "stroke 0.3s" }}
          />
        </svg>

        {/* Centred by a flex wrapper: Framer's inline transform would override a translate utility. */}
        {running && !reduceMotion && (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center pb-[5%]">
            <motion.span
              className="h-[73.7%] w-[70%] rounded-[50%] border-2 border-amber-400/60"
              animate={{ scale: [1, 1.05, 1], opacity: [0.7, 0.2, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          </span>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {done && (
            <span key="ok" aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center pb-[5%]">
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={SPRING}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-btn-green"
              >
                <CheckCircle2 className="h-9 w-9" />
              </motion.span>
            </span>
          )}
        </AnimatePresence>

        <p
          data-testid="liveness-caption"
          role="status"
          aria-live="polite"
          className="absolute inset-x-3 bottom-3 rounded-full bg-slate-950/80 px-3 py-2 text-center text-xs font-semibold text-white"
        >
          {caption}
        </p>
      </div>

      <div>
        <div
          role="progressbar"
          aria-label="Biometric analysis"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-gray-100"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              done ? "bg-emerald-500" : "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.55)]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p data-testid="liveness-progress" className="mt-1.5 text-right font-mono text-[11px] tabular-nums text-fg-secondary">
          {progress}%
        </p>
      </div>

      {done ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={() => {
            patch({ livenessDone: false });
            retake();
          }}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-surface py-2.5 text-xs font-semibold text-fg outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retake scan
        </motion.button>
      ) : (
        <motion.button
          type="button"
          whileTap={running ? undefined : { scale: 0.95 }}
          transition={SPRING}
          disabled={running}
          onClick={start}
          className="btn-primary flex items-center justify-center gap-2 rounded-2xl py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          <ScanFace className="h-4 w-4" aria-hidden />
          {running ? "Scanning…" : "Start Face Scan"}
        </motion.button>
      )}

      <p className="flex items-start gap-1.5 text-[11px] text-fg-secondary">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />
        Demo scan: your camera is not used and no biometric data is captured.
      </p>
    </div>
  );
}
