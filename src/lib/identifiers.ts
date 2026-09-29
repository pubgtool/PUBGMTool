export type IdentifierKind = "email" | "phone";

export type ParsedIdentifier =
  | { ok: true; kind: IdentifierKind; key: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{8,15}$/;

/**
 * Normalises an email or phone number to the key accounts are stored under.
 * Without `kind`, anything containing "@" is treated as an email.
 */
export function parseIdentifier(raw: string, kind?: IdentifierKind): ParsedIdentifier {
  const value = raw.trim();
  if (!value) return { ok: false, error: kind === "phone" ? "Enter your phone number." : "Enter your email or phone number." };
  const resolved = kind ?? (value.includes("@") ? "email" : "phone");

  if (resolved === "email") {
    const key = value.toLowerCase();
    if (key.length > 254 || !EMAIL_RE.test(key)) return { ok: false, error: "Enter a valid email address." };
    return { ok: true, kind: "email", key };
  }

  const compact = value.replace(/[\s().-]/g, "");
  if (!PHONE_RE.test(compact)) return { ok: false, error: "Enter a valid phone number (8–15 digits)." };
  return { ok: true, kind: "phone", key: `+${compact.replace(/^\+/, "")}` };
}

/** a***e@example.com or +••••1234, for confirming which account is signed in. */
export function maskIdentifier(key: string): string {
  if (key.includes("@")) {
    const [name = "", domain = ""] = key.split("@");
    const head = name.slice(0, 1);
    const tail = name.length > 2 ? name.slice(-1) : "";
    return `${head}***${tail}@${domain}`;
  }
  return `+••••${key.slice(-4)}`;
}
