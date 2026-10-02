import { translate, type MessageKey } from "@/lib/i18n";
import type { Language } from "@/types/domain";

const EXACT: Record<string, MessageKey> = {
  "Login password is incorrect.": "security.err.loginPassword",
  "Current password is incorrect.": "security.err.currentPassword",
  "Choose a different password from the current one.": "security.err.samePassword",
  "Include at least one letter and one number.": "security.err.pwLetterDigit",
  "That password is too common. Choose something less predictable.": "security.err.pwCommon",
  "Use exactly 6 digits.": "security.err.pinFormat",
  "Avoid repeated digits and simple sequences.": "security.err.pinWeak",
  "Current transaction password is incorrect.": "security.err.pinCurrent",
  "Incorrect transaction password.": "security.err.pinCurrent",
  "That code doesn't match. Check the clock on your phone and try again.": "security.err.codeMismatch",
  "Incorrect authenticator code.": "security.err.codeWrong",
  "Authenticator codes need a secure (https) connection.": "security.err.https",
  "That is already your email.": "security.err.sameEmail",
  "An account with this email already exists.": "security.err.emailTaken",
  "Enter a valid email address.": "security.err.emailInvalid",
  "The demo account can't change its email.": "security.err.demoEmail",
  "This code has expired. Request a new one.": "security.err.codeExpired",
  "Too many incorrect codes. Request a new one.": "security.err.codeTooMany",
  "Request a verification code first.": "security.err.codeFirst",
  "This account signs in with a phone number, so there is no email to change.": "security.email.phoneOnly",
};

const PATTERNS: ReadonlyArray<readonly [RegExp, MessageKey]> = [
  [/^Too many attempts\. Try again in (\d+)s\.$/, "security.err.lockout"],
  [/^Incorrect code\. (\d+) attempts? left\.$/, "security.err.codeLeft"],
  [/^Use at least (\d+) characters\.$/, "security.err.pwShort"],
  [/^Use at most (\d+) characters\.$/, "security.err.pwLong"],
];

/** The store speaks English; show the Russian equivalent for the messages these sheets can produce. */
export function localizeError(lang: Language, message: string): string {
  if (lang === "en") return message;
  const exact = EXACT[message];
  if (exact) return translate(lang, exact);
  for (const [pattern, key] of PATTERNS) {
    const match = pattern.exec(message);
    if (match) return translate(lang, key, { n: match[1] ?? "" });
  }
  return message;
}
