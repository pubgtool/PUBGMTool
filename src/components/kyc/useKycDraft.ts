"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UploadSide } from "@/config/kyc";
import type { KycDocumentType } from "@/types/domain";

/** Only display metadata is kept, and only in memory: the file itself is never read into state. */
export interface UploadItem {
  name: string;
  size: number;
  kind: "image" | "pdf" | "sample";
  /** Object URL for the on-screen thumbnail; revoked when the upload is removed. */
  previewUrl: string | null;
}

export interface KycDraft {
  fullName: string;
  dob: string;
  country: string;
  documentType: KycDocumentType | null;
  uploads: Partial<Record<UploadSide, UploadItem>>;
  livenessDone: boolean;
  consent: boolean;
}

export const EMPTY_DRAFT: KycDraft = {
  fullName: "",
  dob: "",
  country: "",
  documentType: null,
  uploads: {},
  livenessDone: false,
  consent: false,
};

const revoke = (item?: UploadItem) => {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
};

/**
 * The wizard's working state. It lives in the always-mounted modal, so closing
 * and reopening the sheet resumes where the user left off, but it is never
 * written to storage and is dropped on submission or sign-out.
 */
export function useKycDraft() {
  const [draft, setDraft] = useState<KycDraft>(EMPTY_DRAFT);
  const latest = useRef(draft);
  latest.current = draft;

  useEffect(
    () => () => {
      Object.values(latest.current.uploads).forEach(revoke);
    },
    [],
  );

  const patch = useCallback((changes: Partial<KycDraft>) => setDraft((d) => ({ ...d, ...changes })), []);

  const setUpload = useCallback((side: UploadSide, item: UploadItem | null) => {
    setDraft((d) => {
      revoke(d.uploads[side]);
      const uploads = { ...d.uploads };
      if (item) uploads[side] = item;
      else delete uploads[side];
      return { ...d, uploads };
    });
  }, []);

  const clearUploads = useCallback(() => {
    setDraft((d) => {
      Object.values(d.uploads).forEach(revoke);
      return { ...d, uploads: {} };
    });
  }, []);

  const reset = useCallback(() => {
    setDraft((d) => {
      Object.values(d.uploads).forEach(revoke);
      return EMPTY_DRAFT;
    });
  }, []);

  return { draft, patch, setUpload, clearUploads, reset };
}

export type KycDraftApi = ReturnType<typeof useKycDraft>;
