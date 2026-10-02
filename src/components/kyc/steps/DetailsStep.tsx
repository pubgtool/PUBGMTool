"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/auth/fields";
import { CountryPicker } from "@/components/kyc/CountryPicker";
import { StepHeading } from "@/components/kyc/StepHeading";
import type { KycDraftApi } from "@/components/kyc/useKycDraft";
import { dobBounds, validateDob, validateFullName } from "@/lib/kyc";

export type DetailsErrors = { fullName: string | null; dob: string | null; country: string | null };

export function detailsErrors(draft: KycDraftApi["draft"], now: number): DetailsErrors {
  return {
    fullName: validateFullName(draft.fullName),
    dob: validateDob(draft.dob, now),
    country: draft.country ? null : "Choose your country or region.",
  };
}

interface Props {
  api: KycDraftApi;
  now: number;
  showErrors: boolean;
  moveFocus: boolean;
}

export function DetailsStep({ api, now, showErrors, moveFocus }: Props) {
  const { draft, patch } = api;
  const [touched, setTouched] = useState({ fullName: false, dob: false, country: false });
  const errors = detailsErrors(draft, now);
  const shown = (key: keyof DetailsErrors) => (showErrors || touched[key] ? errors[key] : null);
  const touch = (key: keyof DetailsErrors) => () => setTouched((t) => ({ ...t, [key]: true }));
  const { min, max } = dobBounds(now);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <StepHeading moveFocus={moveFocus}>Personal details</StepHeading>
        <p className="mt-1 text-xs text-fg-secondary">Enter them exactly as they appear on your identity document.</p>
      </div>

      <Field id="kyc-name" label="Full name" error={shown("fullName")}>
        <input
          id="kyc-name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={80}
          placeholder="e.g. Ada Lovelace"
          value={draft.fullName}
          onChange={(event) => patch({ fullName: event.target.value })}
          onBlur={touch("fullName")}
          aria-invalid={Boolean(shown("fullName"))}
          aria-describedby={shown("fullName") ? "kyc-name-error" : undefined}
          className={inputClass(Boolean(shown("fullName")))}
        />
      </Field>

      <Field id="kyc-dob" label="Date of birth" error={shown("dob")} hint={`You must be at least 18 years old.`}>
        <input
          id="kyc-dob"
          type="date"
          autoComplete="bday"
          min={min}
          max={max}
          value={draft.dob}
          onChange={(event) => patch({ dob: event.target.value })}
          onBlur={touch("dob")}
          aria-invalid={Boolean(shown("dob"))}
          aria-describedby={shown("dob") ? "kyc-dob-error" : "kyc-dob-hint"}
          className={`${inputClass(Boolean(shown("dob")))} appearance-none`}
        />
      </Field>

      <Field id="kyc-country" label="Country / Region" error={shown("country")}>
        <CountryPicker
          id="kyc-country"
          value={draft.country}
          onChange={(code) => {
            patch({ country: code });
            touch("country")();
          }}
          onBlur={touch("country")}
          invalid={Boolean(shown("country"))}
          describedBy={shown("country") ? "kyc-country-error" : undefined}
        />
      </Field>
    </div>
  );
}
