import Link from "next/link";
import { ALL_TIERS, getEffectiveApyBps } from "@/config/tiers";
import { PROTOCOL } from "@/config/protocol";
import { LEGAL_DOCUMENTS } from "@/content/legal";
import { formatApy, formatUsd } from "@/lib/format";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{PROTOCOL.name}</h1>
      <p className="mt-1 text-sm text-slate-500">{PROTOCOL.tagline}</p>
      <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {ALL_TIERS.map((t) => {
          const maxLock = t.lockOptions[t.lockOptions.length - 1]!;
          return (
            <li key={t.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium" style={{ color: t.accent }}>{t.name}</p>
                <p className="tabular text-xs text-slate-500">
                  {formatUsd(t.minStake)}
                  {t.maxStake ? ` – ${formatUsd(t.maxStake)}` : "+"}
                </p>
              </div>
              <p className="tabular font-mono text-sm">
                {formatApy(t.baseApyBps)} – {formatApy(getEffectiveApyBps(t, maxLock.days))}
              </p>
            </li>
          );
        })}
      </ul>
      <nav className="mt-8 flex gap-4 text-sm text-slate-500">
        {Object.values(LEGAL_DOCUMENTS).map((d) => (
          <Link key={d.slug} href={`/legal/${d.slug}`} className="hover:text-ink">{d.title}</Link>
        ))}
      </nav>
    </main>
  );
}
