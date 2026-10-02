"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ClipboardPaste, Globe, Info, Mail, TriangleAlert, User, X } from "lucide-react";
import {
  AuthHeading,
  AuthTopBar,
  DemoNote,
  FormError,
  ReasonNotice,
  Rich,
  SCREEN,
  SubmitButton,
  type BackAction,
} from "@/components/auth/AuthChrome";
import { AuthCheckbox, AuthField, AuthInput, PasswordInput, StrengthMeter, controlClass } from "@/components/auth/AuthFields";
import { AuthHero } from "@/components/auth/AuthHero";
import { CountrySelectDrawer } from "@/components/auth/CountrySelectDrawer";
import { localizeAuthError, passwordProblem } from "@/components/auth/errors";
import { LegalFooter } from "@/components/auth/LegalFooter";
import { toast } from "@/components/ui/Toast";
import { AUTH, PROTOCOL } from "@/config/protocol";
import { AUTH_PROCESSING_MS, wait } from "@/lib/async";
import { findCountry } from "@/lib/countries";
import { type MessageKey, useT } from "@/lib/i18n";
import { parseIdentifier } from "@/lib/identifiers";
import { TRIAL_VOUCHER_AMOUNT, findReferrer, useAppStore } from "@/lib/store";
import { USERNAME, usernameProblem, type UsernameProblem } from "@/lib/usernames";
import type { AuthTab } from "@/types/domain";

type FieldName = "username" | "email" | "password" | "confirm" | "referral" | "terms";

/** Top to bottom, so the first invalid field is the one nearest the top. */
const FIELD_ORDER: readonly FieldName[] = ["username", "email", "password", "confirm", "referral", "terms"];

const USERNAME_KEYS: Record<UsernameProblem, MessageKey> = {
  empty: "auth.error.usernameRequired",
  format: "auth.error.usernameInvalid",
  reserved: "auth.error.usernameReserved",
};

interface ServerError {
  field: FieldName | "form";
  message: string;
}

/** Sends a store error to the field it is about. */
function routeError(message: string): ServerError {
  if (/already exists/i.test(message)) return { field: "email", message };
  if (/username/i.test(message)) return { field: "username", message };
  if (/referral/i.test(message)) return { field: "referral", message };
  return { field: "form", message };
}

const STATUS_TONES = {
  info: { text: "text-fg-muted", Icon: Info },
  ok: { text: "text-emerald-700", Icon: CheckCircle2 },
  warn: { text: "text-amber-700", Icon: TriangleAlert },
  error: { text: "text-red-600", Icon: TriangleAlert },
} as const;

