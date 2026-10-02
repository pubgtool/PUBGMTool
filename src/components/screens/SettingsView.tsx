"use client";

import { Bell, ChevronRight, Globe, ShieldCheck } from "lucide-react";
import { SubScreenHeader } from "@/components/layout/SubScreenHeader";
import { BTN_OUTLINE, BTN_PRIMARY, CARD } from "@/components/ui/styles";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { useChatStore } from "@/lib/chat";
import { useT } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { useAppStore } from "@/lib/store";

const ROW =
  "flex min-h-14 w-full items-center gap-3 px-4 text-left outline-none transition-colors active:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900";

export function SettingsView() {
  const { t, lang } = useT();
  const user = useAppStore((s) => s.user);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setSecurityPreference = useAppStore((s) => s.setSecurityPreference);
  const logout = useAppStore((s) => s.logout);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const push = user.security.pushAlerts;

  const onLogout = () => {
    useChatStore.getState().reset();
    logout();
    toast.success(t("settings.loggedOut"));
  };

  return (
    <div className="flex flex-1 flex-col">
      <SubScreenHeader title={t("settings.title")} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <li>
            <button type="button" onClick={() => setActiveTab("language")} data-testid="settings-language" className={ROW}>
              <Globe className="h-5 w-5 shrink-0 text-gray-700" strokeWidth={1.75} aria-hidden />
              <span className="min-w-0 flex-1 text-[15px] font-medium text-gray-900">{t("settings.language")}</span>
              <span data-testid="settings-language-value" className="shrink-0 text-sm text-fg-muted">
                {languageName(lang)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setActiveTab("security")} data-testid="settings-security" className={ROW}>
              <ShieldCheck className="h-5 w-5 shrink-0 text-gray-700" strokeWidth={1.75} aria-hidden />
              <span className="min-w-0 flex-1 text-[15px] font-medium text-gray-900">{t("settings.security")}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            </button>
          </li>
          <li className="flex min-h-14 items-center gap-3 px-4 py-2">
            <Bell className="h-5 w-5 shrink-0 text-gray-700" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-gray-900">{t("settings.push")}</span>
              <span data-testid="status-pushAlerts" className={`block text-xs ${push && !user.isGuest ? "text-emerald-700" : "text-fg-muted"}`}>
                {t(push && !user.isGuest ? "settings.pushOn" : "settings.pushOff")}
              </span>
            </span>
            <Switch
              checked={push && !user.isGuest}
              disabled={user.isGuest}
              label={t("settings.push")}
              onChange={(next) => {
                const result = setSecurityPreference("pushAlerts", next);
                if (result.ok) toast.success(t("settings.saved"));
                else toast.error(result.error);
              }}
            />
          </li>
        </ul>
        {user.isGuest && <p className="px-2 text-xs text-fg-muted">{t("settings.guestNote")}</p>}

        <section aria-label={t("settings.account")} className={`${CARD} p-4`}>
          {user.isGuest ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => openAuthModal("login", "Sign in to your account")} className={BTN_OUTLINE}>
                {t("common.signIn")}
              </button>
              <button type="button" onClick={() => openAuthModal("register", "Create an account to get your UID and trial voucher")} className={BTN_PRIMARY}>
                {t("common.createAccount")}
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-bold text-gray-900">{t("settings.account")}</h2>
              <p data-testid="settings-contact" className="mt-1 truncate text-sm text-fg-secondary">
                {user.email ?? user.phone ?? user.displayName}
              </p>
              <button
                type="button"
                onClick={onLogout}
                data-testid="logout"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-[15px] font-bold text-rose-600 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                {t("settings.logout")}
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
