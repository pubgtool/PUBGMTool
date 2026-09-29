/** Global protocol constants. All monetary values are USD-denominated mock units. */

export const PROTOCOL = {
  name: "NEXUS PROTOCOL",
  shortName: "NEXUS",
  tagline: "Tiered staking & yield infrastructure",
  token: { symbol: "NXS", decimals: 6 },
  /** Currency shown in the UI; the mock engine has no on-chain settlement. */
  displayCurrency: "USD",
  network: { name: "Nexus Simulated Ledger", mock: true },
  legalVersion: "2026-09-29",
  contactEmail: "legal@nexus-protocol.example",
} as const;

export const ENGINE = {
  /** Interval at which the mock engine accrues yield, in ms. */
  accrualTickMs: 1_000,
  msPerDay: 86_400_000,
  daysPerYear: 365,
  /** Mock wallet balance granted to a fresh session. */
  initialWalletBalance: 25_000,
  minStakeAmount: 100,
} as const;

export const PERSISTENCE = {
  storageKey: "nexus-protocol:v1",
  /** Bump when the persisted shape changes; the store migrates or resets. */
  version: 1,
} as const;

export const BPS = 10_000;
