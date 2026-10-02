"use client";

import { useState } from "react";
import { ChevronRight, Key, Mail, QrCode, UserKey, type LucideIcon } from "lucide-react";
import { GuestGate } from "@/components/auth/GuestGate";
import { ScreenBar } from "@/components/layout/ScreenBar";
import { AuthenticatorSheet } from "@/components/security/AuthenticatorSheet";
import { ChangeEmailSheet } from "@/components/security/ChangeEmailSheet";
import { ChangePasswordSheet } from "@/components/security/ChangePasswordSheet";
import { TransactionPasswordSheet } from "@/components/security/TransactionPasswordSheet";
import { type MessageKey, useT } from "@/lib/i18n";
import { selectHasPaymentPassword, selectHasTwoFactor, useAppStore } from "@/lib/store";

type SheetId = "password" | "authenticator" | "transaction" | "email";

const ROWS: ReadonlyArray<{ id: SheetId; label: MessageKey; Icon: LucideIcon }> = [
  { id: "password", label: "security.rowPassword", Icon: UserKey },
  { id: "authenticator", label: "security.rowAuthenticator", Icon: QrCode },
  { id: "transaction", label: "security.rowTransaction", Icon: Key },
  { id: "email", label: "security.rowEmail", Icon: Mail },
];

export function SecurityView() {
  const { t } = useT();
  const user = useAppStore((s) => s.user);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const twoFactor = useAppStore(selectHasTwoFactor);
  const paymentPassword = useAppStore(selectHasPaymentPassword);
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const close = () => setSheet(null);

  const status: Partial<Record<SheetId, { text: string; on: boolean }>> = {
    authenticator: { text: t(twoFactor ? "security.on" : "security.off"), on: twoFactor },
    transaction: { text: t(paymentPassword ? "security.set" : "security.notSet"), on: paymentPassword },
  };

  return (
    <div className="flex flex-1 flex-col" data-testid="security-view">
      <ScreenBar title={t("security.title")} onBack={() => setActiveTab("settings")} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
        {user.isGuest ? (
          <GuestGate compact title={t("security.guestTitle")} text={t("security.guestText")} reason="Sign in to manage your account security" />
        ) : (
          <>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              {ROWS.map(({ id, label, Icon }) => {
                const badge = status[id];
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setSheet(id)}
                      data-testid={`sec-row-${id}`}
                      className="flex min-h-[58px] w-full items-center gap-3 px-4 text-left outline-none transition-colors active:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} aria-hidden />
                      <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900">{t(label)}</span>
                      {badge && (
                        <span
                          data-testid={`sec-status-${id}`}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.on ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-fg-muted"}`}
                        >
                          {badge.text}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="px-2 text-xs leading-relaxed text-fg-muted">{t("security.demoNote")}</p>
          </>
        )}
      </main>

      <ChangePasswordSheet open={sheet === "password"} onClose={close} />
      <AuthenticatorSheet open={sheet === "authenticator"} onClose={close} />
      <TransactionPasswordSheet open={sheet === "transaction"} onClose={close} />
      <ChangeEmailSheet open={sheet === "email"} onClose={close} />
    </div>
  );
}
