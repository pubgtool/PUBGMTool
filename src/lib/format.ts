const usd = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a USDT amount, e.g. 1,234.50 USDT. */
export const formatUsdt = (n: number) => `${usd.format(n)} USDT`;

const plain = (decimals: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Grouped fixed-decimal number without a unit, e.g. 1,250.00. */
export const formatAmount = (n: number, decimals = 2) => plain(decimals).format(n);

/** Signed percentage, e.g. +1.24%. */
export const formatSignedPct = (n: number) => `${n >= 0 ? "+" : "-"}${plain(2).format(Math.abs(n))}%`;

/** Daily rate without trailing zeros, e.g. 1.2%. */
export const formatRate = (pct: number) => `${parseFloat(pct.toFixed(2))}%`;
