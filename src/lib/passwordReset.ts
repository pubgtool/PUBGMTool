import { AUTH } from "@/config/protocol";

interface ResetRequest {
  code: string;
  expiresAt: number;
  cooldownUntil: number;
  attempts: number;
}

const requests = new Map<string, ResetRequest>();

function randomCode(): string {
  const buffer = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buffer);
  else buffer[0] = Math.floor(Math.random() * 2 ** 32);
  return String((buffer[0] ?? 0) % 10 ** AUTH.otp.length).padStart(AUTH.otp.length, "0");
}

export type IssueResult =
  | { ok: true; code: string; cooldownUntil: number; expiresAt: number; reused: boolean }
  | { ok: false; error: string };

/**
 * Issues a verification code for an account key. Inside the resend cooldown the
 * existing code is returned unchanged instead of minting a new one.
 */
export function issueCode(key: string, now: number): IssueResult {
  const existing = requests.get(key);
  if (existing && existing.cooldownUntil > now && existing.expiresAt > now && existing.attempts < AUTH.otp.maxAttempts) {
    return { ok: true, code: existing.code, cooldownUntil: existing.cooldownUntil, expiresAt: existing.expiresAt, reused: true };
  }
  const request: ResetRequest = {
    code: randomCode(),
    expiresAt: now + AUTH.otp.expiresMs,
    cooldownUntil: now + AUTH.otp.resendCooldownMs,
    attempts: 0,
  };
  requests.set(key, request);
  return { ok: true, code: request.code, cooldownUntil: request.cooldownUntil, expiresAt: request.expiresAt, reused: false };
}

/** Counts a wrong guess; the code is discarded after too many. */
export function checkCode(key: string, code: string, now: number): { ok: true } | { ok: false; error: string } {
  const request = requests.get(key);
  if (!request) return { ok: false, error: "Request a verification code first." };
  if (request.expiresAt <= now) {
    requests.delete(key);
    return { ok: false, error: "This code has expired. Request a new one." };
  }
  if (request.attempts >= AUTH.otp.maxAttempts) {
    return { ok: false, error: "Too many incorrect codes. Request a new one." };
  }
  if (code !== request.code) {
    request.attempts += 1;
    const left = AUTH.otp.maxAttempts - request.attempts;
    return {
      ok: false,
      error: left > 0 ? `Incorrect code. ${left} ${left === 1 ? "attempt" : "attempts"} left.` : "Too many incorrect codes. Request a new one.",
    };
  }
  return { ok: true };
}

export const consumeCode = (key: string): void => void requests.delete(key);
