"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, FlaskConical, Loader2, MailCheck } from "lucide-react";
import { Field, PasswordField, inputClass } from "@/components/auth/fields";
import { OtpInput } from "@/components/auth/OtpInput";
import { toast } from "@/components/ui/Toast";
import { AUTH } from "@/config/protocol";
import { AUTH_PROCESSING_MS, wait } from "@/lib/async";
import { passwordIssue } from "@/lib/credentials";
import { useNow } from "@/lib/hooks";
import { maskIdentifier, parseIdentifier } from "@/lib/identifiers";
import { useAppStore } from "@/lib/store";
import type { AuthTab } from "@/types/domain";

const TAP = { scale: 0.98 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const REDIRECT_MS = 1_800;

type Step = "request" | "verify" | "reset" | "done";

interface Props {
  identifier: string;
  setIdentifier: (value: string) => void;
  onSwitch: (tab: AuthTab) => void;
}

function PrimaryButton({ children, busy, disabled = false }: { children: React.ReactNode; busy: boolean; disabled?: boolean }) {
  return (
    <motion.button
      type="submit"
      whileTap={disabled || busy ? undefined : TAP}
      transition={SPRING}
      disabled={disabled || busy}
      aria-busy={busy}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-300"
    >
      {children}
    </motion.button>
  );
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function ForgotForm({ identifier, setIdentifier, onSwitch }: Props) {
  const requestPasswordReset = useAppStore((s) => s.requestPasswordReset);
  const verifyResetCode = useAppStore((s) => s.verifyResetCode);
  const resetPassword = useAppStore((s) => s.resetPassword);

  const [step, setStep] = useState<Step>("request");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [sandboxCode, setSandboxCode] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = useNow(step === "verify" ? 250 : null);
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const parsed = parseIdentifier(identifier);
  const masked = parsed.ok ? maskIdentifier(parsed.key) : "";

  // After a successful reset, send the user back to sign-in with their identifier filled in.
  useEffect(() => {
    if (step !== "done") return;
    const id = setTimeout(() => {
      toast.success("Password updated. Sign in with your new password.");
      onSwitch("login");
    }, REDIRECT_MS);
    return () => clearTimeout(id);
  }, [step, onSwitch]);

  const send = () => {
    setError(null);
    const result = requestPasswordReset(identifier);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSandboxCode(result.sandboxCode);
    setCooldownUntil(result.cooldownUntil);
    if (!result.reused) setCode("");
    return true;
  };

  const onRequest = () => {
    setSubmitted(true);
    if (!parsed.ok) return;
    if (send()) {
      setStep("verify");
      toast.info("Verification code sent");
    }
  };

  const onResend = () => {
    if (secondsLeft > 0) return;
    if (send()) toast.info("A new code was sent");
  };

  const onVerify = () => {
    setError(null);
    const result = verifyResetCode(identifier, code);
    if (!result.ok) {
      setError(result.error);
      setCode("");
      return;
    }
    setSubmitted(false);
    setStep("reset");
  };

  const pwIssue = passwordIssue(password);
  const mismatch = confirm !== "" && confirm !== password;
  const passwordError = password !== "" && pwIssue ? pwIssue : submitted && !password ? "Create a new password." : null;
  const confirmError = mismatch ? "Passwords don't match." : submitted && !confirm ? "Confirm your new password." : null;

  const onReset = async () => {
    if (busy) return;
    setSubmitted(true);
    setError(null);
    if (pwIssue || !confirm || password !== confirm) return;
    setBusy(true);
    await wait(AUTH_PROCESSING_MS);
    const result = await resetPassword({ identifier, code, password });
    setBusy(false);
    if (result.ok) setStep("done");
    else {
      setError(result.error);
      if (/code|expired|attempt/i.test(result.error)) {
        setStep("verify");
        setCode("");
      }
    }
  };

  const errorBanner = error && (
    <p role="alert" data-testid="auth-error" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{error}</span>
    </p>
  );

  if (step === "done") {
    return (
      <div role="status" data-testid="reset-done" className="flex flex-col items-center py-4 text-center">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </motion.span>
        <p className="mt-4 text-base font-semibold">Password updated</p>
        <p className="mt-1 text-xs text-slate-500">Taking you back to sign in…</p>
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className="mt-5 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "request") onRequest();
        else if (step === "verify") onVerify();
        else void onReset();
      }}
    >
      <button
        type="button"
        onClick={() => (step === "request" ? onSwitch("login") : (setError(null), setStep(step === "reset" ? "verify" : "request")))}
        className="flex w-fit items-center gap-1 rounded-md text-xs font-semibold text-slate-600 outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {step === "request" ? "Back to sign in" : "Back"}
      </button>

      <ol className="flex items-center gap-2" aria-label="Progress">
        {(["request", "verify", "reset"] as const).map((id, i) => {
          const order = ["request", "verify", "reset"].indexOf(step);
          return (
            <li key={id} className="flex-1" aria-current={id === step ? "step" : undefined}>
              <span className={`block h-1 rounded-full transition-colors duration-300 ${i <= order ? "bg-slate-950" : "bg-slate-200"}`} />
              <span className="sr-only">Step {i + 1}</span>
            </li>
          );
        })}
      </ol>

      {step === "request" && (
        <>
          <p className="text-sm text-slate-600">Enter your email or phone number and we&apos;ll send a 6-digit verification code.</p>
          <Field id="forgot-identifier" label="Email or phone" error={submitted && !parsed.ok ? parsed.error : null}>
            <input
              id="forgot-identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Email or phone number"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setError(null);
              }}
              aria-invalid={submitted && !parsed.ok}
              className={inputClass(submitted && !parsed.ok)}
            />
          </Field>
          {errorBanner}
          <PrimaryButton busy={busy}>Send Verification Code</PrimaryButton>
        </>
      )}

      {step === "verify" && (
        <>
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span>
              We sent a {AUTH.otp.length}-digit code to <span className="font-semibold text-slate-900">{masked}</span>.
            </span>
          </p>

          <div
            data-testid="sandbox-inbox"
            className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-3.5 py-3"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Sandbox inbox
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <p className="text-xs text-amber-900">
                No message is really sent. Your code is{" "}
                <span data-testid="sandbox-code" className="font-mono text-sm font-semibold tabular-nums tracking-widest">
                  {sandboxCode}
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setCode(sandboxCode);
                  setError(null);
                }}
                className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 outline-none ring-1 ring-amber-200 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Autofill
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Verification code</p>
            <OtpInput
              value={code}
              onChange={(next) => {
                setCode(next);
                setError(null);
              }}
              invalid={Boolean(error)}
            />
          </div>

          {errorBanner}
          <PrimaryButton busy={busy} disabled={code.length !== AUTH.otp.length}>
            Verify Code
          </PrimaryButton>

          <p className="text-center text-xs text-slate-500">
            {secondsLeft > 0 ? (
              <>
                Resend code in <span data-testid="resend-timer" className="font-mono font-semibold tabular-nums text-slate-700">{clock(secondsLeft)}</span>
              </>
            ) : (
              <>
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={onResend}
                  data-testid="resend"
                  className="rounded-md font-semibold text-slate-900 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  Resend code
                </button>
              </>
            )}
          </p>
        </>
      )}

      {step === "reset" && (
        <>
          <p className="text-sm text-slate-600">Code verified. Choose a new password for {masked}.</p>
          <PasswordField
            id="reset-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={passwordError}
            showStrength
          />
          <PasswordField
            id="reset-confirm"
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            error={confirmError}
          />
          {errorBanner}
          <PrimaryButton busy={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Updating…
              </>
            ) : (
              "Update Password"
            )}
          </PrimaryButton>
        </>
      )}
    </form>
  );
}
