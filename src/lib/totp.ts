/** RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30 s) as used by Google Authenticator. */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_MS = 30_000;

function base32Encode(data: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text: string): Uint8Array<ArrayBuffer> | null {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of text.replace(/[\s=-]/g, "").toUpperCase()) {
    const index = ALPHABET.indexOf(ch);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export function generateTotpSecret(byteLength = 20): string {
  const data = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(data);
  return base32Encode(data);
}

export const isValidTotpSecret = (secret: string): boolean => /^[A-Z2-7]{16,64}$/.test(secret) && base32Decode(secret) !== null;

/** Groups of four, for typing the key by hand. */
export const formatSecret = (secret: string): string => secret.replace(/(.{4})/g, "$1 ").trim();

async function hotp(key: Uint8Array<ArrayBuffer>, counter: number): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("insecure-context");
  const message = new ArrayBuffer(8);
  const view = new DataView(message);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const hmacKey = await subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await subtle.sign("HMAC", hmacKey, message));
  const offset = (mac[19] ?? 0) & 0x0f;
  const binary =
    (((mac[offset] ?? 0) & 0x7f) << 24) |
    (((mac[offset + 1] ?? 0) & 0xff) << 16) |
    (((mac[offset + 2] ?? 0) & 0xff) << 8) |
    ((mac[offset + 3] ?? 0) & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export async function totpAt(secret: string, now: number): Promise<string> {
  const key = base32Decode(secret);
  if (!key) throw new Error("invalid-secret");
  return hotp(key, Math.floor(now / STEP_MS));
}

/** Accepts the current step and one either side to absorb clock drift. Throws "insecure-context" without WebCrypto. */
export async function verifyTotp(secret: string, code: string, now: number, drift = 1): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  for (let step = -drift; step <= drift; step++) {
    if ((await totpAt(secret, now + step * STEP_MS)) === code) return true;
  }
  return false;
}

export function otpauthUri({ secret, account, issuer }: { secret: string; account: string; issuer: string }): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
