/** Global protocol constants. All monetary values are USDT-denominated mock units. */

export const PROTOCOL = {
  name: "NEXUS PROTOCOL",
  shortName: "NEXUS",
  tagline: "VIP investment plans & daily income",
  token: { symbol: "USDT", decimals: 6 },
  /** Currency shown in the UI; the mock engine has no on-chain settlement. */
  displayCurrency: "USDT",
  network: { name: "Nexus Demo Ledger", mock: true },
  legalVersion: "2026-09-29",
  contactEmail: "legal@nexus-protocol.example",
} as const;

/**
 * Operating entity for legal footers. Left empty on purpose: fill in the real registered company
 * before launch. Footers render only the lines that are set, so nothing here is invented.
 */
export const COMPANY = {
  brand: PROTOCOL.name,
  legalName: "",
  registeredAddress: "",
  contactEmail: PROTOCOL.contactEmail,
} as const;

export const ENGINE = {
  msPerDay: 86_400_000,
} as const;

export const PERSISTENCE = {
  storageKey: "nexus-protocol:v1",
  /** Bump when the persisted shape changes; the store migrates or resets. */
  version: 9,
} as const;

export const APP_VERSION = "v2.4.0-institutional";

export const SUPPORT = {
  deskName: "VIP Concierge Desk",
  agentName: "Concierge",
  replyNote: "Replies instantly",
  replyDelayMs: 1_500,
  telegramUrl: "https://t.me/nexus_support",
  whatsappUrl: "https://wa.me/",
} as const;

export const REFERRAL = {
  baseUrl: "https://nexus.protocol/join",
  tiers: [
    { level: 1, ratePct: 10 },
    { level: 2, ratePct: 3 },
    { level: 3, ratePct: 1 },
  ],
} as const;

export const ADMIN = {
  route: "/admin/matrix",
  secretTaps: 5,
  tapWindowMs: 2_000,
} as const;

export const AUTH = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  /** Optional by default; set true to block registration without a verified referrer. */
  referralRequired: false,
  uidDigits: 7,
  otp: {
    length: 6,
    resendCooldownMs: 60_000,
    expiresMs: 10 * 60_000,
    maxAttempts: 5,
  },
  lockout: { maxFailures: 5, durationMs: 60_000 },
  /** Cookie without an expiry: shared across tabs, cleared when the browser session ends. */
  sessionCookie: "nexus_session",
  demo: {
    identifier: "demo@nexus.example",
    password: "Demo@2026",
    uid: "8942105",
    referralCode: "7788104",
    displayName: "Demo Investor",
  },
} as const;

export const TICKETS = {
  subjects: ["Deposit", "Withdrawal", "VIP Nodes", "Account & KYC", "Other"] as readonly string[],
  minMessage: 10,
  maxMessage: 1_000,
  maxAttachments: 3,
  maxAttachmentBytes: 5 * 1024 * 1024,
  max: 50,
} as const;
