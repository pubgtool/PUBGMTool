"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { LanguageSelectModal } from "@/components/language/LanguageSelectModal";
import { useT } from "@/lib/i18n";

interface Props {
  /** "pill": bordered chip with globe and code (Home). "icon": bare outline globe with the code (auth screens). */
  variant?: "pill" | "icon";
  className?: string;
}

/** Shows the active language and opens the language picker. */
export function LanguageButton({ variant = "pill", className = "" }: Props) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const base =
    "flex h-11 shrink-0 items-center gap-1.5 rounded-full text-sm font-semibold text-gray-800 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900";
  const look = variant === "pill" ? "border border-gray-200 bg-white px-3 shadow-sm" : "px-2";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("language.change")} data-testid="language-button" className={`${base} ${look} ${className}`}>
        <Globe className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        <span className="uppercase tabular-nums">{lang}</span>
      </button>
      <LanguageSelectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
