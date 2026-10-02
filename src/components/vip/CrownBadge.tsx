"use client";

import { useId } from "react";

export const RANKS = ["TRIAL", "PRO", "ELITE", "MASTER", "GRAND", "PRIME", "ROYAL", "IMPERIAL", "APEX"] as const;

export const rankName = (level: number): string => RANKS[Math.max(0, Math.min(RANKS.length - 1, level))] ?? "PRO";

/** "VIP 2 ELITE" */
export const rankLabel = (level: number): string => `VIP ${level} ${rankName(level)}`;

function CrownGlyph({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M8 22l12 11 12-19 12 19 12-11-4 28H12z"
        fill={`url(#${id}-gold)`}
        stroke="#92400e"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="11" y="51" width="42" height="6" rx="2" fill={`url(#${id}-gold)`} stroke="#92400e" strokeWidth="1.5" />
      <path d="M13 27l7 6 12-17 6 10" fill="none" stroke={`url(#${id}-gloss)`} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="8" cy="21" r="3" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
      <circle cx="32" cy="12" r="3.4" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
      <circle cx="56" cy="21" r="3" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
      <circle cx="32" cy="41" r="3.4" fill="#34d399" stroke="#065f46" strokeWidth="1" />
    </svg>
  );
}

interface Props {
  level: number;
  /** "hero" is the large medallion on cards; "pill" is the small inline mark. */
  size?: "hero" | "pill";
  className?: string;
}

export function CrownBadge({ level, size = "hero", className = "" }: Props) {
  if (size === "pill") {
    return (
      <span
        data-testid={`tier-badge-${level}`}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-400/40 bg-gradient-to-b from-amber-300/25 via-amber-500/10 to-transparent px-2.5 py-1 shadow-[0_0_14px_rgba(245,158,11,0.25)] ${className}`}
      >
        <CrownGlyph className="h-4 w-4 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
        <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-xs font-black leading-none tracking-wide text-transparent">
          VIP {level}
        </span>
      </span>
    );
  }

  return (
    <span data-testid={`crown-${level}`} className={`relative inline-flex h-[88px] w-[88px] shrink-0 items-center justify-center ${className}`}>
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 p-[3px] shadow-[0_0_36px_rgba(245,158,11,0.5)]"
      >
        <span className="block h-full w-full rounded-full bg-gradient-to-b from-[#2b2110] to-[#0b0905]" />
      </span>
      <span aria-hidden className="absolute inset-[3px] overflow-hidden rounded-full">
        <span className="absolute inset-y-[-8px] left-0 w-1/2 animate-shine bg-gradient-to-r from-transparent via-white/35 to-transparent motion-reduce:hidden" />
      </span>
      <CrownGlyph className="relative h-[52px] w-[52px] drop-shadow-[0_2px_8px_rgba(251,191,36,0.65)]" />
      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-100/60 bg-gradient-to-b from-amber-200 to-amber-500 px-2.5 py-0.5 text-[11px] font-black leading-none text-slate-950 shadow-lg">
        {rankLabel(level)}
      </span>
    </span>
  );
}
