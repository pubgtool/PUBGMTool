"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { Gift } from "lucide-react";
import { ConfettiRain } from "@/components/ui/Burst";
import { formatAmount } from "@/lib/format";

export interface EnvelopeResult {
  code: string;
  amount: number;
}

interface Props {
  result: EnvelopeResult | null;
  onClose: () => void;
}

const SPRING = { type: "spring", stiffness: 380, damping: 26 } as const;

export function EnvelopeSuccessDialog({ result, onClose }: Props) {
  return (
    <Dialog.Root
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AnimatePresence>
        {result && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[45] bg-black/75 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <ConfettiRain />
            <div className="pointer-events-none fixed inset-0 z-[46] flex items-center justify-center px-6">
              <Dialog.Content asChild forceMount>
                <motion.div
                  className="pointer-events-auto relative w-full max-w-xs overflow-hidden rounded-[28px] border border-slate-100 bg-white text-center shadow-card outline-none"
                  initial={{ opacity: 0, scale: 0.86, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  transition={SPRING}
                >
                  <Body result={result} onClose={onClose} />
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Body({ result, onClose }: { result: EnvelopeResult; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? result.amount : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(result.amount);
      return;
    }
    const controls = animate(0, result.amount, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: setShown,
      onComplete: () => setShown(result.amount),
    });
    return () => controls.stop();
  }, [result.amount, reduceMotion]);

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-amber-700 px-6 pb-7 pt-8">
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-300/20 blur-xl" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <motion.span
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING, delay: 0.1 }}
          className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-500 text-red-900 shadow-lg"
        >
          <Gift className="h-7 w-7" aria-hidden />
        </motion.span>
        <Dialog.Title className="relative mt-3 text-lg font-extrabold tracking-tight text-white">Red Envelope Opened</Dialog.Title>
        <p className="relative mt-1 font-mono text-xs font-semibold tracking-wider text-amber-100">{result.code}</p>
      </div>

      <div className="px-6 pb-6 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">You received</p>
        <p className="mt-1 flex items-baseline justify-center gap-1.5">
          <span
            data-testid="envelope-amount"
            className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-amber-700 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]"
          >
            +{formatAmount(shown)}
          </span>
          <span className="text-sm font-bold text-fg-secondary">USDT</span>
        </p>
        <Dialog.Description className="mt-2 text-xs text-fg-secondary">Credited to your available balance.</Dialog.Description>
        <motion.button
          type="button"
          autoFocus
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={onClose}
          className="btn-primary mt-5 w-full rounded-2xl py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          Collect
        </motion.button>
      </div>
    </>
  );
}
