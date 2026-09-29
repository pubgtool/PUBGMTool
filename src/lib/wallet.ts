import type { PaymentNetwork } from "@/types/domain";

export type AddressFamily = "tron" | "evm";

export interface NetworkInfo {
  id: PaymentNetwork;
  /** e.g. TRC20 */
  short: string;
  /** e.g. USDT-TRC20 */
  label: string;
  chain: string;
  family: AddressFamily;
  tag?: string;
  /** Shorter tag for narrow screens. */
  tagShort?: string;
  note: string;
}

const TRC20: NetworkInfo = {
  id: "trc20",
  short: "TRC20",
  label: "USDT-TRC20",
  chain: "Tron",
  family: "tron",
  tag: "Recommended",
  tagShort: "Fast",
  note: "Fast confirmations. Recommended for most transfers.",
};
const BEP20: NetworkInfo = {
  id: "bep20",
  short: "BEP20",
  label: "USDT-BEP20",
  chain: "BNB Chain",
  family: "evm",
  note: "BNB Smart Chain. Uses an EVM address (0x…).",
};
const ERC20: NetworkInfo = {
  id: "erc20",
  short: "ERC20",
  label: "USDT-ERC20",
  chain: "Ethereum",
  family: "evm",
  note: "Ethereum mainnet. Uses an EVM address (0x…).",
};

export const NETWORKS: readonly NetworkInfo[] = [TRC20, BEP20, ERC20];

export const getNetwork = (id: PaymentNetwork): NetworkInfo =>
  ({ trc20: TRC20, bep20: BEP20, erc20: ERC20 })[id];

export const MIN_DEPOSIT = 10;
export const MIN_WITHDRAWAL = 10;
export const WITHDRAWAL_FEE = 1;
export const WITHDRAWAL_ETA = "< 5 minutes";
export const DEPOSIT_WINDOW_MS = 15 * 60 * 1000;
/** Sandbox: how long a withdrawal stays PENDING before it completes. */
export const WITHDRAWAL_SETTLE_MS = 45_000;

const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

/** Family hinted by the first characters, for autodetect while typing. */
export function guessFamily(input: string): AddressFamily | null {
  const value = input.trim();
  if (value.startsWith("T")) return "tron";
  if (/^0x/i.test(value)) return "evm";
  return null;
}

/** Network to select for an address when the user has not chosen one. */
export function defaultNetworkFor(address: string): PaymentNetwork | null {
  const family = guessFamily(address);
  if (family === "tron") return "trc20";
  if (family === "evm") return "bep20";
  return null;
}

/** Valid on either family; used for the saved payout address. */
export const isValidAddress = (address: string): boolean =>
  TRON_RE.test(address) || EVM_RE.test(address);

export function addressError(address: string, network: PaymentNetwork): string | null {
  const value = address.trim();
  if (!value) return "Enter a payout address.";
  const info = getNetwork(network);
  if (info.family === "tron") {
    return TRON_RE.test(value)
      ? null
      : `Enter a valid Tron address for ${info.short} (starts with T, 34 characters).`;
  }
  return EVM_RE.test(value)
    ? null
    : `Enter a valid ${info.chain} address for ${info.short} (0x followed by 40 hex characters).`;
}

export const shortAddress = (address: string): string =>
  address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;

/* ---- Sandbox identifiers. Nobody holds a key for these addresses. ---- */

function xmur3(text: string): () => number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const HEX = "0123456789abcdef";

/**
 * Stable per-user sandbox deposit address. EVM networks share one address,
 * as they do for a real wallet.
 */
export function depositAddressFor(seed: string, network: PaymentNetwork): string {
  const family = getNetwork(network).family;
  const rand = mulberry32(xmur3(`${seed}:${family}`)());
  const pick = (alphabet: string, length: number) =>
    Array.from({ length }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("");
  return family === "tron" ? `T${pick(BASE58, 33)}` : `0x${pick(HEX, 40)}`;
}

export function mockTxHash(network: PaymentNetwork): string {
  const bytes = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return getNetwork(network).family === "tron" ? hex : `0x${hex}`;
}
