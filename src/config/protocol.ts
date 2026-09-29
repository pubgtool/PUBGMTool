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
  version: 2,
} as const;
