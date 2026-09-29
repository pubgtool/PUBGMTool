const usd = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a USDT amount, e.g. 1,234.50 USDT. */
export const formatUsdt = (n: number) => `${usd.format(n)} USDT`;
