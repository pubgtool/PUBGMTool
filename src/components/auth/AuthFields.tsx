"use client";

import { useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { Check, Eye, EyeOff, Key, type LucideIcon } from "lucide-react";
import { AUTH } from "@/config/protocol";
import { passwordStrength } from "@/lib/credentials";
import { type MessageKey, useT } from "@/lib/i18n";

/** 16px on phones so iOS doesn't zoom into the field; the spec's 14px from sm up. */
const CONTROL =
  "w-full rounded-xl border bg-white text-base text-gray-900 outline-none transition-colors placeholder:text-fg-muted sm:text-sm";

export const controlClass = (invalid: boolean) =>
  `${CONTROL} ${
    invalid
      ? "border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-gray-200 focus:border-black focus:ring-1 focus:ring-black"
  }`;

interface AuthFieldProps {
  id: string;
  label: string;
  marker?: "asterisk" | "dot";
  optional?: boolean;
  error?: ReactNode;
  errorTestId?: string;
  hint?: ReactNode;
  children: ReactNode;
}

/** Label with an optional required marker, the control, and either its error or its hint. */
export function AuthField({ id, label, marker, optional = false, error, errorTestId, hint, children }: AuthFieldProps) {
  const { t } = useT();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-700">
        {label}
        {marker === "asterisk" && (
          <span aria-hidden className="text-red-500">
            *
          </span>
        )}
        {marker === "dot" && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-500" />}
        {optional && <span className="font-normal text-fg-muted">({t("auth.field.optional")})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" data-testid={errorTestId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface AuthInputProps extends ComponentPropsWithRef<"input"> {
  icon: LucideIcon;
  invalid?: boolean;
  trailing?: ReactNode;
}

export function AuthInput({ icon: Icon, invalid = false, trailing, className = "", ...props }: AuthInputProps) {
  return (
    <div className="relative">
      <input
        {...props}
        aria-invalid={invalid}
        className={`${controlClass(invalid)} peer py-3 pl-10 ${trailing ? "pr-12" : "pr-3.5"} ${className}`}
      />
      <Icon
        aria-hidden
        strokeWidth={1.75}
        className={`pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors ${
          invalid ? "text-red-500" : "text-gray-400 peer-focus:text-gray-900"
        }`}
      />
      {trailing}
    </div>
  );
}

interface PasswordInputProps extends Omit<ComponentPropsWithRef<"input">, "type"> {
  invalid?: boolean;
  eyeTestId?: string;
}

export function PasswordInput({ eyeTestId, ...props }: PasswordInputProps) {
  const { t } = useT();
  const [visible, setVisible] = useState(false);
  return (
    <AuthInput
      {...props}
      icon={Key}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          onMouseDown={(event) => event.preventDefault()}
          aria-label={visible ? t("auth.password.hide") : t("auth.password.show")}
          aria-pressed={visible}
          data-testid={eyeTestId}
          className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 outline-none transition hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-black active:scale-95 motion-reduce:transition-none"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
        </button>
      }
    />
  );
}

const TONES = ["bg-red-500", "bg-amber-400", "bg-emerald-400", "bg-emerald-600"] as const;
const STRENGTH_KEYS: readonly MessageKey[] = ["auth.strength.1", "auth.strength.2", "auth.strength.3", "auth.strength.4"];

export function StrengthMeter({ password }: { password: string }) {
  const { t } = useT();
  const { score } = passwordStrength(password);
  const labelKey = STRENGTH_KEYS[score - 1];
  const tone = TONES[score - 1];
  return (
    <div className="mt-2" data-testid="strength-meter" data-score={score}>
      <div className="flex gap-1.5" aria-hidden>
        {TONES.map((_, index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${index < score && tone ? tone : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-fg-muted" aria-live="polite">
        <span>{t("auth.password.rule", { n: AUTH.minPasswordLength })}</span>
        <span data-testid="strength-label" className="shrink-0 font-semibold text-gray-900">
          {labelKey ? t(labelKey) : ""}
        </span>
      </p>
    </div>
  );
}

interface AuthCheckboxProps extends Omit<ComponentPropsWithRef<"input">, "type"> {
  invalid?: boolean;
  children: ReactNode;
  className?: string;
}

/** A real checkbox restyled in place, so clicks, focus and form semantics stay native. */
export function AuthCheckbox({ invalid = false, children, className = "", ...props }: AuthCheckboxProps) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <span className="relative mt-px flex h-5 w-5 shrink-0">
        <input
          {...props}
          type="checkbox"
          aria-invalid={invalid}
          className={`peer h-5 w-5 cursor-pointer appearance-none rounded-md border bg-gray-50 outline-none transition-colors checked:border-black checked:bg-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
            invalid ? "border-red-500" : "border-gray-300"
          }`}
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}
