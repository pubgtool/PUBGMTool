"use client";

import {
  AuthHeading,
  AuthTopBar,
  DemoNote,
  OUTLINE_BUTTON,
  PRIMARY_BUTTON,
  SCREEN,
  TEXT_BUTTON,
} from "@/components/auth/AuthChrome";
import { AuthBackdrop, AuthHero } from "@/components/auth/AuthHero";
import { LegalFooter } from "@/components/auth/LegalFooter";
import { SocialAuthRow } from "@/components/auth/SocialAuthRow";
import { PROTOCOL } from "@/config/protocol";
import { useT } from "@/lib/i18n";
import type { AuthTab } from "@/types/domain";

interface Props {
  onNavigate: (tab: AuthTab) => void;
  onGuest: () => void;
}

export function WelcomeGatewayView({ onNavigate, onGuest }: Props) {
  const { t } = useT();
  return (
    <div data-testid="welcome-view" className={SCREEN}>
      <AuthBackdrop className="inset-0" />
      <AuthTopBar />

      <div className="relative flex flex-1 flex-col items-center justify-center py-8 text-center">
        <AuthHero size="lg" />
        <AuthHeading className="mt-7 text-3xl">{PROTOCOL.name}</AuthHeading>
        <p className="mt-2 text-balance px-6 text-sm font-medium text-gray-700">{t("auth.welcome.tagline")}</p>
      </div>

      <div className="relative">
        <button type="button" data-testid="welcome-signin" onClick={() => onNavigate("login")} className={`${PRIMARY_BUTTON} !py-4`}>
          {t("auth.welcome.signIn")}
        </button>
        <button
          type="button"
          data-testid="welcome-register"
          onClick={() => onNavigate("register")}
          className={`${OUTLINE_BUTTON} mt-3 !py-4`}
        >
          {t("auth.welcome.register")}
        </button>

        <SocialAuthRow providers={["telegram", "google"]} />

        <div className="mt-2 flex justify-center">
          <button type="button" data-testid="welcome-guest" onClick={onGuest} className={TEXT_BUTTON}>
            {t("auth.welcome.guest")}
          </button>
        </div>

        <DemoNote className="mt-1" />
        <LegalFooter />
      </div>
    </div>
  );
}
