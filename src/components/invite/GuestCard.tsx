"use client";

import { Users } from "lucide-react";
import { BTN_OUTLINE, BTN_PRIMARY } from "@/components/ui/styles";
import { REFERRAL } from "@/config/protocol";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

/** Guests have no invitation code yet, so the card asks them to sign in instead of showing a QR. */
export function GuestCard() {
  const { t } = useT();
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const reason = t("invite.guest.reason");
  return (
    <section data-testid="invite-guest-prompt" aria-label={t("invite.guest.title")} className="relative z-10 mx-4 my-2 rounded-[32px] bg-white p-6 text-center shadow-2xl">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-100 bg-gray-50 text-gray-900">
        <Users className="h-8 w-8" strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-black tracking-tight text-gray-900">{t("invite.guest.title")}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{t("invite.guest.text", { n: REFERRAL.tiers[0].ratePct })}</p>
      <div className="mt-5 flex flex-col gap-2.5">
        <button type="button" onClick={() => openAuthModal("register", reason)} data-testid="invite-guest-register" className={BTN_PRIMARY}>
          {t("common.createAccount")}
        </button>
        <button type="button" onClick={() => openAuthModal("login", reason)} data-testid="invite-guest-login" className={BTN_OUTLINE}>
          {t("common.signIn")}
        </button>
      </div>
    </section>
  );
}
