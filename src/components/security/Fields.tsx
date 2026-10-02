"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/lib/i18n";

const INPUT =
  "w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-fg-muted focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-50";

interface BaseProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  testId?: string;
}

function Shell({ id, label, error, children }: { id: string; label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-gray-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const border = (error?: string | null) => (error ? "border-red-500 bg-red-50/30" : "border-gray-200");

export function TextField({
  type = "text",
  autoComplete,
  placeholder,
  ...base
}: BaseProps & { type?: "text" | "email"; autoComplete?: string; placeholder?: string }) {
  const id = useId();
  return (
    <Shell id={id} label={base.label} error={base.error}>
      <input
        id={id}
        type={type}
        value={base.value}
        onChange={(event) => base.onChange(event.target.value)}
        disabled={base.disabled}
        autoFocus={base.autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={base.error ? `${id}-error` : undefined}
        data-testid={base.testId}
        className={`${INPUT} ${border(base.error)}`}
      />
    </Shell>
  );
}

export function PasswordField({ autoComplete = "current-password", ...base }: BaseProps & { autoComplete?: string }) {
  const { t } = useT();
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <Shell id={id} label={base.label} error={base.error}>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={base.value}
          onChange={(event) => base.onChange(event.target.value)}
          disabled={base.disabled}
          autoFocus={base.autoFocus}
          autoComplete={autoComplete}
          aria-invalid={base.error ? true : undefined}
          aria-describedby={base.error ? `${id}-error` : undefined}
          data-testid={base.testId}
          className={`${INPUT} ${border(base.error)} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t("security.hide") : t("security.show")}
          aria-pressed={shown}
          className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          {shown ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
        </button>
      </div>
    </Shell>
  );
}

/** Digits only. `masked` hides what is typed (transaction password); otherwise it is a one-time code. */
export function CodeField({ masked = false, length = 6, ...base }: BaseProps & { masked?: boolean; length?: number }) {
  const id = useId();
  return (
    <Shell id={id} label={base.label} error={base.error}>
      <input
        id={id}
        type={masked ? "password" : "text"}
        inputMode="numeric"
        pattern="\d*"
        maxLength={length}
        value={base.value}
        onChange={(event) => base.onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
        disabled={base.disabled}
        autoFocus={base.autoFocus}
        autoComplete={masked ? "off" : "one-time-code"}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={base.error ? `${id}-error` : undefined}
        data-testid={base.testId}
        className={`${INPUT} ${border(base.error)} text-center font-mono text-lg tracking-[0.4em]`}
      />
    </Shell>
  );
}

export function FormError({ message, testId }: { message: string | null; testId?: string }) {
  if (!message) return null;
  return (
    <p role="alert" data-testid={testId} className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
      {message}
    </p>
  );
}
