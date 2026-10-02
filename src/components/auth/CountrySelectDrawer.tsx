"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { searchCountries } from "@/lib/countries";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  /** ISO 3166-1 alpha-2 of the current choice. */
  value: string | null;
  onSelect: (code: string) => void;
  onClose: () => void;
}

/** Country and region picker. Sits above the auth screens and keeps clear of the on-screen keyboard. */
export function CountrySelectDrawer({ open, value, onSelect, onClose }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} keyboardAware elevated>
      <CountryPanel value={value} onSelect={onSelect} onClose={onClose} />
    </BottomSheet>
  );
}

function CountryPanel({ value, onSelect, onClose }: Omit<Props, "open">) {
  const { t, lang } = useT();
  const [query, setQuery] = useState("");
  const [tabCode, setTabCode] = useState(value);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => searchCountries(query, lang), [query, lang]);
  // One tab stop for the whole list: the last focused row, else the chosen one, else the first.
  const tabStop = rows.some((c) => c.code === tabCode) ? tabCode : rows[0]?.code;

  // A phone keyboard would cover half the list, so only devices with a precise pointer start in the search field.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && selected) list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
  }, []);

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
    const index = options.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (event.key === "ArrowDown") next = Math.min(options.length - 1, index + 1);
    else if (event.key === "ArrowUp") next = index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault();
    if (next < 0) searchRef.current?.focus();
    else options[next]?.focus();
  };

  return (
    <div data-testid="country-drawer" className="flex h-[76dvh] max-h-[calc(var(--sheet-max,100dvh)-1.75rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 pl-4 pr-2">
        <SheetTitle className="text-base font-bold text-gray-900">{t("auth.country.title")}</SheetTitle>
        <SheetDescription className="sr-only">{t("auth.country.description")}</SheetDescription>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("auth.close")}
          data-testid="country-close"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 outline-none transition hover:text-black focus-visible:ring-2 focus-visible:ring-black active:scale-95 motion-reduce:transition-none"
        >
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className="relative mx-4 my-3">
        <Search
          aria-hidden
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
        />
        <input
          ref={searchRef}
          type="search"
          data-testid="country-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              listRef.current?.querySelector<HTMLElement>('[role="option"][tabindex="0"]')?.focus();
            }
          }}
          placeholder={t("auth.country.search")}
          aria-label={t("auth.country.search")}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3.5 text-base text-gray-800 outline-none transition-colors placeholder:text-fg-muted focus:border-black sm:text-sm"
        />
      </div>

      <p role="status" className="sr-only">
        {query ? t("auth.country.count", { n: rows.length }) : ""}
      </p>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-fg-muted">{t("auth.country.empty")}</p>
      ) : (
        <div
          ref={listRef}
          role="listbox"
          aria-label={t("auth.country.title")}
          onKeyDown={onListKeyDown}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {rows.map((country) => {
            const selected = country.code === value;
            return (
              <button
                key={country.code}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={country.code === tabStop ? 0 : -1}
                data-testid={`country-row-${country.code}`}
                onClick={() => onSelect(country.code)}
                onFocus={() => setTabCode(country.code)}
                className="block w-full px-4 text-left outline-none transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black active:bg-gray-50"
              >
                <span className="flex min-h-12 items-center justify-between gap-3 border-b border-gray-100 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">{country.name}</span>
                    <span className="block font-mono text-xs text-fg-muted">{country.dial}</span>
                  </span>
                  {selected && <Check className="h-5 w-5 shrink-0 text-black" strokeWidth={2.5} aria-hidden />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
