"use client";

import { UserPlus } from "lucide-react";
import { GuestGate } from "@/components/auth/GuestGate";
import { SubScreenHeader } from "@/components/layout/SubScreenHeader";
import { DemoTools } from "@/components/ui/DemoTools";
import { GoldGlow } from "@/components/ui/GoldGlow";
import { toast } from "@/components/ui/Toast";
import { BTN_GOLD, CARD, VIP_PANEL } from "@/components/ui/styles";
import { REFERRAL } from "@/config/protocol";
import { formatAmount } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

export function TeamView() {
  const { t } = useT();
  const user = useAppStore((s) => s.user);
  const simulateReferral = useAppStore((s) => s.simulateReferral);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const topRate = REFERRAL.tiers[0].ratePct;

  if (user.isGuest) {
    return (
      <div className="flex flex-1 flex-col">
        <SubScreenHeader title={t("team.title")} />
        <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
          <GuestGate compact title={t("team.guestTitle")} text={t("team.guestText", { n: topRate })} reason="Sign in to get your invite code" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <SubScreenHeader title={t("team.title")} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
        <section aria-label={t("team.title")} className={`${VIP_PANEL} p-5`}>
          <GoldGlow />
          <div className="relative">
            <p className="text-xl font-black leading-tight tracking-tight">{t("team.headline", { n: topRate })}</p>
            <p className="mt-1 text-sm text-amber-100/75">{t("team.sub")}</p>
            <button type="button" onClick={() => setActiveTab("invite")} data-testid="team-invite" className={`${BTN_GOLD} mt-4`}>
              <UserPlus className="h-5 w-5" aria-hidden />
              {t("team.inviteCta")}
            </button>
          </div>
        </section>

        <section aria-label={t("team.levels")} className={`${CARD} p-4`}>
          <h2 className="text-base font-bold text-gray-900">{t("team.levels")}</h2>
          <ul className="mt-2 divide-y divide-gray-100">
            {REFERRAL.tiers.map((tier) => (
              <li key={tier.level} className="flex items-center justify-between py-3">
                <span className="text-[15px] text-gray-700">{t("team.level", { n: tier.level })}</span>
                <span className="font-mono text-base font-bold tabular-nums text-amber-700">{tier.ratePct}%</span>
              </li>
            ))}
          </ul>
        </section>

        <dl className={`${CARD} grid grid-cols-2 divide-x divide-gray-100`} aria-label={t("team.title")}>
          <div className="px-4 py-4">
            <dt className="text-xs text-fg-muted">{t("team.invites")}</dt>
            <dd data-testid="referral-invites" className="mt-1 font-mono text-2xl font-black tabular-nums text-gray-900">
              {user.referral.invites}
            </dd>
          </div>
          <div className="min-w-0 px-4 py-4">
            <dt className="text-xs text-fg-muted">{t("team.commission")}</dt>
            <dd className="mt-1 flex items-baseline gap-1 text-emerald-700">
              <span data-testid="referral-commission" className="min-w-0 truncate font-mono text-2xl font-black tabular-nums">
                {formatAmount(user.referral.commissionEarned)}
              </span>
              <span className="shrink-0 text-xs font-semibold">USDT</span>
            </dd>
          </div>
        </dl>

        <DemoTools testId="referral-demo-tools">
          <p className="text-xs text-fg-secondary">{t("team.demoHint")}</p>
          <button
            type="button"
            onClick={() => {
              const result = simulateReferral();
              if (!result.ok) toast.error(result.error);
              else toast.success(t("team.credited"));
            }}
            className="mt-2.5 w-full rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            {t("team.demoButton")}
          </button>
        </DemoTools>
      </main>
    </div>
  );
}
