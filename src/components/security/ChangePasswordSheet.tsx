"use client";

import { useState } from "react";
import { PasswordField, FormError } from "@/components/security/Fields";
import { localizeError } from "@/components/security/errors";
import { SheetFrame, SubmitButton, type SheetProps } from "@/components/security/SheetFrame";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { passwordStrength } from "@/lib/credentials";
import { useT, type MessageKey } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

const STRENGTH_KEY: Record<string, MessageKey> = {
  Weak: "security.strength.weak",
  Fair: "security.strength.fair",
  Good: "security.strength.good",
  Strong: "security.strength.strong",
};
const STRENGTH_COLOR = ["", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"] as const;

export function ChangePasswordSheet({ open, onClose }: SheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} keyboardAware>
      {open && <Body onClose={onClose} />}
    </BottomSheet>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const changePassword = useAppStore((s) => s.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = current.length > 0 && next.length > 0 && confirm.length > 0 && !mismatch;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const result = await changePassword({ current, next });
    setBusy(false);
    if (result.ok) {
      toast.success(t("security.pw.done"));
      onClose();
    } else setError(localizeError(lang, result.error));
  };

  return (
    <SheetFrame title={t("security.pw.title")} description={t("security.pw.desc")} onClose={onClose}>
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <PasswordField label={t("security.pw.current")} value={current} onChange={setCurrent} autoComplete="current-password" autoFocus testId="pw-current" />
        <div>
          <PasswordField label={t("security.pw.new")} value={next} onChange={setNext} autoComplete="new-password" testId="pw-new" />
          {strength.score > 0 && (
            <div className="mt-2 flex items-center gap-2" data-testid="pw-strength">
              <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
                {[1, 2, 3, 4].map((step) => (
                  <span key={step} className={`h-1.5 rounded-full ${step <= strength.score ? STRENGTH_COLOR[strength.score] : "bg-gray-200"}`} />
                ))}
              </div>
              <span className="text-xs font-semibold text-gray-700">{t(STRENGTH_KEY[strength.label] ?? "security.strength.weak")}</span>
            </div>
          )}
        </div>
        <PasswordField
          label={t("security.pw.confirm")}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={mismatch ? t("security.pw.mismatch") : null}
          testId="pw-confirm"
        />
        <FormError message={error} testId="pw-error" />
        <SubmitButton busy={busy} disabled={!ready} label={t("security.pw.submit")} testId="pw-submit" />
      </form>
    </SheetFrame>
  );
}
