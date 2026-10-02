"use client";

import { useState } from "react";
import { CodeField, FormError, PasswordField } from "@/components/security/Fields";
import { localizeError } from "@/components/security/errors";
import { SheetFrame, SubmitButton, type SheetProps } from "@/components/security/SheetFrame";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";
import { selectHasPaymentPassword, useAppStore } from "@/lib/store";

export function TransactionPasswordSheet({ open, onClose }: SheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} keyboardAware>
      {open && <Body onClose={onClose} />}
    </BottomSheet>
  );
}

type Mode = "change" | "remove";

function Body({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const hasPin = useAppStore(selectHasPaymentPassword);
  const setPaymentPassword = useAppStore((s) => s.setPaymentPassword);
  const removePaymentPassword = useAppStore((s) => s.removePaymentPassword);
  const [mode, setMode] = useState<Mode>("change");
  const [loginPassword, setLoginPassword] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removing = hasPin && mode === "remove";
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = removing
    ? loginPassword.length > 0 && current.length === 6
    : loginPassword.length > 0 && next.length === 6 && confirm.length === 6 && !mismatch && (!hasPin || current.length === 6);

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const result = removing
      ? await removePaymentPassword({ loginPassword, current })
      : await setPaymentPassword({ loginPassword, next, ...(hasPin ? { current } : {}) });
    setBusy(false);
    if (result.ok) {
      toast.success(t(removing ? "security.tx.removeToast" : hasPin ? "security.tx.changeToast" : "security.tx.setToast"));
      onClose();
    } else setError(localizeError(lang, result.error));
  };

  const switchMode = (value: Mode) => {
    setMode(value);
    setError(null);
  };

  return (
    <SheetFrame title={t("security.tx.title")} description={t(hasPin ? "security.tx.manageDesc" : "security.tx.setDesc")} onClose={onClose}>
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {hasPin && (
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            {(["change", "remove"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                data-testid={`tx-tab-${value}`}
                className={`min-h-11 rounded-lg text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gray-900 ${mode === value ? "bg-white text-gray-900 shadow-sm" : "text-fg-muted"}`}
              >
                {t(value === "change" ? "security.tx.tabChange" : "security.tx.tabRemove")}
              </button>
            ))}
          </div>
        )}
        <PasswordField label={t("security.loginPassword")} value={loginPassword} onChange={setLoginPassword} autoComplete="current-password" testId="tx-login" />
        {hasPin && <CodeField masked label={t("security.tx.current")} value={current} onChange={setCurrent} testId="tx-current" />}
        {removing ? (
          <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">{t("security.tx.removeNote")}</p>
        ) : (
          <>
            <CodeField masked label={t("security.tx.new")} value={next} onChange={setNext} testId="tx-new" />
            <CodeField masked label={t("security.tx.confirm")} value={confirm} onChange={setConfirm} error={mismatch ? t("security.tx.mismatch") : null} testId="tx-confirm" />
          </>
        )}
        <FormError message={error} testId="tx-error" />
        <SubmitButton
          busy={busy}
          disabled={!ready}
          label={t(removing ? "security.tx.remove" : hasPin ? "security.tx.change" : "security.tx.set")}
          testId="tx-submit"
          danger={removing}
        />
      </form>
    </SheetFrame>
  );
}
