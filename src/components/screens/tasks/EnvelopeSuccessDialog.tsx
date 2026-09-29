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
                className="fixed inset-0 z-[45] bg-slate-950/50 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <ConfettiRain />
            <div className="pointer-events-none fixed inset-0 z-[46] flex items-center justify-center px-6">
              <Dialog.Content asChild forceMount>
                <motion.div
                  className="pointer-events-auto w-full max-w-xs overflow-hidden rounded-[28px] bg-white text-center shadow-2xl outline-none"
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
      <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-red-500 px-6 pb-7 pt-8 text-white">
        <motion.span
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING, delay: 0.1 }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20"
        >
          <Gift className="h-7 w-7" aria-hidden />
        </motion.span>
        <Dialog.Title className="mt-3 text-lg font-semibold tracking-tight">Red Envelope Opened</Dialog.Title>
        <p className="mt-1 font-mono text-xs tracking-wider text-white/80">{result.code}</p>
      </div>

      <div className="px-6 pb-6 pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">You received</p>
        <p className="mt-1 flex items-baseline justify-center gap-1.5">
          <span data-testid="envelope-amount" className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
            +{formatAmount(shown)}
          </span>
          <span className="text-sm font-medium text-slate-400">USDT</span>
        </p>
        <Dialog.Description className="mt-2 text-xs text-slate-500">
          Credited to your available balance.
        </Dialog.Description>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-slate-950 py-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          Collect
        </button>
      </div>
    </>
  );
}
