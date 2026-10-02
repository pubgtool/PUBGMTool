"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ReceiptText } from "lucide-react";
import { GuestCard } from "@/components/invite/GuestCard";
import { InviteBackdrop } from "@/components/invite/InviteBackdrop";
import { QrCard } from "@/components/invite/QrCard";
import { RulesSheet } from "@/components/invite/RulesSheet";
import { ShareDock } from "@/components/invite/ShareDock";
import { buildQr } from "@/components/invite/qr";
import { useT } from "@/lib/i18n";
import { referralLink } from "@/lib/identity";
import { useAppStore } from "@/lib/store";

/** `shadow-dock` resolves to a white shadow (the "dock" colour token collides with the shadow token), which glows on black. */
const DOCK_SHADOW_FIX = "nav.shadow-dock{box-shadow:none}";

const BAR_BUTTON =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-white";

export function InviteView() {
  const { t } = useT();
  const guest = useAppStore((s) => s.user.isGuest);
  const code = useAppStore((s) => s.user.referralCode);
  const backTab = useAppStore((s) => s.backTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const [rulesOpen, setRulesOpen] = useState(false);

  const link = referralLink(code);
  const model = useMemo(() => (guest ? null : buildQr(link)), [guest, link]);

  return (
    // The dark layer runs through the column's bottom padding so no light strip shows above the dock.
    <main data-testid="invite-view" className="relative -mb-28 flex flex-1 flex-col overflow-hidden bg-black pb-28">
      <style>{DOCK_SHADOW_FIX}</style>
      <InviteBackdrop />

      <header className="relative z-10 flex items-center justify-between px-2 pb-1 pt-3">
        <button type="button" onClick={() => setActiveTab(backTab ?? "profile")} aria-label={t("common.back")} data-testid="invite-back" className={BAR_BUTTON}>
          <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate px-2 text-center text-lg font-bold text-white">{t("invite.title")}</h1>
        <button type="button" onClick={() => setRulesOpen(true)} aria-label={t("invite.rulesOpen")} data-testid="invite-rules" className={BAR_BUTTON}>
          <ReceiptText className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <p className="relative z-10 mx-8 mb-4 mt-3 text-center text-[15px] font-semibold leading-snug text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">{t("invite.pitch")}</p>

      {model ? (
        <>
          <QrCard model={model} code={code} link={link} />
          <ShareDock model={model} code={code} link={link} />
        </>
      ) : (
        <GuestCard />
      )}

      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}
