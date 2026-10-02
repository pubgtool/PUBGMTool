"use client";

import { useId } from "react";
import { GoogleIcon, TelegramIcon, WalletIcon } from "@/components/auth/BrandIcons";
import { toast } from "@/components/ui/Toast";
import { type MessageKey, useT } from "@/lib/i18n";

const PROVIDERS = {
  wallet: { label: "auth.sso.wallet", Icon: WalletIcon },
  telegram: { label: "auth.sso.telegram", Icon: TelegramIcon },
  google: { label: "auth.sso.google", Icon: GoogleIcon },
} as const satisfies Record<string, { label: MessageKey; Icon: typeof WalletIcon }>;

export type SsoProvider = keyof typeof PROVIDERS;

/** "Or sign in with" divider and provider buttons. None are connected in this build, so each one says so. */
export function SocialAuthRow({ providers }: { providers: readonly SsoProvider[] }) {
  const { t } = useT();
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="mt-6">
      <div className="flex items-center gap-3 text-xs text-fg-muted">
        <span aria-hidden className="h-px flex-1 bg-gray-200" />
        <span id={labelId}>{t("auth.sso.divider")}</span>
        <span aria-hidden className="h-px flex-1 bg-gray-200" />
      </div>
      <div className={`mt-4 grid gap-2 ${providers.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
        {providers.map((id) => {
          const { label, Icon } = PROVIDERS[id];
          return (
            <button
              key={id}
              type="button"
              data-testid={`sso-${id}`}
              onClick={() => toast.info(t("auth.sso.unavailable", { provider: t(label) }))}
              className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-1.5 py-2.5 text-xs font-semibold text-gray-900 outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-black active:scale-95 motion-reduce:transition-none"
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{t(label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
