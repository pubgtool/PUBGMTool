"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { getCountries, searchCountries } from "@/lib/kyc";

interface Props {
  id: string;
  value: string;
  onChange: (code: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
}

/** Searchable country / region list, rendered inline so it scrolls with the sheet. */
export function CountryPicker({ id, value, onChange, onBlur, invalid = false, describedBy }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const options = useMemo(() => searchCountries(query), [query]);
  const selected = useMemo(() => getCountries().find((c) => c.code === value), [value]);
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setQuery("");
    if (returnFocus) trigger.current?.focus();
  };

  const choose = (code: string) => {
    onChange(code);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
        onBlur?.();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onBlur]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listId]);

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(Math.min(options.length - 1, activeIndex + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(0, activeIndex - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option.code);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={root}>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        onClick={() => {
          setOpen((o) => !o);
          setActive(0);
        }}
        onBlur={() => {
          if (!open) onBlur?.();
        }}
        className={`flex w-full items-center gap-3 rounded-2xl border bg-canvas px-4 py-3.5 text-left text-base text-fg outline-none transition-colors focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/15 ${
          invalid ? "border-rose-500/50" : open ? "border-amber-400" : "border-gray-200"
        }`}
      >
        {selected ? (
          <>
            <span className="text-xl leading-none" aria-hidden>
              {selected.flag}
            </span>
            <span data-testid="country-selected" className="min-w-0 flex-1 truncate">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-fg-muted">Select country or region</span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div data-escape-block className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-canvas shadow-card">
          <div className="flex items-center gap-2 border-b border-gray-200 px-3.5">
            <Search className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
            <input
              ref={search}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={options.length ? `${listId}-opt-${activeIndex}` : undefined}
              aria-label="Search countries"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Search countries"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-fg outline-none placeholder:text-fg-muted"
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Countries and regions" className="max-h-56 overflow-y-auto overscroll-contain py-1">
            {options.length === 0 && <li className="px-4 py-4 text-center text-sm text-fg-secondary">No matching country</li>}
            {options.map((country, i) => (
              <li
                key={country.code}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={country.code === value}
                data-testid={`country-option-${country.code}`}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(country.code)}
                className={`flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${i === activeIndex ? "bg-amber-400/10" : ""}`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {country.flag}
                </span>
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                <span className="font-mono text-[11px] text-fg-muted">{country.code}</span>
                {country.code === value && <Check className="h-4 w-4 shrink-0 text-amber-700" aria-label="selected" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
