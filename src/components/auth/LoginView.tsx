"use client";

import { useRef, useState } from "react";
import { FlaskConical, Loader2, Mail } from "lucide-react";
import {
  AuthHeading,
  AuthTopBar,
  DemoNote,
  FormError,
  ReasonNotice,
  SCREEN,
  SubmitButton,
  TEXT_BUTTON,
  type BackAction,
} from "@/components/auth/AuthChrome";
import { AuthCheckbox, AuthField, AuthInput, PasswordInput } from "@/components/auth/AuthFields";
import { AuthBackdrop, AuthHero } from "@/components/auth/AuthHero";
import { localizeAuthError } from "@/components/auth/errors";
import { LegalFooter } from "@/components/auth/LegalFooter";
import { SocialAuthRow } from "@/components/auth/SocialAuthRow";
import { toast } from "@/components/ui/Toast";
import { AUTH_PROCESSING_MS, wait } from "@/lib/async";
import { useT } from "@/lib/i18n";
import { parseIdentifier } from "@/lib/identifiers";
import { useAppStore } from "@/lib/store";
import { looksLikeUsername } from "@/lib/usernames";
import type { AuthTab } from "@/types/domain";

interface Props {
  reason: string | null;
  identifier: string;
  onIdentifierChange: (value: string) => void;
  back: BackAction;
  onNavigate: (tab: AuthTab) => void;
}

/** A username, an email or a phone number; the store works out which. */
function identifierProblem(raw: string): "empty" | "invalid" | null {
  const text = raw.trim();
  if (!text) return "empty";
  if (text.includes("@")) return parseIdentifier(text, "email").ok ? null : "invalid";
  return looksLikeUsername(text) || parseIdentifier(text, "phone").ok ? null : "invalid";
}

export function LoginView({ reason, identifier, onIdentifierChange, back, onNavigate }: Props) {
  const { t } = useT();
  const login = useAppStore((s) => s.login);
  const demoLogin = useAppStore((s) => s.demoLogin);

  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<"login" | "demo" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ identifier: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const problem = identifierProblem(identifier);
  const identifierError =
    (submitted || touched.identifier) && problem
      ? t(problem === "empty" ? "auth.error.identifierRequired" : "auth.error.identifierInvalid")
      : null;
  const passwordError = (submitted || touched.password) && !password ? t("auth.error.passwordRequired") : null;

  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    setError(null);
    if (problem) {
      identifierRef.current?.focus();
      return;
    }
    if (!password) {
      passwordRef.current?.focus();
      return;
    }
    setBusy("login");
    await wait(AUTH_PROCESSING_MS);
    const result = await login({ identifier, password, remember });
    setBusy(null);
    if (result.ok) {
      toast.success(t("auth.toast.signedIn"));
      return;
    }
    setError(localizeAuthError(result.error, t));
    passwordRef.current?.focus();
  };

  const demo = async () => {
    if (busy) return;
    setError(null);
    setBusy("demo");
    await wait(AUTH_PROCESSING_MS);
    const result = await demoLogin();
    setBusy(null);
    if (result.ok) toast.success(t("auth.toast.demoSignedIn"));
    else setError(localizeAuthError(result.error, t));
  };

  return (
    <div data-testid="login-view" className={SCREEN}>
      <AuthBackdrop />
      <AuthTopBar back={back} />

      <div className="relative flex flex-col items-center">
        <AuthHero />
        <AuthHeading className="mt-5 text-2xl">{t("auth.login.title")}</AuthHeading>
      </div>

      <div className="relative mt-5 flex flex-col gap-4">
        <ReasonNotice reason={reason} />

        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <AuthField
            id="login-identifier"
            label={t("auth.login.identifier")}
            marker="asterisk"
            error={identifierError}
            errorTestId="login-error-identifier"
          >
            <AuthInput
              ref={identifierRef}
              id="login-identifier"
              data-testid="login-identifier"
              icon={Mail}
              type="text"
              name="username"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder={t("auth.login.identifierPlaceholder")}
              value={identifier}
              invalid={Boolean(identifierError)}
              aria-required
              aria-describedby={identifierError ? "login-identifier-error" : undefined}
              onChange={(event) => {
                onIdentifierChange(event.target.value);
                setError(null);
              }}
              onBlur={() => setTouched((v) => ({ ...v, identifier: true }))}
            />
          </AuthField>

          <AuthField
            id="login-password"
            label={t("auth.field.password")}
            marker="asterisk"
            error={passwordError}
            errorTestId="login-error-password"
          >
            <PasswordInput
              ref={passwordRef}
              id="login-password"
              data-testid="login-password"
              eyeTestId="login-eye"
              name="password"
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              invalid={Boolean(passwordError)}
              aria-required
              aria-describedby={passwordError ? "login-password-error" : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              onBlur={() => setTouched((v) => ({ ...v, password: true }))}
            />
          </AuthField>

          <div className="-mt-1.5 flex items-center justify-between gap-3">
            <AuthCheckbox
              data-testid="login-remember"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="min-h-11 items-center text-[13px] text-gray-700"
            >
              {t("auth.login.remember")}
            </AuthCheckbox>
            <button
              type="button"
              data-testid="login-forgot"
              onClick={() => onNavigate("forgot")}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-1 text-xs font-medium text-gray-600 outline-none transition-colors hover:text-black focus-visible:ring-2 focus-visible:ring-black"
            >
              {t("auth.login.forgot")}
            </button>
          </div>

          {error && <FormError testId="login-error">{error}</FormError>}

          <SubmitButton busy={busy === "login"} busyLabel={t("auth.login.busy")} testId="login-submit" disabled={busy !== null}>
            {t("auth.login.submit")}
          </SubmitButton>
        </form>
      </div>

      <div className="relative">
        <SocialAuthRow providers={["wallet", "telegram", "google"]} />

        <p className="mt-5 text-center text-sm font-medium text-gray-700">
          {t("auth.login.noAccount")}{" "}
          <button
            type="button"
            data-testid="login-to-register"
            onClick={() => onNavigate("register")}
            className="inline-flex min-h-11 items-center rounded-lg px-1 font-bold text-gray-900 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            {t("auth.login.register")}
          </button>
        </p>

        <div className="flex justify-center">
          <button type="button" data-testid="login-demo" onClick={demo} disabled={busy !== null} aria-busy={busy === "demo"} className={`${TEXT_BUTTON} disabled:opacity-60`}>
            {busy === "demo" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FlaskConical className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            {t("auth.login.demo")}
          </button>
        </div>
      </div>

      <div className="relative mt-auto">
        <DemoNote className="mt-3" />
        <LegalFooter />
      </div>
    </div>
  );
}
