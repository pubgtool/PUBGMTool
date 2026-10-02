"use client";

import { useLayoutEffect, useRef } from "react";
import { formatAmountInput } from "@/lib/amount";

interface AmountFieldProps {
  id: string;
  value: string;
  onValueChange: (text: string) => void;
  invalid?: boolean;
  describedBy?: string;
  unit?: string;
}

/** Large monospace amount input with grouped-thousands formatting and a stable caret. */
export function AmountField({
  id,
  value,
  onValueChange,
  invalid = false,
  describedBy,
  unit = "USDT",
}: AmountFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const caret = caretRef.current;
    caretRef.current = null;
    if (el && caret !== null && document.activeElement === el) el.setSelectionRange(caret, caret);
  }, [value]);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-canvas/60 px-4 py-3.5 shadow-inner shadow-black/30 transition-colors ${
        invalid
          ? "border-rose-500/60 focus-within:border-rose-400 focus-within:shadow-[0_0_0_3px_rgba(244,63,94,0.16)]"
          : "border-gray-200 focus-within:border-amber-400 focus-within:shadow-[0_0_0_3px_rgba(251,191,36,0.14)]"
      }`}
    >
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={value}
        onChange={(event) => {
          const { value: raw, selectionStart } = event.target;
          const next = formatAmountInput(raw, selectionStart ?? raw.length);
          caretRef.current = next.caret;
          onValueChange(next.text);
        }}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-bold tracking-tight tabular-nums text-fg outline-none placeholder:text-fg-muted"
      />
      <span className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-fg-secondary">{unit}</span>
    </div>
  );
}
