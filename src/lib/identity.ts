import { AUTH, REFERRAL } from "@/config/protocol";

/** FNV-1a: small, stable, dependency-free. Used for display identifiers and sandbox hashing only. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const SPAN = 9 * 10 ** (AUTH.uidDigits - 1);
const FLOOR = 10 ** (AUTH.uidDigits - 1);

function randomInt(max: number): number {
  const buffer = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buffer);
  else buffer[0] = Math.floor(Math.random() * 2 ** 32);
  return (buffer[0] ?? 0) % max;
}

/** Random numeric ID of AUTH.uidDigits digits that is not in `taken`. */
export function generateNumericId(taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 64; attempt++) {
    const candidate = String(FLOOR + randomInt(SPAN));
    if (!taken.has(candidate)) return candidate;
  }
  return deriveNumericId(String(Date.now()), taken);
}

/** Deterministic ID from a seed, walking forward past collisions. Used by migrations. */
export function deriveNumericId(seed: string, taken: ReadonlySet<string>): string {
  const n = fnv1a(seed) % SPAN;
  for (let i = 0; i < SPAN; i++) {
    const candidate = String(FLOOR + ((n + i) % SPAN));
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("No numeric IDs left");
}

export const referralLink = (code: string): string => `${REFERRAL.baseUrl}?ref=${code}`;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase() || "?";
}
