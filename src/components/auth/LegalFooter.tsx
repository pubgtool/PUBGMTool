"use client";

import Link from "next/link";
import { COMPANY } from "@/config/protocol";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

const LINK =
  "inline-flex min-h-11 items-center rounded px-0.5 text-[11px] font-semibold text-gray-800 underline underline-offset-2 outline-none hover:text-black focus-visible:ring-2 focus-visible:ring-black";

/** Company lines render only when they are set; nothing here is invented. */
export function LegalFooter() {
  const { t } = useT();
  const closeAuthModal = useAppStore((s) => s.closeAuthModal);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <footer data-testid="legal-footer" className="mt-8 text-center">
      <p className="text-xs font-bold text-gray-900">{COMPANY.brand}</p>
      {COMPANY.legalName && <p className="mt-0.5 text-[11px] text-fg-secondary">{COMPANY.legalName}</p>}
      {COMPANY.registeredAddress && (
        <p className="mt-0.5 text-[10px] text-fg-muted">{t("auth.legal.address", { value: COMPANY.registeredAddress })}</p>
      )}
      {COMPANY.contactEmail && (
        <p className="mt-0.5 text-[10px] text-fg-muted">{t("auth.legal.contact", { value: COMPANY.contactEmail })}</p>
      )}
      <p className="mt-2 text-balance px-4 text-[10px] leading-relaxed text-fg-muted">{t("auth.legal.disclaimer")}</p>
      <nav aria-label={t("auth.legal.nav")} className="mt-1 flex flex-wrap justify-center gap-x-3">
        <Link href="/legal/terms" onClick={closeAuthModal} className={LINK}>
          {t("auth.legal.terms")}
        </Link>
        <Link href="/legal/privacy" onClick={closeAuthModal} className={LINK}>
          {t("auth.legal.privacy")}
        </Link>
        <Link href="/legal/risk" onClick={closeAuthModal} className={LINK}>
          {t("auth.legal.risk")}
        </Link>
        <button
          type="button"
          onClick={() => {
            closeAuthModal();
            setActiveTab("about");
          }}
          className={LINK}
        >
          {t("auth.legal.company")}
        </button>
      </nav>
    </footer>
  );
}
