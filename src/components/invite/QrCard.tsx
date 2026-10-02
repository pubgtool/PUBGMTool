"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { QrModel } from "@/components/invite/qr";
import { toast } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { useT } from "@/lib/i18n";

const COPIED_MS = 1_500;
const QUIET = 3;

function QrSvg({ model, label }: { model: QrModel; label: string }) {
  const span = model.size + QUIET * 2;
  return (
    <svg data-testid="invite-qr" role="img" aria-label={label} viewBox={`${-QUIET} ${-QUIET} ${span} ${span}`} shapeRendering="crispEdges" className="h-full w-full rounded-[18px]">
      <rect x={-QUIET} y={-QUIET} width={span} height={span} fill="#fff" />
      <path d={model.path} fill="#020617" />
    </svg>
  );
}

interface CopyPillProps {
  value: string;
  label: string;
  success: string;
  testId: string;
}

function CopyPill({ value, label, success, testId }: CopyPillProps) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    if (!(await copyText(value))) {
      toast.error(t("invite.copyFailed"));
      return;
    }
    toast.success(success);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, [value, success, t]);

  return (
    <button
      type="button"
      onClick={copy}
      data-testid={testId}
      data-copied={copied || undefined}
      aria-label={label}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium outline-none transition-[transform,background-color] min-[380px]:px-4 active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900 ${
        copied ? "bg-emerald-100 text-emerald-800" : "bg-[#E5E7EB] text-gray-800 hover:bg-[#D1D5DB]"
      }`}
    >
      {/* Both labels share one grid cell, so the button keeps one width in either state. */}
      <span className="grid">
        <span className={`col-start-1 row-start-1 ${copied ? "invisible" : ""}`}>{t("invite.copy")}</span>
        <span className={`col-start-1 row-start-1 flex items-center justify-center gap-1.5 ${copied ? "" : "invisible"}`}>
          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          {t("invite.copied")}
        </span>
      </span>
    </button>
  );
}

function Field({ label, action, children }: { label: string; action: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F3F4F6] py-2.5 pl-4 pr-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-fg-muted">{label}</p>
        {children}
      </div>
      {action}
    </div>
  );
}

interface Props {
  model: QrModel;
  code: string;
  link: string;
}

export function QrCard({ model, code, link }: Props) {
  const { t } = useT();
  return (
    <section aria-label={t("invite.title")} className="relative z-10 mx-4 my-2 rounded-[32px] bg-white p-6 shadow-2xl">
      <div className="mx-auto aspect-square w-full max-w-[220px] rounded-3xl border border-gray-200 bg-white p-1.5">
        <QrSvg model={model} label={t("invite.qrLabel")} />
      </div>

      <Field
        label={t("invite.code")}
        action={<CopyPill value={code} label={t("invite.copyCode")} success={t("invite.codeCopied")} testId="invite-copy-code" />}
      >
        <p data-testid="invite-code" className="mt-0.5 whitespace-nowrap font-mono text-2xl font-black leading-8 tracking-wider text-black max-[380px]:text-xl">
          {code}
        </p>
      </Field>

      <Field
        label={t("invite.link")}
        action={<CopyPill value={link} label={t("invite.copyLink")} success={t("invite.linkCopied")} testId="invite-copy-link" />}
      >
        <p data-testid="invite-link" title={link} className="mt-0.5 truncate text-sm font-medium leading-6 text-gray-800 underline decoration-gray-400 underline-offset-2">
          {link}
        </p>
      </Field>
    </section>
  );
}
