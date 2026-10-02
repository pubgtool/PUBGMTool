"use client";

import Link from "next/link";
import { ChevronRight, FileText, IdCard, Info, Settings, Users, type LucideIcon } from "lucide-react";
import { type MessageKey, useT } from "@/lib/i18n";
import { kycBadge, type KycBadgeTone } from "@/lib/kyc";
import { useAppStore } from "@/lib/store";

const ROW =
  "flex min-h-14 w-full items-center gap-3 px-4 text-left outline-none transition-colors active:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900";

const KYC_KEY = {
  none: "kyc.unverified",
  pending: "kyc.pending",
  verified: "kyc.verified",
  rejected: "kyc.rejected",
} as const satisfies Record<KycBadgeTone, MessageKey>;

const KYC_STYLE: Record<KycBadgeTone, string> = {
  none: "bg-gray-100 text-fg-muted",
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

function RowBody({ Icon, label, badge }: { Icon: LucideIcon; label: string; badge?: { text: string; className: string; testId: string } }) {
  return (
    <>
      <Icon className="h-5 w-5 shrink-0 text-gray-700" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-gray-900">{label}</span>
      {badge && (
        <span data-testid={badge.testId} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
          {badge.text}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
    </>
  );
}

/** One grouped list: settings, team, identity check, about, terms. */
export function CoreFunctions() {
  const { t } = useT();
  const user = useAppStore((s) => s.user);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const openKycModal = useAppStore((s) => s.openKycModal);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const badge = kycBadge(user);

  const onKyc = () => {
    if (user.isGuest) openAuthModal("login", "Sign in to verify your identity");
    else openKycModal();
  };

  return (
    <section aria-labelledby="core-functions-title">
      <h2 id="core-functions-title" className="mb-3 text-base font-bold text-gray-900">
        {t("core.title")}
      </h2>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <li>
          <button type="button" onClick={() => setActiveTab("settings")} data-testid="core-settings" className={ROW}>
            <RowBody Icon={Settings} label={t("core.settings")} />
          </button>
        </li>
        <li>
          <button type="button" onClick={() => setActiveTab("team")} data-testid="core-team" className={ROW}>
            <RowBody Icon={Users} label={t("core.team")} />
          </button>
        </li>
        <li>
          <button type="button" onClick={onKyc} data-testid="profile-kyc" className={ROW}>
            <RowBody
              Icon={IdCard}
              label={t("core.kyc")}
              badge={{ text: t(KYC_KEY[badge.tone], { n: user.kycTier }), className: KYC_STYLE[badge.tone], testId: "kyc-status" }}
            />
          </button>
        </li>
        <li>
          <button type="button" onClick={() => setActiveTab("about")} data-testid="core-about" className={ROW}>
            <RowBody Icon={Info} label={t("core.about")} />
          </button>
        </li>
        <li>
          <Link href="/legal/terms" data-testid="core-terms" className={ROW}>
            <RowBody Icon={FileText} label={t("core.terms")} />
          </Link>
        </li>
      </ul>
    </section>
  );
}
