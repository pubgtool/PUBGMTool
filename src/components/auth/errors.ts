import { passwordIssue } from "@/lib/credentials";
import type { MessageKey, MessageVars } from "@/lib/i18n";

type Translate = (key: MessageKey, vars?: MessageVars) => string;

interface Rule {
  pattern: RegExp;
  key: MessageKey;
  vars?: (match: RegExpMatchArray) => MessageVars;
}

/** The store and the password rules speak English; known messages are mapped so the UI follows the active language. */
const RULES: readonly Rule[] = [
  { pattern: /^incorrect .*password/i, key: "auth.error.credentials" },
  { pattern: /^too many attempts\. try again in (\d+)s/i, key: "auth.error.locked", vars: (m) => ({ n: m[1] ?? "" }) },
  { pattern: /no password yet/i, key: "auth.error.noPassword" },
  { pattern: /already exists/i, key: "auth.error.duplicateEmail" },
  { pattern: /username is taken/i, key: "auth.error.usernameTaken" },
  { pattern: /username is reserved/i, key: "auth.error.usernameReserved" },
  { pattern: /sign out before/i, key: "auth.error.signOutFirst" },
  { pattern: /already signed in/i, key: "auth.error.alreadySignedIn" },
  { pattern: /valid referral code/i, key: "auth.error.inviteInvalid" },
  { pattern: /no account found/i, key: "auth.error.noAccount" },
  { pattern: /enter the (\d+)-digit code/i, key: "auth.error.codeFormat", vars: (m) => ({ n: m[1] ?? "" }) },
  { pattern: /request a verification code first/i, key: "auth.error.codeFirst" },
  { pattern: /code has expired/i, key: "auth.error.codeExpired" },
  { pattern: /too many incorrect codes/i, key: "auth.error.codeTooMany" },
  { pattern: /incorrect code\. (\d+)/i, key: "auth.error.codeWrong", vars: (m) => ({ left: m[1] ?? "" }) },
  { pattern: /at least (\d+) characters/i, key: "auth.error.passwordShort", vars: (m) => ({ n: m[1] ?? "" }) },
  { pattern: /at most (\d+) characters/i, key: "auth.error.passwordLong", vars: (m) => ({ n: m[1] ?? "" }) },
  { pattern: /letter and one number/i, key: "auth.error.passwordMix" },
  { pattern: /too common/i, key: "auth.error.passwordCommon" },
];

/** Localised text for a known store message, otherwise the message as it came. */
export function localizeAuthError(message: string, t: Translate): string {
  for (const { pattern, key, vars } of RULES) {
    const match = message.match(pattern);
    if (match) return t(key, vars?.(match));
  }
  return message;
}

export function passwordProblem(password: string, t: Translate): string | null {
  const issue = passwordIssue(password);
  return issue ? localizeAuthError(issue, t) : null;
}
