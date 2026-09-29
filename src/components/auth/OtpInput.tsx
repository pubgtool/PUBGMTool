"use client";

import { useRef } from "react";
import { AUTH } from "@/config/protocol";

interface Props {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  length?: number;
}

/**
 * One box per digit. Typing advances, Backspace steps back, arrows move, and a
 * pasted or autofilled code fills the whole row.
 */
export function OtpInput({ value, onChange, invalid = false, disabled = false, length = AUTH.otp.length }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const focus = (index: number) => refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const write = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    const start = Math.min(index, value.length);
    const next = (value.slice(0, start) + digits).slice(0, length);
    onChange(next);
    focus(Math.min(start + digits.length, length - 1));
  };

  const remove = (index: number) => {
    onChange(value.slice(0, index) + value.slice(index + 1));
  };

  return (
    <div role="group" aria-label={`${length}-digit verification code`} data-testid="otp-input" className="flex justify-between gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid}
          disabled={disabled}
          value={value[i] ?? ""}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            if (event.target.value === "") remove(i);
            else write(i, event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !value[i]) {
              event.preventDefault();
              if (i > 0) {
                remove(i - 1);
                focus(i - 1);
              }
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              focus(i - 1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              focus(i + 1);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            write(i, event.clipboardData.getData("text"));
          }}
          className={`h-14 w-full min-w-0 rounded-2xl border bg-white text-center font-mono text-2xl font-semibold tabular-nums outline-none transition-colors focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:opacity-50 ${
            invalid ? "border-rose-300" : value[i] ? "border-slate-400" : "border-slate-200"
          }`}
        />
      ))}
    </div>
  );
}