function InviteNote({ tone, children }: { tone: keyof typeof STATUS_TONES; children: ReactNode }) {
  const { text, Icon } = STATUS_TONES[tone];
  return (
    <p data-testid="referral-pill" data-tone={tone} className={`mt-1.5 flex items-start gap-1.5 text-xs font-medium ${text}`}>
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

const TERMS_LINK = "font-semibold text-gray-900 underline underline-offset-2";

interface Props {
  reason: string | null;
  identifier: string;
  onIdentifierChange: (value: string) => void;
  back: BackAction;
  onNavigate: (tab: AuthTab) => void;
}

export function RegisterView({ reason, identifier, onIdentifierChange, back, onNavigate }: Props) {
  const { t, lang } = useT();
  const register = useAppStore((s) => s.register);
  const accounts = useAppStore((s) => s.accounts);
  const pendingReferral = useAppStore((s) => s.pendingReferral);

  const [username, setUsername] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [email, setEmail] = useState(() => (identifier.includes("@") ? identifier : ""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referral, setReferral] = useState(pendingReferral ?? "");
  const [autofilled, setAutofilled] = useState<"link" | "clipboard" | null>(pendingReferral ? "link" : null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** True once the field holds an invite-link code or the user has typed in it. */
  const referralTouched = useRef(Boolean(pendingReferral));

  const refs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
    username: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
    referral: useRef<HTMLInputElement>(null),
    terms: useRef<HTMLInputElement>(null),
  };
  const countryTrigger = useRef<HTMLButtonElement>(null);

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

  const referrer = useMemo(
    () => (referral.length === AUTH.uidDigits ? findReferrer({ accounts }, referral) : null),
    [accounts, referral],
  );
  const selectedCountry = findCountry(country, lang);

  const usernameIssue = usernameProblem(username);
  const emailValid = parseIdentifier(email, "email").ok;
  const problems: Record<FieldName, string | null> = {
    username: usernameIssue ? t(USERNAME_KEYS[usernameIssue], { min: USERNAME.min, max: USERNAME.max }) : null,
    email: !email.trim() ? t("auth.error.emailRequired") : emailValid ? null : t("auth.error.emailInvalid"),
    password: password ? passwordProblem(password, t) : t("auth.error.passwordCreate"),
    confirm: !confirm ? t("auth.error.confirmRequired") : confirm !== password ? t("auth.error.confirmMismatch") : null,
    referral: AUTH.referralRequired && !referrer ? t("auth.error.inviteInvalid") : null,
    terms: agreed ? null : t("auth.error.termsRequired"),
  };

  const shown = (field: FieldName): string | null => {
    if (serverError?.field === field) return localizeAuthError(serverError.message, t);
    return submitted || touched[field] ? problems[field] : null;
  };
  const touch = (field: FieldName) => setTouched((v) => ({ ...v, [field]: true }));
  const edit = (field: FieldName) =>
    setServerError((current) => (current && (current.field === field || current.field === "form") ? null : current));

  const errors = Object.fromEntries(FIELD_ORDER.map((field) => [field, shown(field)])) as Record<FieldName, string | null>;

  const inviteStatus = (() => {
    if (errors.referral || !referral) return null;
    if (referral.length < AUTH.uidDigits) return { tone: "info", text: t("auth.invite.partial", { n: AUTH.uidDigits }) } as const;
    if (referrer) return { tone: "ok", text: t("auth.invite.found", { uid: referrer.user.uid }) } as const;
    return AUTH.referralRequired
      ? ({ tone: "error", text: t("auth.invite.invalid") } as const)
      : ({ tone: "warn", text: t("auth.invite.unknown") } as const);
  })();

  const pasteReferral = async () => {
    try {
      const text = (await navigator.clipboard.readText()).replace(/\D/g, "").slice(0, 12);
      if (!text) {
        toast.info(t("auth.invite.noClipboard"));
        return;
      }
      referralTouched.current = true;
      setReferral(text);
      setAutofilled(null);
      edit("referral");
    } catch {
      toast.error(t("auth.invite.clipboardBlocked"));
    }
  };

  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    setServerError(null);
    const firstInvalid = FIELD_ORDER.find((field) => problems[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }
    const name = username.trim();
    setBusy(true);
    await wait(AUTH_PROCESSING_MS);
    const result = await register({
      identifier: email,
      kind: "email",
      password,
      referralCode: referral || null,
      username: name,
      displayName: name,
      country: country ?? undefined,
    });
    setBusy(false);
    if (result.ok) {
      toast.success(
        t("auth.toast.welcome", {
          brand: PROTOCOL.shortName,
          name: useAppStore.getState().user.displayName,
          amount: TRIAL_VOUCHER_AMOUNT.toFixed(2),
        }),
      );
      return;
    }
    const routed = routeError(result.error);
    setServerError(routed);
    if (routed.field !== "form") refs[routed.field].current?.focus();
  };

  const emailError = errors.email;
  const duplicate = serverError?.field === "email" && /already exists/i.test(serverError.message);

  return (
    <div data-testid="register-view" className={SCREEN}>
      <AuthTopBar back={back} />

      <div className="flex flex-col items-center">
        <AuthHero />
        <AuthHeading className="mt-4 text-2xl">{t("auth.register.title")}</AuthHeading>
      </div>

      <div className="mt-5 flex flex-col gap-4">
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
            id="register-username"
            label={t("auth.register.username")}
            marker="dot"
            error={errors.username}
            errorTestId="register-error-username"
          >
            <AuthInput
              ref={refs.username}
              id="register-username"
              data-testid="register-username"
              icon={User}
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              maxLength={64}
              placeholder={t("auth.register.usernamePlaceholder")}
              value={username}
              invalid={Boolean(errors.username)}
              aria-required
              aria-describedby={errors.username ? "register-username-error" : undefined}
              onChange={(event) => {
                setUsername(event.target.value);
                edit("username");
              }}
              onBlur={() => touch("username")}
            />
          </AuthField>

          <AuthField id="register-country" label={t("auth.register.country")} optional>
            <div className="relative">
              <button
                ref={countryTrigger}
                id="register-country"
                type="button"
                data-testid="register-country"
                aria-haspopup="dialog"
                onClick={(event) => {
                  event.currentTarget.focus();
                  setPickerOpen(true);
                }}
                className={`${controlClass(false)} flex items-center gap-2 py-3 pl-10 text-left ${selectedCountry ? "pr-12" : "pr-3.5"}`}
              >
                <span className={`min-w-0 flex-1 truncate ${selectedCountry ? "" : "text-fg-muted"}`}>
                  {selectedCountry ? selectedCountry.name : t("auth.register.countryPlaceholder")}
                </span>
                {selectedCountry && <span className="shrink-0 font-mono text-xs text-fg-muted">{selectedCountry.dial}</span>}
                {!selectedCountry && <ChevronDown className="h-[18px] w-[18px] shrink-0 text-gray-400" strokeWidth={1.75} aria-hidden />}
              </button>
              <Globe
                aria-hidden
                strokeWidth={1.75}
                className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
              />
              {selectedCountry && (
                <button
                  type="button"
                  data-testid="register-country-clear"
                  aria-label={t("auth.register.countryClear")}
                  onClick={() => {
                    setCountry(null);
                    countryTrigger.current?.focus();
                  }}
                  className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 outline-none transition hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-black active:scale-95 motion-reduce:transition-none"
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              )}
            </div>
          </AuthField>

          <AuthField
            id="register-email"
            label={t("auth.field.email")}
            marker="dot"
            error={
              emailError && (
                <>
                  {emailError}
                  {duplicate && (
                    <>
                      {" "}
                      <button
                        type="button"
                        data-testid="register-signin-instead"
                        onClick={() => onNavigate("login")}
                        className="rounded font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        {t("auth.register.signInInstead")}
                      </button>
                    </>
                  )}
                </>
              )
            }
            errorTestId="register-error-email"
          >
            <AuthInput
              ref={refs.email}
              id="register-email"
              data-testid="register-email"
              icon={Mail}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder={t("auth.field.emailPlaceholder")}
              value={email}
              invalid={Boolean(emailError)}
              aria-required
              aria-describedby={emailError ? "register-email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                onIdentifierChange(event.target.value);
                edit("email");
              }}
              onBlur={() => touch("email")}
            />
          </AuthField>

          <AuthField
            id="register-password"
            label={t("auth.field.password")}
            marker="dot"
            error={errors.password}
            errorTestId="register-error-password"
          >
            <PasswordInput
              ref={refs.password}
              id="register-password"
              data-testid="register-password"
              eyeTestId="register-password-eye"
              name="new-password"
              autoComplete="new-password"
              enterKeyHint="next"
              value={password}
              invalid={Boolean(errors.password)}
              aria-required
              aria-describedby={errors.password ? "register-password-error" : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                edit("password");
              }}
              onBlur={() => touch("password")}
            />
            <StrengthMeter password={password} />
          </AuthField>

          <AuthField
            id="register-confirm"
            label={t("auth.register.confirm")}
            marker="dot"
            error={errors.confirm}
            errorTestId="register-error-confirm"
          >
            <PasswordInput
              ref={refs.confirm}
              id="register-confirm"
              data-testid="register-confirm"
              eyeTestId="register-confirm-eye"
              name="confirm-password"
              autoComplete="new-password"
              enterKeyHint="next"
              value={confirm}
              invalid={Boolean(errors.confirm)}
              aria-required
              aria-describedby={errors.confirm ? "register-confirm-error" : undefined}
              onChange={(event) => {
                setConfirm(event.target.value);
                edit("confirm");
              }}
              onBlur={() => touch("confirm")}
            />
          </AuthField>

          <AuthField
            id="register-invite"
            label={t("auth.register.invite")}
            marker={AUTH.referralRequired ? "dot" : undefined}
            optional={!AUTH.referralRequired}
            error={errors.referral}
            errorTestId="register-error-referral"
          >
            <div className="relative">
              <input
                ref={refs.referral}
                id="register-invite"
                data-testid="register-invite"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                maxLength={12}
                placeholder={"0".repeat(AUTH.uidDigits)}
                value={referral}
                aria-invalid={Boolean(errors.referral)}
                aria-required={AUTH.referralRequired}
                aria-describedby={errors.referral ? "register-invite-error" : "register-invite-status"}
                onChange={(event) => {
                  referralTouched.current = true;
                  setReferral(event.target.value.replace(/\D/g, ""));
                  setAutofilled(null);
                  edit("referral");
                }}
                onBlur={() => touch("referral")}
                className={`${controlClass(Boolean(errors.referral))} py-3 pl-3.5 pr-24 font-mono tabular-nums tracking-wider`}
              />
              <button
                type="button"
                data-testid="register-invite-paste"
                onClick={pasteReferral}
                className="group absolute right-0.5 top-1/2 flex h-11 -translate-y-1/2 items-center px-2 outline-none"
              >
                <span className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-900 transition group-hover:bg-gray-200 group-focus-visible:ring-2 group-focus-visible:ring-black group-active:scale-95 motion-reduce:transition-none">
                  <ClipboardPaste className="h-3.5 w-3.5" aria-hidden />
                  {t("auth.register.paste")}
                </span>
              </button>
            </div>
            <div id="register-invite-status" aria-live="polite">
              {inviteStatus && <InviteNote tone={inviteStatus.tone}>{inviteStatus.text}</InviteNote>}
              {inviteStatus?.tone === "warn" && <p className="mt-1 text-xs text-fg-muted">{t("auth.invite.unknownHint")}</p>}
              {autofilled && (
                <p className="mt-1 text-xs text-fg-muted">{t(autofilled === "link" ? "auth.invite.fromLink" : "auth.invite.fromClipboard")}</p>
              )}
            </div>
          </AuthField>

          <div>
            <AuthCheckbox
              ref={refs.terms}
              data-testid="register-terms"
              checked={agreed}
              invalid={Boolean(errors.terms)}
              aria-describedby={errors.terms ? "register-terms-error" : undefined}
              onChange={(event) => {
                setAgreed(event.target.checked);
                touch("terms");
              }}
              className="py-1.5 text-xs leading-snug text-fg-secondary"
            >
              <Rich
                template={t("auth.register.terms")}
                parts={{
                  terms: (
                    <Link href="/legal/terms" target="_blank" className={TERMS_LINK}>
                      {t("auth.register.termsLink")}
                    </Link>
                  ),
                  risk: (
                    <Link href="/legal/risk" target="_blank" className={TERMS_LINK}>
                      {t("auth.register.riskLink")}
                    </Link>
                  ),
                }}
              />
            </AuthCheckbox>
            {errors.terms && (
              <p id="register-terms-error" role="alert" data-testid="register-error-terms" className="mt-1 text-xs text-red-600">
                {errors.terms}
              </p>
            )}
          </div>

          {serverError?.field === "form" && (
            <FormError testId="register-error-form">{localizeAuthError(serverError.message, t)}</FormError>
          )}

          <SubmitButton busy={busy} busyLabel={t("auth.register.busy")} testId="register-submit">
            {t("auth.register.submit")}
          </SubmitButton>
        </form>

        <p className="text-center text-sm font-medium text-gray-700">
          {t("auth.register.haveAccount")}{" "}
          <button
            type="button"
            data-testid="register-to-login"
            onClick={() => onNavigate("login")}
            className="inline-flex min-h-11 items-center rounded-lg px-1 font-bold text-gray-900 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            {t("auth.register.signIn")}
          </button>
        </p>
      </div>

      <div className="mt-auto">
        <DemoNote />
        <LegalFooter />
      </div>

      <CountrySelectDrawer
        open={pickerOpen}
        value={country}
        onSelect={(code) => {
          setCountry(code);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
