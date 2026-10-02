"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, Plus, Users, Wallet, type LucideIcon } from "lucide-react";
import { GuideSheet } from "@/components/home/GuideSheet";
import { CARD } from "@/components/ui/styles";
import { type MessageKey, useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

type ActionId = "recharge" | "withdraw" | "invite" | "guide";

const ACTIONS: ReadonlyArray<{ id: ActionId; label: MessageKey; Icon: LucideIcon }> = [
  { id: "recharge", label: "home.actions.recharge", Icon: Wallet },
  { id: "withdraw", label: "home.actions.withdraw", Icon: ArrowUpRight },
  { id: "invite", label: "home.actions.invite", Icon: Users },
  { id: "guide", label: "home.actions.guide", Icon: BookOpen },
];

export function ActionMatrix() {
  const { t } = useT();
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setWalletSection = useAppStore((s) => s.setWalletSection);
  const [guideOpen, setGuideOpen] = useState(false);

  const run = (id: ActionId) => {
    if (id === "recharge" || id === "withdraw") {
      setWalletSection(id === "recharge" ? "deposit" : "withdraw");
      setActiveTab("wallet");
    } else if (id === "invite") setActiveTab("invite");
    else setGuideOpen(true);
  };

  return (
    <>
      <section aria-label={t("home.actions.label")} data-testid="home-actions" className={`${CARD} grid grid-cols-4 gap-1 px-2 py-3.5`}>
        {ACTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => run(id)}
            data-testid={`action-${id}`}
            className="flex min-w-0 flex-col items-center gap-2 rounded-2xl py-1 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-900">
              <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
              {id === "recharge" && (
                <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                  <Plus className="h-3 w-3" strokeWidth={3.5} />
                </span>
              )}
            </span>
            <span className="max-w-full text-center text-xs font-semibold leading-tight text-gray-800">{t(label)}</span>
          </button>
        ))}
      </section>
      <GuideSheet open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
