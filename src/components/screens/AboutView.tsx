"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Lock, ScrollText, type LucideIcon } from "lucide-react";
import { SubScreenHeader } from "@/components/layout/SubScreenHeader";
import { NexusMark } from "@/components/ui/NexusMark";
import { CARD } from "@/components/ui/styles";
import { ADMIN, APP_VERSION, PROTOCOL } from "@/config/protocol";
import { type MessageKey, useT } from "@/lib/i18n";

const LINKS: ReadonlyArray<{ href: string; label: MessageKey; Icon: LucideIcon }> = [
  { href: "/legal/terms", label: "core.terms", Icon: FileText },
  { href: "/legal/privacy", label: "about.privacy", Icon: Lock },
  { href: "/legal/risk", label: "about.risk", Icon: ScrollText },
];

const ROW =
  "flex min-h-14 w-full items-center gap-3 px-4 text-left outline-none transition-colors active:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900";

export function AboutView() {
  const { t } = useT();
  const router = useRouter();
  const taps = useRef({ count: 0, timer: undefined as ReturnType<typeof setTimeout> | undefined });

  useEffect(() => () => clearTimeout(taps.current.timer), []);

  // Hidden entrance: consecutive taps inside a short window open the admin matrix.
  const onVersionTap = () => {
    const state = taps.current;
    clearTimeout(state.timer);
    state.count += 1;
    if (state.count >= ADMIN.secretTaps) {
      state.count = 0;
      router.push(ADMIN.route);
      return;
    }
    state.timer = setTimeout(() => {
      state.count = 0;
    }, ADMIN.tapWindowMs);
  };

  return (
    <div className="flex flex-1 flex-col">
      <SubScreenHeader title={t("about.title")} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">

      <section className={`${CARD} flex flex-col items-center px-6 py-7 text-center`}>
        <NexusMark className="h-16 w-16" />
        <h2 className="mt-3 text-lg font-bold tracking-tight text-gray-900">{PROTOCOL.name}</h2>
        <p data-testid="about-body" className="mt-2 text-sm leading-relaxed text-fg-secondary">
          {t("about.body")}
        </p>
      </section>

      <section aria-labelledby="about-legal">
        <h2 id="about-legal" className="mb-3 text-base font-bold text-gray-900">
          {t("about.legal")}
        </h2>
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {LINKS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} className={ROW}>
                <Icon className="h-5 w-5 shrink-0 text-gray-700" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900">{t(label)}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={onVersionTap}
        data-testid="app-version"
        aria-label={`${t("about.version")} ${APP_VERSION}`}
        className="flex min-h-11 w-full select-none items-center justify-between rounded-2xl px-3 text-xs text-fg-muted outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      >
        <span>{t("about.version")}</span>
        <span className="font-mono tabular-nums">{APP_VERSION}</span>
      </button>
      </main>
    </div>
  );
}
