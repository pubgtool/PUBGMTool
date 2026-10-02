/** Shared presentation constants for the wallet surfaces. */

export const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
export const TAP = { scale: 0.97 } as const;
export const TAP_CTA = { scale: 0.95 } as const;

export const CARD = "rounded-2xl border border-gray-200 bg-surface";
export const PREMIUM_CARD = "rounded-2xl border border-slate-100 bg-white";

export const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2";
/** Stretches a small inline control's hit area to 44px without changing how it looks. */
export const HIT = "relative after:absolute after:-inset-x-2 after:-inset-y-3.5 after:content-['']";
export const CTA = `flex w-full items-center justify-center gap-2 rounded-2xl btn-primary py-4 text-sm disabled:cursor-not-allowed ${FOCUS}`;
export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-secondary";
export const WARNING_STRIP =
  "flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-amber-500/10 px-3.5 py-3 text-xs leading-relaxed text-amber-900";
