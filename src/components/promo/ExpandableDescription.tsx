"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "framer-motion";

const LINES = 2;

interface Props {
  /** Id of the animated region, for the toggle's aria-controls. */
  id: string;
  expanded: boolean;
  children: ReactNode;
}

/** The dialog description: clamped to two lines, opening to the full text with a height animation. */
export function ExpandableDescription({ id, expanded, children }: Props) {
  const reduceMotion = useReducedMotion();
  const text = useRef<HTMLParagraphElement>(null);
  const [folded, setFolded] = useState<number | "auto">("auto");
  const [clamped, setClamped] = useState(true);

  useLayoutEffect(() => {
    const el = text.current;
    const lineHeight = el ? parseFloat(getComputedStyle(el).lineHeight) : NaN;
    if (Number.isFinite(lineHeight)) setFolded(lineHeight * LINES);
  }, []);

  // The clamp comes off as the animation starts and goes back on once the text has folded.
  useLayoutEffect(() => {
    if (expanded) setClamped(false);
  }, [expanded]);

  return (
    <motion.div
      id={id}
      initial={false}
      animate={{ height: expanded ? "auto" : folded }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
      onAnimationComplete={() => {
        if (!expanded) setClamped(true);
      }}
      className="overflow-hidden"
    >
      <Dialog.Description ref={text} className={`text-sm leading-relaxed text-fg-muted ${clamped ? "line-clamp-2" : ""}`}>
        {children}
      </Dialog.Description>
    </motion.div>
  );
}
