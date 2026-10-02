"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { formatAmount } from "@/lib/format";

interface Props {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  /** Put on the settled value, so it can be read without waiting for the tween. */
  testId?: string;
}

/**
 * Counts from the figure on screen to the new one. The tween writes straight to the DOM, so a
 * re-render never restarts it and nothing re-renders per frame; assistive tech and tests read
 * the settled figure from the hidden twin.
 */
export function AnimatedNumber({ value, decimals = 2, prefix = "", suffix = "", className, duration = 0.6, testId }: Props) {
  const reduce = useReducedMotion();
  const shown = useRef<HTMLSpanElement>(null);
  const current = useRef(value);
  const format = (n: number) => `${prefix}${formatAmount(n, decimals)}${suffix}`;
  const formatRef = useRef(format);
  formatRef.current = format;
  // Fixed after the first render: React never rewrites the node again, so the tween owns it,
  // and the server-rendered text matches what hydration expects.
  const [initial] = useState(() => format(value));

  useEffect(() => {
    const el = shown.current;
    if (!el) return;
    if (reduce || current.current === value) {
      current.current = value;
      el.textContent = formatRef.current(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        current.current = n;
        el.textContent = formatRef.current(n);
      },
      onComplete: () => {
        current.current = value;
        el.textContent = formatRef.current(value);
      },
    });
    return () => controls.stop();
  }, [value, decimals, prefix, suffix, duration, reduce]);

  return (
    <span className={className}>
      <span ref={shown} aria-hidden>
        {initial}
      </span>
      <span data-testid={testId} className="sr-only">
        {format(value)}
      </span>
    </span>
  );
}
