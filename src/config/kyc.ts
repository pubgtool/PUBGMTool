import type { KycDocumentType, KycTier } from "@/types/domain";

/**
 * Facial liveness step (Step 3 of the wizard). Flip the constant, or build with
 * NEXT_PUBLIC_KYC_LIVENESS=false, to skip it: the wizard then goes from the
 * document upload straight to submission and the progress indicator drops the step.
 */
export const ENABLE_LIVENESS_STEP: boolean = process.env.NEXT_PUBLIC_KYC_LIVENESS !== "false";

export const KYC = {
  enableLivenessStep: ENABLE_LIVENESS_STEP,
  reviewEta: "~2-5 mins",
  minAge: 18,
  maxAge: 120,
  upload: {
    maxBytes: 10 * 1024 * 1024,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    minWidth: 480,
    minHeight: 300,
    /** Simulated OCR / alignment pass. */
    scanMs: 1_400,
  },
  liveness: {
    prompts: ["Look straight", "Blink slowly", "Frame aligned"] as readonly string[],
    promptMs: 1_500,
    analyzeMs: 2_600,
  },
} as const;

export interface KycTierDef {
  tier: KycTier;
  name: string;
  summary: string;
  /** USDT per UTC day. 0 blocks withdrawals; null means unlimited. */
  dailyLimit: number | null;
  limitLabel: string;
}

export const KYC_TIERS: readonly KycTierDef[] = [
  {
    tier: 0,
    name: "Unverified",
    summary: "Basic browsing only",
    dailyLimit: 0,
    limitLabel: "Withdrawals blocked",
  },
  {
    tier: 1,
    name: "Basic Identity",
    summary: "Government ID, front and back",
    dailyLimit: 10_000,
    limitLabel: "10,000 USDT / day",
  },
  {
    tier: 2,
    name: "Enhanced Institutional",
    summary: "Proof of address or node ownership",
    dailyLimit: null,
    limitLabel: "Unlimited withdrawals",
  },
];

export type UploadSide = "front" | "back";

export interface DocumentTypeDef {
  id: KycDocumentType;
  label: string;
  hint: string;
  /** Which level asks for this document. */
  tier: 1 | 2;
  sides: readonly UploadSide[];
}

export const DOCUMENT_TYPES: Record<KycDocumentType, DocumentTypeDef> = {
  national_id: { id: "national_id", label: "National ID Card", hint: "Front and back", tier: 1, sides: ["front", "back"] },
  passport: { id: "passport", label: "Passport", hint: "Photo page only", tier: 1, sides: ["front"] },
  drivers_license: { id: "drivers_license", label: "Driver's License", hint: "Front and back", tier: 1, sides: ["front", "back"] },
  utility_bill: { id: "utility_bill", label: "Utility Bill", hint: "Issued in the last 3 months", tier: 2, sides: ["front"] },
  bank_statement: { id: "bank_statement", label: "Bank Statement", hint: "Issued in the last 3 months", tier: 2, sides: ["front"] },
  node_certificate: { id: "node_certificate", label: "Node Ownership Certificate", hint: "Proof you operate a node", tier: 2, sides: ["front"] },
};

export const DOCUMENT_TYPES_BY_TIER: Record<1 | 2, readonly KycDocumentType[]> = {
  1: ["national_id", "passport", "drivers_license"],
  2: ["utility_bill", "bank_statement", "node_certificate"],
};

export const SIDE_LABELS: Record<KycDocumentType, Record<UploadSide, string>> = {
  national_id: { front: "Front of ID", back: "Back of ID" },
  passport: { front: "Photo page", back: "" },
  drivers_license: { front: "Front of licence", back: "Back of licence" },
  utility_bill: { front: "Document", back: "" },
  bank_statement: { front: "Document", back: "" },
  node_certificate: { front: "Certificate", back: "" },
};

const REASONS: Record<1 | 2, readonly string[]> = {
  1: ["Blurry document", "Expired ID", "Face mismatch"],
  2: ["Address not visible", "Document older than 3 months", "Name mismatch"],
};

/** "Face mismatch" only makes sense when a selfie was collected. */
export const rejectionReasonsFor = (tier: 1 | 2, livenessEnabled: boolean): readonly string[] =>
  livenessEnabled || tier === 2 ? REASONS[tier] : REASONS[tier].filter((r) => r !== "Face mismatch");

/** ISO 3166-1 alpha-2 codes offered in the country picker; names come from Intl.DisplayNames. */
export const COUNTRY_CODES: readonly string[] = (
  "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO " +
  "KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN " +
  "HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU " +
  "MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN " +
  "LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV " +
  "UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW"
).split(" ");
