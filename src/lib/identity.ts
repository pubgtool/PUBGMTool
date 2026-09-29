import { REFERRAL } from "@/config/protocol";

/** FNV-1a: small, stable, dependency-free. Used only for display identifiers. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Stable 6-digit display ID, e.g. NX-894210. */
export const accountUid = (userId: string): string => `NX-${100_000 + (fnv1a(`uid:${userId}`) % 900_000)}`;

/** Stable invite code, e.g. NX7788. */
export const referralCode = (userId: string): string => `NX${1_000 + (fnv1a(`ref:${userId}`) % 9_000)}`;

export const referralLink = (code: string): string => `${REFERRAL.baseUrl}?ref=${code}`;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase() || "?";
}
