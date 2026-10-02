"use client";

import { LanguageButton } from "@/components/language/LanguageButton";
import { BellButton } from "@/components/ui/BellButton";
import { NexusMark } from "@/components/ui/NexusMark";
import { PROTOCOL } from "@/config/protocol";
import { useT } from "@/lib/i18n";

export function TopBar() {
  const { t } = useT();
  return (
    <header data-testid="home-topbar" className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <NexusMark className="h-11 w-11 shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-black leading-tight tracking-tight text-gray-900">{PROTOCOL.shortName}</h1>
          <span
            data-testid="home-network"
            title={t("home.network")}
            className="mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold leading-4 text-amber-900"
          >
            <span aria-hidden className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="min-w-0 truncate">{PROTOCOL.network.name}</span>
            <span className="sr-only">· {t("home.network")}</span>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div data-testid="home-lang" className="flex">
          <LanguageButton variant="pill" />
        </div>
        <BellButton />
      </div>
    </header>
  );
}
