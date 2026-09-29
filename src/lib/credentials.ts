import { AUTH } from "@/config/protocol";
import { fnv1a } from "@/lib/identity";

/**
 * Sandbox-grade credentials. The password is never stored, only a salted
 * hash, but it lives in this browser's storage next to the rest of the mock
 * state, so this is not a substitute for server-side authentication.
 */
export interface Credential {
  salt: string;
  hash: string;
  /** "pbkdf2" needs WebCrypto (secure contexts only); "fallback" is a weak stand-in. */
  algo: "pbkdf2" | "fallback";
}

const ITERATIONS = 100_000;
const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buffer);
  else for (let i = 0; i < bytes; i++) buffer[i] = Math.floor(Math.random() * 256);
  return toHex(buffer);
}

async function derive(password: string, salt: string, algo: Credential["algo"]): Promise<string> {
  if (algo === "pbkdf2") {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error("Secure hashing is unavailable in this context.");
    const key = await subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations: ITERATIONS },
      key,
      256,
    );
    return toHex(new Uint8Array(bits));
  }
  return [0, 1, 2, 3].map((i) => fnv1a(`${i}:${salt}:${password}`).toString(16).padStart(8, "0")).join("");
}

export async function hashPassword(password: string): Promise<Credential> {
  const salt = randomHex(16);
  const algo: Credential["algo"] = globalThis.crypto?.subtle ? "pbkdf2" : "fallback";
  return { salt, algo, hash: await derive(password, salt, algo) };
}

export async function verifyPassword(password: string, credential: Credential): Promise<boolean> {
  try {
    const candidate = await derive(password, credential.salt, credential.algo);
    if (candidate.length !== credential.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ credential.hash.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

/* ---- Password rules ---- */

/** Letters-only stems of passwords that satisfy the length rule but are guessed first. */
const COMMON_STEMS = new Set([
  "password", "passw", "qwerty", "qwertyuiop", "letmein", "iloveyou", "welcome", "admin", "administrator",
  "abcdefgh", "asdfghjk", "monkey", "dragon", "football", "baseball", "master", "login", "nexus",
]);

const isCommon = (password: string): boolean => COMMON_STEMS.has(password.toLowerCase().replace(/[^a-z]/g, ""));

export function passwordIssue(password: string): string | null {
  if (password.length < AUTH.minPasswordLength) return `Use at least ${AUTH.minPasswordLength} characters.`;
  if (password.length > AUTH.maxPasswordLength) return `Use at most ${AUTH.maxPasswordLength} characters.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Include at least one letter and one number.";
  if (isCommon(password)) return "That password is too common. Choose something less predictable.";
  return null;
}

export interface Strength {
  /** 0 = empty, 1 weak … 4 strong */
  score: 0 | 1 | 2 | 3 | 4;
  label: "" | "Weak" | "Fair" | "Good" | "Strong";
}

const LEVELS: readonly Strength[] = [
  { score: 1, label: "Weak" },
  { score: 2, label: "Fair" },
  { score: 3, label: "Good" },
  { score: 4, label: "Strong" },
];

/** The rules already require a letter and a digit, so strength counts length, case mix and symbols. */
export function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: "" };
  if (password.length < AUTH.minPasswordLength || isCommon(password)) return LEVELS[0]!;
  const points = [
    password.length >= 10,
    password.length >= 14,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  return LEVELS[Math.min(points, 3)]!;
}

/* ---- Sign-in throttling (per account, in memory) ---- */

const failures = new Map<string, { count: number; lockedUntil: number }>();

/** Milliseconds left on a lockout, or 0. */
export function lockoutRemaining(key: string, now: number): number {
  const entry = failures.get(key);
  return entry && entry.lockedUntil > now ? entry.lockedUntil - now : 0;
}

export function recordFailure(key: string, now: number): void {
  const entry = failures.get(key);
  const count = (entry && entry.lockedUntil <= now && entry.count >= AUTH.lockout.maxFailures ? 0 : (entry?.count ?? 0)) + 1;
  failures.set(key, {
    count,
    lockedUntil: count >= AUTH.lockout.maxFailures ? now + AUTH.lockout.durationMs : 0,
  });
}

export const clearFailures = (key: string): void => void failures.delete(key);
