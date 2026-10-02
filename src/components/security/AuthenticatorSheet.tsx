"use client";

import { useEffect, useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
import { CodeField, FormError, PasswordField } from "@/components/security/Fields";
import { localizeError } from "@/components/security/errors";
import { SheetFrame, SubmitButton, type SheetProps } from "@/components/security/SheetFrame";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { QrCode } from "@/components/ui/QrCode";
import { toast } from "@/components/ui/Toast";
import { PROTOCOL } from "@/config/protocol";
import { copyText } from "@/lib/clipboard";
import { useT } from "@/lib/i18n";
import { selectHasTwoFactor, useAppStore } from "@/lib/store";
import { formatSecret, generateTotpSecret, otpauthUri } from "@/lib/totp";

export function AuthenticatorSheet({ open, onClose }: SheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} keyboardAware>
      {open && <Body onClose={onClose} />}
    </BottomSheet>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const enabled = useAppStore(selectHasTwoFactor);
  return enabled ? <DisableForm onClose={onClose} /> : <EnableForm onClose={onClose} />;
}

function EnableForm({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const user = useAppStore((s) => s.user);
  const enableTwoFactor = useAppStore((s) => s.enableTwoFactor);
  // Generated after mount so the server render and the first client render match.
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSecret(generateTotpSecret());
  }, []);

  const account = user.email ?? user.username ?? user.uid;
  const ready = secret !== null && code.length === 6;

  const copyKey = async () => {
    if (!secret) return;
    if (await copyText(secret)) toast.success(t("security.2fa.keyCopied"));
    else toast.error(t("security.2fa.copyFailed"));
  };

  const submit = async () => {
    if (!secret || !ready || busy) return;
    setBusy(true);
    setError(null);
    const result = await enableTwoFactor({ secret, code });
    setBusy(false);
    if (result.ok) {
      toast.success(t("security.2fa.enabledToast"));
      onClose();
    } else setError(localizeError(lang, result.error));
  };

  return (
    <SheetFrame title={t("security.2fa.title")} description={t("security.2fa.setupDesc")} onClose={onClose}>
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="h-44 w-44 rounded-xl bg-white p-2 shadow-sm" data-testid="2fa-qr">
            {secret && <QrCode value={otpauthUri({ secret, account, issuer: PROTOCOL.name })} label={t("security.2fa.qrLabel")} className="h-full w-full" />}
          </div>
          <div className="flex w-full items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{t("security.2fa.key")}</p>
              <p data-testid="2fa-key" className="mt-0.5 font-mono text-[13px] font-semibold leading-snug text-gray-900 [word-break:normal]">
                {secret ? formatSecret(secret) : "\u00A0"}
              </p>
            </div>
            <button
              type="button"
              onClick={copyKey}
              aria-label={t("security.2fa.copyKey")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-800 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900"
            >
              <Copy className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <CodeField label={t("security.2fa.code")} value={code} onChange={setCode} testId="2fa-code" />
        <FormError message={error} testId="2fa-error" />
        <SubmitButton busy={busy} disabled={!ready} label={t("security.2fa.enable")} testId="2fa-submit" />
      </form>
    </SheetFrame>
  );
}

function DisableForm({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const disableTwoFactor = useAppStore((s) => s.disableTwoFactor);
  const [loginPassword, setLoginPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = loginPassword.length > 0 && code.length === 6;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const result = await disableTwoFactor({ code, loginPassword });
    setBusy(false);
    if (result.ok) {
      toast.success(t("security.2fa.disabledToast"));
      onClose();
    } else setError(localizeError(lang, result.error));
  };

  return (
    <SheetFrame title={t("security.2fa.title")} description={t("security.2fa.enabledDesc")} onClose={onClose}>
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          {t("security.2fa.enabledTitle")}
        </p>
        <PasswordField label={t("security.loginPassword")} value={loginPassword} onChange={setLoginPassword} autoComplete="current-password" testId="2fa-password" />
        <CodeField label={t("security.2fa.code")} value={code} onChange={setCode} testId="2fa-code" />
        <FormError message={error} testId="2fa-error" />
        <SubmitButton busy={busy} disabled={!ready} label={t("security.2fa.disable")} testId="2fa-disable" danger />
      </form>
    </SheetFrame>
  );
}
