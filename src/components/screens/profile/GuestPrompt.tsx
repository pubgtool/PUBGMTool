"use client";

import { BTN_OUTLINE, BTN_PRIMARY, CARD } from "@/components/ui/styles";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

export function GuestPrompt() {
  const { t } = useT();
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  return (
    <section aria-label={t("profile.guest")} className={`${CARD} p-4`}>
      <p className="text-sm text-fg-secondary">{t("profile.guestHint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => openAuthModal("login", "Sign in to your account")} data-testid="profile-signin" className={BTN_OUTLINE}>
          {t("common.signIn")}
        </button>
        <button
          type="button"
          onClick={() => openAuthModal("register", "Create an account to get your UID and trial voucher")}
          data-testid="profile-register"
          className={BTN_PRIMARY}
        >
          {t("common.createAccount")}
        </button>
      </div>
    </section>
  );
}
