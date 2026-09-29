"use client";

import { motion } from "framer-motion";
import { BookUser, Building2, CreditCard, FileText, IdCard, Server, type LucideIcon } from "lucide-react";
import { DocumentDropzone } from "@/components/kyc/DocumentDropzone";
import { StepHeading } from "@/components/kyc/StepHeading";
import type { KycDraftApi } from "@/components/kyc/useKycDraft";
import { DOCUMENT_TYPES, DOCUMENT_TYPES_BY_TIER, SIDE_LABELS } from "@/config/kyc";
import type { KycDocumentType } from "@/types/domain";

const SPRING = { type: "spring", stiffness: 500, damping: 35 } as const;

const ICONS: Record<KycDocumentType, LucideIcon> = {
  national_id: IdCard,
  passport: BookUser,
  drivers_license: CreditCard,
  utility_bill: FileText,
  bank_statement: Building2,
  node_certificate: Server,
};

/** Every side the chosen document needs has an aligned upload. */
export function documentComplete(draft: KycDraftApi["draft"]): boolean {
  if (!draft.documentType) return false;
  return DOCUMENT_TYPES[draft.documentType].sides.every((side) => draft.uploads[side] !== undefined);
}

interface Props {
  tier: 1 | 2;
  api: KycDraftApi;
  showErrors: boolean;
  moveFocus: boolean;
}

export function DocumentStep({ tier, api, showErrors, moveFocus }: Props) {
  const { draft, patch, setUpload, clearUploads } = api;
  const def = draft.documentType ? DOCUMENT_TYPES[draft.documentType] : null;
  const missing = showErrors && def && !documentComplete(draft);

  const choose = (id: KycDocumentType) => {
    if (id === draft.documentType) return;
    clearUploads();
    patch({ documentType: id });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <StepHeading moveFocus={moveFocus}>{tier === 1 ? "Identity document" : "Proof of address or node ownership"}</StepHeading>
        <p className="mt-1 text-xs text-slate-500">
          {tier === 1
            ? "Choose a document, then add every side. Keep all four corners in frame and the text readable."
            : "Upload a recent document showing your name and address, or proof that you operate a node."}
        </p>
      </div>

      <div role="radiogroup" aria-label="Document type" className="grid gap-2">
        {DOCUMENT_TYPES_BY_TIER[tier].map((id) => {
          const option = DOCUMENT_TYPES[id];
          const Icon = ICONS[id];
          const selected = draft.documentType === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`doc-type-${id}`}
              onClick={() => choose(id)}
              className={`relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 ${
                selected ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-slate-950" : "border-slate-300"}`}
              >
                {selected && <motion.span layoutId={`doc-dot-${tier}`} transition={SPRING} className="h-2.5 w-2.5 rounded-full bg-slate-950" />}
              </span>
            </button>
          );
        })}
      </div>

      {showErrors && !def && (
        <p role="alert" className="text-xs font-medium text-rose-600">
          Choose a document type to continue.
        </p>
      )}

      {def && (
        <div className="flex flex-col gap-5" data-testid="dropzones">
          {def.sides.map((side) => (
            <DocumentDropzone
              key={`${def.id}-${side}`}
              side={side}
              label={SIDE_LABELS[def.id][side]}
              hint={side === "back" ? "Flip the document over" : def.hint}
              value={draft.uploads[side]}
              onChange={(item) => setUpload(side, item)}
            />
          ))}
        </div>
      )}

      {missing && (
        <p role="alert" data-testid="document-missing" className="text-xs font-medium text-rose-600">
          {def.sides.length > 1 ? "Add every side of your document to continue." : "Add your document to continue."}
        </p>
      )}
    </div>
  );
}
