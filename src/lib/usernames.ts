/** Letters, digits and . _ - only, with at least one letter so a name never reads as a phone number. */

export const USERNAME = { min: 3, max: 24 } as const;

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,24}$/;
const RESERVED_USERNAMES = new Set(["admin", "administrator", "support", "root", "system", "nexus", "moderator", "staff", "official"]);

export type UsernameProblem = "empty" | "format" | "reserved";

export const looksLikeUsername = (raw: string): boolean => USERNAME_RE.test(raw.trim()) && /[A-Za-z]/.test(raw);

export function usernameProblem(raw: string): UsernameProblem | null {
  const name = raw.trim();
  if (!name) return "empty";
  if (!looksLikeUsername(name)) return "format";
  if (RESERVED_USERNAMES.has(name.toLowerCase())) return "reserved";
  return null;
}

const MESSAGES: Record<UsernameProblem, string> = {
  empty: "Enter a username.",
  format: `Use ${USERNAME.min}–${USERNAME.max} characters: letters, numbers, . _ - (at least one letter).`,
  reserved: "That username is reserved.",
};

/** English message for the first problem, or null when the name is acceptable. */
export const usernameIssue = (raw: string): string | null => {
  const problem = usernameProblem(raw);
  return problem ? MESSAGES[problem] : null;
};
