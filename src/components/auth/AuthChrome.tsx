"use client";

import { createContext, Fragment, useContext, useEffect, useRef, type ReactNode } from "react";
import { AlertCircle, ChevronLeft, Loader2, Lock, X } from "lucide-react";
import { LanguageButton } from "@/components/language/LanguageButton";
import { useT } from "@/lib/i18n";

/** True once the user has moved between auth screens; the new screen's heading then takes focus. */
export const NavigatedContext = createContext(false);

export interface BackAction {
  kind: "back" | "close";
  onClick: () => void;
}

export const SCREEN = "relative flex min-h-dvh flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]";

const BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold outline-none transition-transform focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 disabled:active:scale-100 motion-reduce:transition-none";

export const PRIMARY_BUTTON = `${BUTTON} bg-black py-3.5 text-white shadow-sm hover:bg-gray-900`;
export const OUTLINE_BUTTON = `${BUTTON} border border-gray-300 bg-white py-3.5 text-gray-900 hover:bg-gray-50`;
export const TEXT_BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-fg-secondary outline-none transition-colors hover:text-black focus-visible:ring-2 focus-visible:ring-black";

interface TopBarProps {
  back?: BackAction;
}

/** Back or close on the left, language on the right. */
export function AuthTopBar({ back }: TopBarProps) {
  const { t } = useT();
  const Icon = back?.kind === "close" ? X : ChevronLeft;
  return (
    <div className="relative z-10 flex h-12 items-center justify-between">
      {back ? (
        <button
          type="button"
          onClick={back.onClick}
          aria-label={back.kind === "close" ? t("auth.close") : t("common.back")}
          data-testid="auth-back"
          className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-800 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-black active:scale-95 motion-reduce:transition-none"
        >
          <Icon className={back.kind === "close" ? "h-5 w-5" : "h-6 w-6"} strokeWidth={2.25} aria-hidden />
        </button>
      ) : (
        <span />
      )}
      <LanguageButton variant="icon" className="-mr-2" />
    </div>
  );
}

/** Screen title. Takes focus after in-flow navigation so screen readers announce the new screen. */
export function AuthHeading({ className = "", children }: { className?: string; children: ReactNode }) {
  const navigated = useContext(NavigatedContext);
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (navigated) ref.current?.focus({ preventScroll: true });
  }, [navigated]);
  return (
    <h1 ref={ref} tabIndex={-1} className={`font-black tracking-tight text-gray-900 outline-none ${className}`}>
      {children}
    </h1>
  );
}

/** Why sign-in was requested, as set by whatever opened the screen. */
export function ReasonNotice({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <p
      data-testid="auth-reason"
      className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-medium text-gray-700"
    >
      <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
      {reason}
    </p>
  );
}

export function DemoNote({ className = "" }: { className?: string }) {
  const { t } = useT();
  return (
    <p data-testid="auth-demo-note" className={`text-balance text-center text-[11px] text-fg-muted ${className}`}>
      {t("auth.demoNote")}
    </p>
  );
}

export function FormError({ testId, children }: { testId: string; children: ReactNode }) {
  return (
    <p
      role="alert"
      data-testid={testId}
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
    >
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

interface SubmitProps {
  busy: boolean;
  busyLabel: string;
  testId: string;
  disabled?: boolean;
  children: ReactNode;
}

export function SubmitButton({ busy, busyLabel, testId, disabled = false, children }: SubmitProps) {
  return (
    <button type="submit" data-testid={testId} disabled={busy || disabled} aria-busy={busy} className={PRIMARY_BUTTON}>
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Fills `{name}` slots in a translated sentence with elements, so every language keeps its own word order. */
export function Rich({ template, parts }: { template: string; parts: Record<string, ReactNode> }) {
  return (
    <>
      {template.split(/(\{\w+\})/).map((chunk, index) => {
        const slot = chunk.match(/^\{(\w+)\}$/)?.[1];
        return slot ? <Fragment key={index}>{parts[slot]}</Fragment> : chunk;
      })}
    </>
  );
}
