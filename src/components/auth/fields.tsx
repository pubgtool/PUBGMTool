"use client";

import { AlertCircle } from "lucide-react";

/** Light-theme field primitives shared with the KYC steps. The auth screens use AuthFields instead. */
export const inputClass = (invalid: boolean) =>
  `w-full rounded-2xl border bg-canvas px-4 py-3.5 text-base text-fg outline-none transition-colors placeholder:text-fg-muted focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 ${
    invalid ? "border-rose-500/60" : "border-gray-200"
  }`;

interface FieldProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-fg-secondary">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 flex items-start gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-600"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-xs text-fg-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
