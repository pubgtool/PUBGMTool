/** Global protocol constants. All monetary values are USDT-denominated mock units. */

export const PROTOCOL = {
  name: "NEXUS PROTOCOL",
  shortName: "NEXUS",
  tagline: "VIP investment plans & daily income",
  token: { symbol: "USDT", decimals: 6 },
  /** Currency shown in the UI; the mock engine has no on-chain settlement. */
  displayCurrency: "USDT",
  network: { name: "Nexus Simulated Ledger", mock: true },
  legalVersion: "2026-09-29",
  contactEmail: "legal@nexus-protocol.example",
} as const;

export const ENGINE = {
  msPerDay: 86_400_000,
} as const;

export const PERSISTENCE = {
  storageKey: "nexus-protocol:v1",
  /** Bump when the persisted shape changes; the store migrates or resets. */
  version: 4,
} as const;

export const APP_VERSION = "v2.4.0-institutional";

export const SUPPORT = {
  agentName: "Nexus Protocol Officer",
  avgReply: "< 2 min",
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
