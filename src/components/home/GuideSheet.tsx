"use client";

import { X } from "lucide-react";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { BTN_PRIMARY } from "@/components/ui/styles";
import { CYCLE_LABEL } from "@/config/nodes";
import { type MessageKey, useT } from "@/lib/i18n";

const STEPS: ReadonlyArray<{ title: MessageKey; text: MessageKey }> = [
  { title: "home.guide.step1.title", text: "home.guide.step1.text" },
  { title: "home.guide.step2.title", text: "home.guide.step2.text" },
  { title: "home.guide.step3.title", text: "home.guide.step3.text" },
  { title: "home.guide.step4.title", text: "home.guide.step4.text" },
];

export function GuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div data-testid="guide-sheet" className="px-5 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SheetTitle className="text-xl font-black tracking-tight text-gray-900">{t("home.guide.title")}</SheetTitle>
            <SheetDescription className="mt-1 text-sm text-fg-secondary">{t("home.guide.sub")}</SheetDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("home.guide.dismiss")}
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 outline-none transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <ol role="list" className="mt-5 space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3.5">
              <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[15px] font-bold leading-snug text-gray-900">{t(step.title)}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-fg-secondary">{t(step.text, { time: CYCLE_LABEL })}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium leading-relaxed text-amber-900">{t("home.guide.demo")}</p>

        <button type="button" onClick={onClose} className={`${BTN_PRIMARY} mt-4`}>
          {t("home.guide.close")}
        </button>
      </div>
    </BottomSheet>
  );
}
