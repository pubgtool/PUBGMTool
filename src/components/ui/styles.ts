/** Shared class strings for the light UI. */

export const CARD = "rounded-2xl border border-slate-100 bg-white shadow-card";

/** Charcoal-to-bronze pass used for VIP and promotional panels. */
export const VIP_PANEL =
  "relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1C1A17] via-[#2A241C] to-[#453823] text-white shadow-[0_12px_32px_rgba(69,56,35,0.28)]";

const BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-bold outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:active:scale-100";

export const BTN_PRIMARY = `${BUTTON} btn-primary focus-visible:ring-gray-900`;
export const BTN_OUTLINE = `${BUTTON} border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-gray-900`;
/** For a VIP_PANEL, where a black button would disappear. */
export const BTN_GOLD = `${BUTTON} bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 text-gray-900 shadow-[0_6px_18px_rgba(251,191,36,0.35)] focus-visible:ring-amber-300 disabled:bg-none disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none`;
export const BTN_GHOST_DARK = `${BUTTON} border border-white/20 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-amber-300`;

export const EYEBROW = "text-[11px] font-bold uppercase tracking-wider text-fg-muted";
export const GOLD_TEXT = "bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent";
