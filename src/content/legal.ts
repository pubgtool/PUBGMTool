import { PROTOCOL } from "@/config/protocol";
import type { LegalDocument, LegalSlug } from "@/types/domain";

const v = PROTOCOL.legalVersion;
const name = PROTOCOL.name;

/** Draft copy for a simulated environment; requires counsel review before any real-value launch. */
export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  terms: {
    slug: "terms",
    title: "Terms of Service",
    summary: `The rules for using the ${name} interface.`,
    version: v,
    sections: [
      {
        heading: "1. Simulated environment",
        paragraphs: [
          `${name} currently runs as a client-side simulation. Balances, positions, and yield are mock values stored in your browser. No real assets are transferred, custodied, or earned.`,
        ],
      },
      {
        heading: "2. Eligibility",
        paragraphs: [
          "You must be of legal age in your jurisdiction and not be barred from using financial services under applicable law or sanctions regimes.",
        ],
      },
      {
        heading: "3. Tiers, locks, and fees",
        paragraphs: [
          "Your tier is determined by your total staked value. Locked positions cannot be withdrawn without an early-exit penalty before they mature. Performance fees apply to harvested yield. Current parameters are shown in the app and may change for new positions.",
        ],
      },
      {
        heading: "4. No advice",
        paragraphs: [
          "Nothing in the interface is investment, legal, or tax advice. Displayed APY figures are illustrative and not a guarantee of returns.",
        ],
      },
      {
        heading: "5. Local data",
        paragraphs: [
          "Clearing browser storage resets your simulated portfolio. We cannot recover it.",
        ],
      },
      {
        heading: "6. Changes and contact",
        paragraphs: [
          `We may update these terms; the version date is shown above. Questions: ${PROTOCOL.contactEmail}.`,
        ],
      },
    ],
  },
  risk: {
    slug: "risk",
    title: "Risk Disclosure",
    summary: "Material risks of staking and yield products.",
    version: v,
    sections: [
      {
        heading: "1. Loss of capital",
        paragraphs: [
          "Staking digital assets involves risk of partial or total loss, including from smart-contract defects, protocol exploits, counterparty failure, and market volatility.",
        ],
      },
      {
        heading: "2. Variable yield",
        paragraphs: [
          "Yield is not fixed. Advertised APY may change and is not a promise of future performance.",
        ],
      },
      {
        heading: "3. Liquidity and lock-ups",
        paragraphs: [
          "Locked capital cannot be freely withdrawn. Early exit incurs a penalty on principal, and market conditions may delay or limit exits.",
        ],
      },
      {
        heading: "4. Regulatory risk",
        paragraphs: [
          "Laws governing digital assets are evolving and may restrict or prohibit access to certain features in your jurisdiction.",
        ],
      },
      {
        heading: "5. Simulation notice",
        paragraphs: [
          "The current build is a simulation. Real-value risks above describe the intended production product and do not apply to mock balances.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What data the interface stores and why.",
    version: v,
    sections: [
      {
        heading: "1. Data we store",
        paragraphs: [
          "The simulation stores your mock portfolio and preferences in your browser's local storage. It is not transmitted to a server.",
        ],
      },
      {
        heading: "2. Analytics and cookies",
        paragraphs: [
          "This build sets no tracking cookies and includes no third-party analytics.",
        ],
      },
      {
        heading: "3. Your controls",
        paragraphs: [
          "You can erase all stored data at any time by clearing this site's storage in your browser.",
        ],
      },
      {
        heading: "4. Contact",
        paragraphs: [`Privacy questions: ${PROTOCOL.contactEmail}.`],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCUMENTS) as LegalSlug[];

export function getLegalDocument(slug: string): LegalDocument | null {
  return (LEGAL_DOCUMENTS as Record<string, LegalDocument | undefined>)[slug] ?? null;
}
