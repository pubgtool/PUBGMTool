"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Lock, ScrollText } from "lucide-react";
import { ADMIN, APP_VERSION } from "@/config/protocol";

const LINKS = [
  { href: "/legal/terms", label: "Terms of Service", Icon: FileText },
  { href: "/legal/privacy", label: "Privacy Policy", Icon: Lock },
  { href: "/legal/risk", label: "Risk Disclosure", Icon: ScrollText },
] as const;

export function AboutCard() {
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
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" aria-label="Legal and version">
      <h2 className="text-sm font-semibold">Legal &amp; About</h2>
      <ul className="mt-2 divide-y divide-slate-100">
        {LINKS.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="flex-1 text-sm font-medium">{label}</span>
              <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onVersionTap}
        data-testid="app-version"
        aria-label={`App version ${APP_VERSION}`}
        className="mt-1 flex w-full select-none items-center justify-between rounded-xl py-3 text-xs text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
      >
        <span>App version</span>
        <span className="font-mono tabular-nums">{APP_VERSION}</span>
      </button>
    </section>
  );
}
