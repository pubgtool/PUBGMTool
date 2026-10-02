"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, FlaskConical } from "lucide-react";

interface Props {
  label?: string;
  children: React.ReactNode;
  testId?: string;
}

/** Collapsed-by-default drawer for the shortcuts that only make sense in the demo. */
export function DemoTools({ label = "Demo tools", children, testId }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const reduceMotion = useReducedMotion();
  return (
    <div className="rounded-2xl border border-dashed border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid={testId}
        className="flex w-full items-center gap-2 rounded-2xl px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <FlaskConical className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
        <span className="flex-1 text-xs font-semibold text-fg-secondary">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
