"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AUTH } from "@/config/protocol";
import { passwordStrength } from "@/lib/credentials";

export const inputClass = (invalid: boolean) =>
  `w-full rounded-2xl border bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-slate-400 focus:border-slate-950 ${
    invalid ? "border-rose-300" : "border-slate-200"
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
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const BAR_TONES = ["bg-rose-500", "bg-amber-500", "bg-emerald-400", "bg-emerald-600"] as const;

export function StrengthMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  return (
    <div className="mt-2" data-testid="strength-meter" data-score={score}>
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= score ? BAR_TONES[score - 1] : "bg-slate-200"}`}
          />
        ))}
      </div>
      <p className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500" aria-live="polite">
        <span>
          {AUTH.minPasswordLength}+ characters with a letter and a number
        </span>
        <span data-testid="strength-label" className="font-semibold text-slate-700">
          {label}
        </span>
      </p>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string | null;
  showStrength?: boolean;
  placeholder?: string;
  hint?: React.ReactNode;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  showStrength = false,
  placeholder = "••••••••",
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${inputClass(Boolean(error))} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {showStrength && <StrengthMeter password={value} />}
    </Field>
  );
}
