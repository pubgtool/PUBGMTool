"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ClipboardPaste, Info, Loader2, TriangleAlert } from "lucide-react";
import { Field, PasswordField, inputClass } from "@/components/auth/fields";
import { toast } from "@/components/ui/Toast";
import { AUTH } from "@/config/protocol";
import { AUTH_PROCESSING_MS, wait } from "@/lib/async";
import { passwordIssue } from "@/lib/credentials";
import { parseIdentifier, type IdentifierKind } from "@/lib/identifiers";
import { TRIAL_VOUCHER_AMOUNT, findReferrer, useAppStore } from "@/lib/store";
import type { AuthTab } from "@/types/domain";

const TAP = { scale: 0.98 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

const METHODS: ReadonlyArray<{ id: IdentifierKind; label: string }> = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
];

interface Props {
  identifier: string;
  setIdentifier: (value: string) => void;
  onSwitch: (tab: AuthTab) => void;
}

const guessKind = (text: string): IdentifierKind => (text && !text.includes("@") && /^[+\d\s().-]+$/.test(text) ? "phone" : "email");

export function RegisterForm({ identifier, setIdentifier, onSwitch }: Props) {
  const register = useAppStore((s) => s.register);
  const accounts = useAppStore((s) => s.accounts);
  const pendingReferral = useAppStore((s) => s.pendingReferral);

  const [method, setMethod] = useState<IdentifierKind>(() => guessKind(identifier));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referral, setReferral] = useState(pendingReferral ?? "");
  const [autofilled, setAutofilled] = useState<"link" | "clipboard" | null>(pendingReferral ? "link" : null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** True once the field holds an invite link code or the user has typed in it. */
  const referralTouched = useRef(Boolean(pendingReferral));

  // Use an already-permitted clipboard to spot an invite code; never prompt for it.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await navigator.permissions?.query({ name: "clipboard-read" as PermissionName });
        if (status?.state !== "granted") return;
        const text = (await navigator.clipboard.readText()).trim();
        if (cancelled || referralTouched.current || !new RegExp(`^\\d{${AUTH.uidDigits}}$`).test(text)) return;
        setReferral(text);
        setAutofilled("clipboard");
      } catch {
        // Clipboard unavailable or blocked: the Paste button still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const parsed = parseIdentifier(identifier, method);
  const pwIssue = passwordIssue(password);
  const mismatch = confirm !== "" && confirm !== password;
  const referrer = useMemo(() => (referral.length === AUTH.uidDigits ? findReferrer({ accounts }, referral) : null), [accounts, referral]);
  const referralBlocked = AUTH.referralRequired && !referrer;

  const idError = submitted && !parsed.ok ? parsed.error : null;
  const passwordError = (submitted || password !== "") && pwIssue && password !== "" ? pwIssue : submitted && !password ? "Create a password." : null;
  const confirmError = mismatch ? "Passwords don't match." : submitted && !confirm ? "Confirm your password." : null;
  const termsError = submitted && !agreed ? "Accept the terms to continue." : null;

  const pill: { tone: "neutral" | "ok" | "warn"; text: string } = !referral
    ? { tone: "neutral", text: "No Referral Code" }
    : referral.length < AUTH.uidDigits
      ? { tone: "neutral", text: `Enter the ${AUTH.uidDigits}-digit code` }
      : referrer
        ? { tone: "ok", text: `Referrer verified ✓ (UID ${referrer.user.uid})` }
        : { tone: "warn", text: AUTH.referralRequired ? "Invalid referral code" : "Code not recognised on this device" };

  const switchMethod = (next: IdentifierKind) => {
    if (next === method) return;
    setMethod(next);
    if (guessKind(identifier) !== next) setIdentifier("");
  };

  const pasteReferral = async () => {
    try {
      const text = (await navigator.clipboard.readText()).replace(/\D/g, "").slice(0, 10);
      if (!text) {
        toast.info("No invite code found on your clipboard");
        return;
      }
      referralTouched.current = true;
      setReferral(text);
      setAutofilled(null);
    } catch {
      toast.error("Clipboard access was blocked. Type the code instead.");
    }
  };

  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    setError(null);
    if (!parsed.ok || pwIssue || password !== confirm || !confirm || !agreed || referralBlocked) return;
    setBusy(true);
    await wait(AUTH_PROCESSING_MS);
    const result = await register({ identifier, kind: method, password, referralCode: referral || null });
    setBusy(false);
    if (result.ok) {
      const name = useAppStore.getState().user.displayName;
      toast.success(`Welcome to NEXUS, ${name}! ${TRIAL_VOUCHER_AMOUNT.toFixed(2)} USDT trial voucher added.`);
    } else {
      setError(result.error);
    }
  };

  const duplicate = error?.includes("already exists") ?? false;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div role="radiogroup" aria-label="Sign up with" className="relative grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        {METHODS.map(({ id, label }) => {
          const active = id === method;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => switchMethod(id)}
              className="relative rounded-xl py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {active && (
                <motion.span layoutId="register-method-pill" className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={SPRING} />
              )}
              <span className={`relative ${active ? "text-slate-950" : "text-slate-500"}`}>{label}</span>
            </button>
          );
        })}
      </div>

      <Field
        id="register-identifier"
        label={method === "email" ? "Email address" : "Phone number"}
        error={idError}
        hint={method === "phone" ? "Include your country code, e.g. +1 555 123 4567" : undefined}
      >
        <input
          id="register-identifier"
          type={method === "email" ? "text" : "tel"}
          inputMode={method === "email" ? "email" : "tel"}
          autoComplete={method === "email" ? "email" : "tel"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={method === "email" ? "you@example.com" : "+1 555 123 4567"}
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setError(null);
          }}
          aria-invalid={Boolean(idError)}
          aria-describedby={idError ? "register-identifier-error" : method === "phone" ? "register-identifier-hint" : undefined}
          className={inputClass(Boolean(idError))}
        />
      </Field>

      <PasswordField
        id="register-password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={passwordError}
        showStrength
      />

      <PasswordField
        id="register-confirm"
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={confirmError}
      />

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="register-referral" className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Referral code {AUTH.referralRequired ? "" : <span className="normal-case tracking-normal text-slate-400">(optional)</span>}
          </label>
        </div>
        <div
          className={`mt-2 flex items-center gap-2 rounded-2xl border bg-white pl-4 pr-1.5 transition-colors focus-within:border-slate-950 ${
            pill.tone === "warn" ? "border-amber-300" : "border-slate-200"
          }`}
        >
          <input
            id="register-referral"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={"0".repeat(AUTH.uidDigits)}
            maxLength={10}
            value={referral}
            onChange={(event) => {
              referralTouched.current = true;
              setReferral(event.target.value.replace(/\D/g, ""));
              setAutofilled(null);
            }}
            aria-describedby="register-referral-pill"
            className="min-w-0 flex-1 bg-transparent py-3 font-mono text-base tabular-nums tracking-wider outline-none placeholder:text-slate-300"
          />
          <button
            type="button"
            onClick={pasteReferral}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <ClipboardPaste className="h-3.5 w-3.5" aria-hidden />
            Paste
          </button>
        </div>
        <p
          id="register-referral-pill"
          data-testid="referral-pill"
          data-tone={pill.tone}
          aria-live="polite"
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            pill.tone === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : pill.tone === "warn"
                ? "bg-amber-50 text-amber-800"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {pill.tone === "ok" ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : pill.tone === "warn" ? <TriangleAlert className="h-3 w-3" aria-hidden /> : <Info className="h-3 w-3" aria-hidden />}
          {pill.text}
        </p>
        {autofilled && (
          <p className="mt-1.5 text-[11px] text-slate-400">{autofilled === "link" ? "Filled from your invite link" : "Filled from your clipboard"}</p>
        )}
        {pill.tone === "warn" && !AUTH.referralRequired && (
          <p className="mt-1.5 text-[11px] text-slate-500">You can still register; this code won&apos;t be linked to a referrer.</p>
        )}
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-3.5 py-3 text-xs text-slate-600 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-900">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            aria-invalid={Boolean(termsError)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-slate-950"
          />
          <span>
            I agree to the{" "}
            <Link href="/legal/terms" target="_blank" className="font-semibold text-slate-900 underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and have read the{" "}
            <Link href="/legal/risk" target="_blank" className="font-semibold text-slate-900 underline underline-offset-2">
              Risk Disclosure
            </Link>
            . Returns are not guaranteed.
          </span>
        </label>
        {termsError && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
            {termsError}
          </p>
        )}
      </div>

      {error && (
        <div role="alert" data-testid="auth-error" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          {duplicate && (
            <button
              type="button"
              onClick={() => onSwitch("login")}
              className="shrink-0 font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              Sign in instead
            </button>
          )}
        </div>
      )}

      <motion.button
        type="submit"
        whileTap={busy ? undefined : TAP}
        transition={SPRING}
        disabled={busy}
        aria-busy={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-300"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Creating account…
          </>
        ) : (
          "Create Institutional Account"
        )}
      </motion.button>

      <p className="text-center text-xs text-slate-500">
        Already registered?{" "}
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className="rounded-md font-semibold text-slate-900 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
