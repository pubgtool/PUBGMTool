"use client";

/** Small dark-surface building blocks shared by the compute-node screens. */

export const CARD = "rounded-3xl border border-slate-800 bg-slate-900";

export function TierBadge({ level, className = "" }: { level: number; className?: string }) {
  return (
    <span
      data-testid={`tier-badge-${level}`}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-gradient-to-b from-amber-200 to-amber-500 px-2 py-1 text-xs font-bold leading-none text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.25)] ${className}`}
    >
      VIP {level}
    </span>
  );
}

/** Illuminated horizontal meter. */
export function GlowMeter({ pct, label, tone = "amber" }: { pct: number; label: string; tone?: "amber" | "emerald" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const glow = tone === "amber" ? "from-amber-500 to-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.55)]" : "from-emerald-500 to-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="h-1.5 overflow-hidden rounded-full bg-slate-800"
    >
      <div className={`h-full rounded-full bg-gradient-to-r ${glow} transition-[width] duration-700 ease-out`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub, tone = "default", testId }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "default" | "gold" | "green"; testId?: string }) {
  const color = tone === "gold" ? "text-amber-300" : tone === "green" ? "text-emerald-400" : "text-slate-100";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p data-testid={testId} className={`mt-1 truncate font-mono text-base font-semibold tabular-nums ${color}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
