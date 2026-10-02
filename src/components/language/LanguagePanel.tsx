"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ScreenBar } from "@/components/layout/ScreenBar";
import { toast } from "@/components/ui/Toast";
import { translate, useT } from "@/lib/i18n";
import { searchLanguages, type LanguageOption } from "@/lib/languages";
import { useAppStore } from "@/lib/store";

interface Props {
  onBack: () => void;
  /** Called after a choice is confirmed. */
  onDone: () => void;
}

/** Search, pick, confirm. Only languages the app is translated into can be chosen. */
export function LanguagePanel({ onBack, onDone }: Props) {
  const { t, lang } = useT();
  const setActiveLanguage = useAppStore((s) => s.setActiveLanguage);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(lang);
  const rows = useMemo(() => searchLanguages(query), [query]);

  const choose = (option: LanguageOption) => {
    if (option.app) setPicked(option.app);
    else toast.info(t("language.unavailable", { name: option.english }));
  };

  const confirm = () => {
    if (picked !== lang) {
      setActiveLanguage(picked);
      toast.success(translate(picked, "language.applied"));
    }
    onDone();
  };

  return (
    <>
      <ScreenBar title={t("language.title")} onBack={onBack} />
      <div className="px-5 pt-4">
        <h2 className="text-2xl font-black tracking-tight text-gray-900">{t("language.heading")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">{t("language.hint")}</p>
      </div>

      <label className="mx-5 mt-4 flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 transition-colors focus-within:border-black">
        <Search className="h-[18px] w-[18px] shrink-0 text-gray-400" strokeWidth={1.75} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("language.searchPlaceholder")}
          aria-label={t("language.searchLabel")}
          autoComplete="off"
          enterKeyHint="search"
          data-testid="lang-search"
          className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-fg-muted"
        />
      </label>

      <ul role="radiogroup" aria-label={t("language.heading")} data-testid="lang-list" className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
        {rows.length === 0 && <li className="px-5 py-8 text-center text-sm text-fg-muted">{t("language.noResults")}</li>}
        {rows.map((option) => {
          const selected = option.app === picked;
          return (
            <li key={option.code} className={selected ? "px-4" : undefined}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={!option.app}
                onClick={() => choose(option)}
                data-testid={`lang-row-${option.code}`}
                className={`flex w-full items-center justify-between gap-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900 ${
                  selected
                    ? "rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    : "min-h-12 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-50"
                }`}
              >
                <span className={`text-sm ${selected ? "font-semibold text-gray-900" : option.app ? "font-medium text-gray-700" : "font-medium text-fg-muted"}`}>{option.native}</span>
                {selected ? (
                  <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-900">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-900" />
                  </span>
                ) : !option.app ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">{t("language.soon")}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-100 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <button
          type="button"
          onClick={confirm}
          data-testid="lang-confirm"
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#2B2B2B] py-3.5 font-semibold text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
        >
          <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          {t("language.confirm")}
        </button>
      </div>
    </>
  );
}
