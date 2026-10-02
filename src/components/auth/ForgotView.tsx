"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FlaskConical, Mail } from "lucide-react";
import {
  AuthHeading,
  AuthTopBar,
  FormError,
  PRIMARY_BUTTON,
  Rich,
  SCREEN,
  SubmitButton,
  TEXT_BUTTON,
  type BackAction,
} from "@/components/auth/AuthChrome";
import { AuthField, AuthInput, PasswordInput, StrengthMeter } from "@/components/auth/AuthFields";
import { AuthHero } from "@/components/auth/AuthHero";
import { localizeAuthError, passwordProblem } from "@/components/auth/errors";
import { OtpInput } from "@/components/auth/OtpInput";
import { toast } from "@/components/ui/Toast";
import { AUTH } from "@/config/protocol";
import { AUTH_PROCESSING_MS, wait } from "@/lib/async";
import { useNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { maskIdentifier, parseIdentifier } from "@/lib/identifiers";
import { useAppStore } from "@/lib/store";
import type { AuthTab } from "@/types/domain";

const REDIRECT_MS = 1_800;
const STEPS = ["request", "verify", "reset"] as const;
type Step = (typeof STEPS)[number] | "done";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

interface Props {
  identifier: string;
  onIdentifierChange: (value: string) => void;
  onNavigate: (tab: AuthTab) => void;
}

/** Three steps: who you are, the code, a new password. No message is sent in this build; the code is shown on screen. */
export function ForgotView({ identifier, onIdentifierChange, onNavigate }: Props) {
  const { t } = useT();
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
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const now = useNow(step === "verify" ? 250 : null);
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const parsed = parseIdentifier(identifier);
  const masked = parsed.ok ? maskIdentifier(parsed.key) : "";
  const identifierError = submitted && !parsed.ok ? t(identifier.trim() ? "auth.error.emailInvalid" : "auth.error.emailRequired") : null;

  const passwordIssue = password ? passwordProblem(password, t) : t("auth.error.newPasswordCreate");
  const confirmIssue = !confirm ? t("auth.error.confirmNewRequired") : confirm !== password ? t("auth.error.confirmMismatch") : null;
  const passwordError = submitted || touched.password ? passwordIssue : null;
  const confirmError = submitted || touched.confirm ? confirmIssue : null;

  // After a successful reset, send the user back to sign-in with their identifier filled in.
  useEffect(() => {
    if (step !== "done") return;
    const id = setTimeout(() => {
      toast.success(t("auth.forgot.toastDone"));
      onNavigate("login");
    }, REDIRECT_MS);
    return () => clearTimeout(id);
  }, [step, onNavigate, t]);

  const back: BackAction = {
    kind: "back",
    onClick: () => {
      if (step === "request" || step === "done") {
        onNavigate("login");
        return;
      }
      setError(null);
      setSubmitted(false);
      setStep(step === "reset" ? "verify" : "request");
    },
  };

  const send = (): boolean => {
    setError(null);
    const result = requestPasswordReset(identifier);
    if (!result.ok) {
      setError(localizeAuthError(result.error, t));
      return false;
    }
    setSandboxCode(result.sandboxCode);
    setCooldownUntil(result.cooldownUntil);
    if (!result.reused) setCode("");
    return true;
  };

  const onRequest = () => {
    setSubmitted(true);
    if (!parsed.ok) {
      identifierRef.current?.focus();
      return;
    }
    if (send()) {
      setSubmitted(false);
      setStep("verify");
      toast.info(t("auth.forgot.toastIssued"));
    }
  };

  const onResend = () => {
    if (secondsLeft > 0) return;
    if (send()) toast.info(t("auth.forgot.toastResent"));
  };

  const onVerify = () => {
    setError(null);
    const result = verifyResetCode(identifier, code);
    if (!result.ok) {
      setError(localizeAuthError(result.error, t));
      setCode("");
      return;
    }
    setSubmitted(false);
    setStep("reset");
  };

  const onReset = async () => {
    if (busy) return;
    setSubmitted(true);
    setError(null);
    if (passwordIssue) {
      passwordRef.current?.focus();
      return;
    }
    if (confirmIssue) {
      confirmRef.current?.focus();
      return;
    }
    setBusy(true);
    await wait(AUTH_PROCESSING_MS);
    const result = await resetPassword({ identifier, code, password });
    setBusy(false);
    if (result.ok) {
      setStep("done");
      return;
    }
    setError(localizeAuthError(result.error, t));
    if (/code|expired|attempt/i.test(result.error)) {
      setStep("verify");
      setCode("");
    }
  };

  const hint =
    step === "request"
      ? t("auth.forgot.requestHint", { n: AUTH.otp.length })
      : step === "verify"
        ? t("auth.forgot.verifyHint", { n: AUTH.otp.length, masked })
        : step === "reset"
          ? t("auth.forgot.resetHint", { masked })
          : "";

  if (step === "done") {
    return (
      <div data-testid="forgot-view" className={SCREEN}>
        <AuthTopBar back={back} />
        <div role="status" data-testid="reset-done" className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </span>
          <AuthHeading className="mt-5 text-2xl">{t("auth.forgot.doneTitle")}</AuthHeading>
          <p className="mt-2 text-sm text-fg-secondary">{t("auth.forgot.doneBody")}</p>
          <button type="button" onClick={() => onNavigate("login")} className={`${PRIMARY_BUTTON} mt-8`}>
            {t("auth.forgot.signInNow")}
          </button>
        </div>
      </div>
    );
  }

  const order = STEPS.indexOf(step);

  return (
    <div data-testid="forgot-view" className={SCREEN}>
      <AuthTopBar back={back} />

      <div className="flex flex-col items-center">
        <AuthHero />
        <AuthHeading className="mt-5 text-2xl">{t("auth.forgot.title")}</AuthHeading>
      </div>

      <ol className="mt-5 flex items-center gap-2" aria-label={t("auth.forgot.progress")}>
        {STEPS.map((id, index) => (
          <li key={id} className="flex-1" aria-current={id === step ? "step" : undefined}>
            <span className={`block h-1 rounded-full transition-colors duration-300 ${index <= order ? "bg-black" : "bg-gray-200"}`} />
            <span className="sr-only">{t("auth.forgot.step", { n: index + 1 })}</span>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-center text-sm text-fg-secondary">{hint}</p>

      <form
        noValidate
        className="mt-5 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "request") onRequest();
          else if (step === "verify") onVerify();
          else void onReset();
        }}
      >
        {step === "request" && (
          <>
            <AuthField
              id="forgot-identifier"
              label={t("auth.field.email")}
              marker="asterisk"
              error={identifierError}
              errorTestId="forgot-error-identifier"
            >
              <AuthInput
                ref={identifierRef}
                id="forgot-identifier"
                data-testid="forgot-identifier"
                icon={Mail}
                type="text"
                name="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder={t("auth.field.emailPlaceholder")}
                value={identifier}
                invalid={Boolean(identifierError)}
                aria-required
                aria-describedby={identifierError ? "forgot-identifier-error" : undefined}
                onChange={(event) => {
                  onIdentifierChange(event.target.value);
                  setError(null);
                }}
              />
            </AuthField>
            {error && <FormError testId="forgot-error">{error}</FormError>}
            <SubmitButton busy={false} busyLabel="" testId="forgot-submit">
              {t("auth.forgot.send")}
            </SubmitButton>
          </>
        )}

        {step === "verify" && (
          <>
            <div data-testid="sandbox-inbox" className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden /> {t("auth.forgot.inbox")}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <p className="text-xs text-fg-secondary">
                  {t("auth.forgot.inboxBody")}{" "}
                  <span data-testid="sandbox-code" className="font-mono text-sm font-bold tabular-nums tracking-widest text-gray-900">
                    {sandboxCode}
                  </span>
                </p>
                <button
                  type="button"
                  data-testid="sandbox-autofill"
                  onClick={() => {
                    setCode(sandboxCode);
                    setError(null);
                  }}
                  className="min-h-11 shrink-0 rounded-xl border border-gray-300 bg-white px-3.5 text-xs font-semibold text-gray-900 outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-black active:scale-95 motion-reduce:transition-none"
                >
                  {t("auth.forgot.autofill")}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-700">{t("auth.forgot.code")}</p>
              <OtpInput
                value={code}
                onChange={(next) => {
                  setCode(next);
                  setError(null);
                }}
                invalid={Boolean(error)}
              />
            </div>

            {error && <FormError testId="forgot-error">{error}</FormError>}
            <SubmitButton busy={false} busyLabel="" testId="forgot-submit" disabled={code.length !== AUTH.otp.length}>
              {t("auth.forgot.verify")}
            </SubmitButton>

            <p className="flex items-center justify-center text-center text-xs text-fg-secondary">
              {secondsLeft > 0 ? (
                <span className="py-3">
                  <Rich
                    template={t("auth.forgot.resendIn")}
                    parts={{
                      time: (
                        <span data-testid="resend-timer" className="font-mono font-semibold tabular-nums text-gray-900">
                          {clock(secondsLeft)}
                        </span>
                      ),
                    }}
                  />
                </span>
              ) : (
                <>
                  {t("auth.forgot.noCode")}{" "}
                  <button type="button" data-testid="resend" onClick={onResend} className={`${TEXT_BUTTON} !px-1 !text-xs font-bold !text-gray-900 underline underline-offset-2`}>
                    {t("auth.forgot.resend")}
                  </button>
                </>
              )}
            </p>
          </>
        )}

        {step === "reset" && (
          <>
            <AuthField
              id="reset-password"
              label={t("auth.forgot.newPassword")}
              marker="asterisk"
              error={passwordError}
              errorTestId="forgot-error-password"
            >
              <PasswordInput
                ref={passwordRef}
                id="reset-password"
                data-testid="reset-password"
                eyeTestId="reset-password-eye"
                autoComplete="new-password"
                enterKeyHint="next"
                value={password}
                invalid={Boolean(passwordError)}
                aria-required
                aria-describedby={passwordError ? "reset-password-error" : undefined}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setTouched((v) => ({ ...v, password: true }))}
              />
              <StrengthMeter password={password} />
            </AuthField>
            <AuthField
              id="reset-confirm"
              label={t("auth.forgot.confirmNew")}
              marker="asterisk"
              error={confirmError}
              errorTestId="forgot-error-confirm"
            >
              <PasswordInput
                ref={confirmRef}
                id="reset-confirm"
                data-testid="reset-confirm"
                eyeTestId="reset-confirm-eye"
                autoComplete="new-password"
                enterKeyHint="go"
                value={confirm}
                invalid={Boolean(confirmError)}
                aria-required
                aria-describedby={confirmError ? "reset-confirm-error" : undefined}
                onChange={(event) => setConfirm(event.target.value)}
                onBlur={() => setTouched((v) => ({ ...v, confirm: true }))}
              />
            </AuthField>
            {error && <FormError testId="forgot-error">{error}</FormError>}
            <SubmitButton busy={busy} busyLabel={t("auth.forgot.updating")} testId="forgot-submit">
              {t("auth.forgot.update")}
            </SubmitButton>
          </>
        )}
      </form>
    </div>
  );
}
