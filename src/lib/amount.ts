const MAX_DECIMALS = 6;

const countSignificant = (s: string) => s.replace(/[^\d.]/g, "").length;

/**
 * Normalises typed amount text (digits, one dot, up to 6 decimals, grouped
 * thousands) and maps the caret so typing mid-number does not jump.
 */
export function formatAmountInput(raw: string, caret: number): { text: string; caret: number } {
  const before = countSignificant(raw.slice(0, caret));
  const [intPart = "", ...rest] = raw.replace(/[^\d.]/g, "").split(".");
  const hasDot = rest.length > 0;
  const decimals = rest.join("").slice(0, MAX_DECIMALS);
  let int = intPart.replace(/^0+(?=\d)/, "");
  if (int === "" && hasDot) int = "0";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const text = hasDot ? `${grouped}.${decimals}` : grouped;

  const target = Math.min(before, countSignificant(text));
  let pos = 0;
  let seen = 0;
  while (pos < text.length && seen < target) {
    if (text[pos] !== ",") seen++;
    pos++;
  }
  return { text, caret: pos };
}

export function parseAmountInput(text: string): number | null {
  const s = text.replace(/,/g, "");
  if (s === "" || s === ".") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Floors to 6 decimals without ever exceeding the input (float dust safe). */
export function floor6(n: number): number {
  const f = Math.floor(n * 1e6) / 1e6;
  return f > n ? Math.max(0, Math.round((f - 1e-6) * 1e6) / 1e6) : f;
}

/** Number -> grouped input text with trailing zeros trimmed. */
export function toInputText(n: number): string {
  if (!(n > 0)) return "";
  const plain = n.toFixed(MAX_DECIMALS).replace(/\.?0+$/, "");
  return formatAmountInput(plain, plain.length).text;
}
