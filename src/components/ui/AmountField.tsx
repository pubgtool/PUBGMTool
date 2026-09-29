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
      className={`flex items-baseline gap-2 rounded-2xl border bg-white px-4 py-3 transition-colors focus-within:border-slate-950 ${
        invalid ? "border-rose-300" : "border-slate-200"
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
        className="min-w-0 flex-1 bg-transparent font-mono text-3xl font-semibold tracking-tight tabular-nums outline-none placeholder:text-slate-300"
      />
      <span className="text-sm font-medium text-slate-400">{unit}</span>
    </div>
  );
}
