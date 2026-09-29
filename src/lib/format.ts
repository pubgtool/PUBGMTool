import { BPS } from "@/config/protocol";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatUsd = (n: number) => usd.format(n);

export const formatApy = (bps: number) => `${(bps / (BPS / 100)).toFixed(2)}%`;
