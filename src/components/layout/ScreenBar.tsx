"use client";

import { ChevronLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Props {
  title: string;
  onBack: () => void;
  /** Right slot; an equal-width spacer by default so the title stays centred. */
  right?: React.ReactNode;
}

/** White sticky bar: back chevron, centred title, hairline bottom border. */
export function ScreenBar({ title, onBack, right }: Props) {
  const { t } = useT();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={t("common.back")}
        data-testid="screen-back"
        className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-800 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900"
      >
        <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
      </button>
      <h1 className="min-w-0 flex-1 truncate px-2 text-center text-base font-bold text-gray-900">{title}</h1>
      <div className="-mr-2.5 flex h-11 w-11 shrink-0 items-center justify-center">{right}</div>
    </header>
  );
}
