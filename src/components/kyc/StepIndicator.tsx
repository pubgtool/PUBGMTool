"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { stepLabel, type KycStepId } from "@/lib/kyc";

interface Props {
  tier: 1 | 2;
  steps: readonly KycStepId[];
  /** Index of the current step within `steps`. */
  current: number;
}

/** Numbered progress that only ever shows the steps that will actually happen. */
export function StepIndicator({ tier, steps, current }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <div>
      <p data-testid="kyc-step-counter" className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        Step {Math.min(current + 1, steps.length)} of {steps.length}
      </p>
      <ol aria-label="Verification progress" className="mt-2 flex items-start">
        {steps.map((id, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li
              key={id}
              data-testid={`kyc-step-${id}`}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex items-start ${i < steps.length - 1 ? "flex-1" : ""}`}
            >
              <div className="flex w-14 flex-col items-center gap-1.5">
                <motion.span
                  animate={state === "current" && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-300 ${
                    state === "done"
                      ? "bg-emerald-500 text-white"
                      : state === "current"
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {state === "done" ? <Check className="h-3.5 w-3.5" aria-label="completed" /> : i + 1}
                </motion.span>
                <span className={`text-[10px] font-medium ${state === "todo" ? "text-slate-400" : "text-slate-700"}`}>
                  {stepLabel(tier, id)}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className="relative mt-3.5 h-0.5 min-w-3 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                    initial={false}
                    animate={{ width: i < current ? "100%" : "0%" }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
