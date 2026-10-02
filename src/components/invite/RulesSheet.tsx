"use client";

import { Users, X } from "lucide-react";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { BTN_PRIMARY, EYEBROW } from "@/components/ui/styles";
import { REFERRAL } from "@/config/protocol";
import { formatAmount } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

export function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const user = useAppStore((s) => s.user);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div data-testid="invite-rules-sheet" className="px-5 pb-6">
        <div className="flex items-start justify-between gap-3">
          <SheetTitle className="min-w-0 text-xl font-black tracking-tight text-gray-900">{t("invite.rules.title")}</SheetTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("invite.rules.close")}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 outline-none transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <SheetDescription className="mt-1 text-sm leading-relaxed text-fg-secondary">{t("invite.rules.intro")}</SheetDescription>

        <h3 className={`mt-5 ${EYEBROW}`}>{t("invite.rules.levels")}</h3>
        <ul className="mt-2 divide-y divide-gray-100 rounded-2xl border border-slate-100">
          {REFERRAL.tiers.map((tier) => (
            <li key={tier.level} className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] text-gray-700">{t("invite.rules.level", { n: tier.level })}</span>
              <span className="font-mono text-base font-bold tabular-nums text-amber-700">{tier.ratePct}%</span>
            </li>
          ))}
        </ul>

        {user.isGuest ? (
          <p className="mt-4 text-sm text-fg-secondary">{t("invite.rules.signIn")}</p>
        ) : (
          <dl className="mt-4 grid grid-cols-2 divide-x divide-gray-100 rounded-2xl border border-slate-100">
            <div className="px-4 py-3">
              <dt className="text-xs text-fg-muted">{t("invite.rules.invites")}</dt>
              <dd data-testid="invite-rules-invites" className="mt-1 font-mono text-xl font-black tabular-nums text-gray-900">
                {user.referral.invites}
              </dd>
            </div>
            <div className="min-w-0 px-4 py-3">
              <dt className="text-xs text-fg-muted">{t("invite.rules.commission")}</dt>
              <dd className="mt-1 flex items-baseline gap-1 text-emerald-700">
                <span data-testid="invite-rules-commission" className="min-w-0 truncate font-mono text-xl font-black tabular-nums">
                  {formatAmount(user.referral.commissionEarned)}
                </span>
                <span className="shrink-0 text-xs font-semibold">USDT</span>
              </dd>
            </div>
          </dl>
        )}

        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium leading-relaxed text-amber-900">{t("invite.rules.demo")}</p>

        <button
          type="button"
          onClick={() => {
            onClose();
            setActiveTab("team");
          }}
          data-testid="invite-rules-team"
          className={`${BTN_PRIMARY} mt-4`}
        >
          <Users className="h-5 w-5" aria-hidden />
          {t("invite.rules.team")}
        </button>
      </div>
    </BottomSheet>
  );
}
