"use client";

import { useState } from "react";
import { CodeField, FormError, PasswordField, TextField } from "@/components/security/Fields";
import { localizeError } from "@/components/security/errors";
import { SheetFrame, SubmitButton, type SheetProps } from "@/components/security/SheetFrame";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

export function ChangeEmailSheet({ open, onClose }: SheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} keyboardAware>
      {open && <Body onClose={onClose} />}
    </BottomSheet>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const email = useAppStore((s) => s.user.email);
  const requestEmailChange = useAppStore((s) => s.requestEmailChange);
  const confirmEmailChange = useAppStore((s) => s.confirmEmailChange);
  const [newEmail, setNewEmail] = useState("");
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!email) {
    return (
      <SheetFrame title={t("security.email.title")} description={t("security.email.desc")} onClose={onClose}>
        <p data-testid="email-phone-only" className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          {t("security.email.phoneOnly")}
        </p>
      </SheetFrame>
    );
  }

  const sent = sandboxCode !== null;

  const send = () => {
    setError(null);
    const result = requestEmailChange(newEmail);
    if (result.ok) setSandboxCode(result.sandboxCode);
    else setError(localizeError(lang, result.error));
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const result = await confirmEmailChange({ newEmail, code, loginPassword });
    setBusy(false);
    if (result.ok) {
      toast.success(t("security.email.done"));
      onClose();
    } else setError(localizeError(lang, result.error));
  };

  return (
    <SheetFrame title={t("security.email.title")} description={t("security.email.desc")} onClose={onClose}>
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (sent) void confirm();
          else if (newEmail.trim()) send();
        }}
      >
        <div>
          <p className="text-xs font-semibold text-gray-700">{t("security.email.current")}</p>
          <p data-testid="email-current" className="mt-1 truncate rounded-xl bg-gray-50 px-3.5 py-3 text-sm text-gray-700">
            {email}
          </p>
        </div>
        <TextField
          type="email"
          label={t("security.email.new")}
          value={newEmail}
          onChange={(value) => {
            setNewEmail(value);
            setSandboxCode(null);
            setCode("");
          }}
          autoComplete="email"
          placeholder="name@example.com"
          testId="email-new"
        />
        {sent ? (
          <>
            <p data-testid="email-sandbox" className="rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs font-medium text-sky-900">
              {t("security.email.sentDemo", { code: sandboxCode })}
            </p>
            <CodeField label={t("security.email.code")} value={code} onChange={setCode} testId="email-code" />
            <PasswordField label={t("security.loginPassword")} value={loginPassword} onChange={setLoginPassword} autoComplete="current-password" testId="email-password" />
            <FormError message={error} testId="email-error" />
            <SubmitButton busy={busy} disabled={code.length !== 6 || loginPassword.length === 0} label={t("security.email.confirm")} testId="email-confirm" />
            <button
              type="button"
              onClick={() => {
                setSandboxCode(null);
                setCode("");
                setError(null);
              }}
              className="min-h-11 rounded-xl text-sm font-semibold text-gray-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
            >
              {t("security.email.another")}
            </button>
          </>
        ) : (
          <>
            <FormError message={error} testId="email-error" />
            <SubmitButton busy={false} disabled={!newEmail.trim()} label={t("security.email.send")} testId="email-send" />
          </>
        )}
      </form>
    </SheetFrame>
  );
}
