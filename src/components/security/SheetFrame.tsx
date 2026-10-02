"use client";

import { Loader2, X } from "lucide-react";
import { SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { BTN_PRIMARY } from "@/components/ui/styles";
import { useT } from "@/lib/i18n";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
}

/** Title, description and close button shared by every security sheet. */
export function SheetFrame({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SheetTitle className="text-lg font-bold tracking-tight text-gray-900">{title}</SheetTitle>
          <SheetDescription className="mt-1 text-xs leading-relaxed text-fg-secondary">{description}</SheetDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("security.close")}
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 outline-none transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3.5">{children}</div>
    </div>
  );
}

export function SubmitButton({ busy, disabled, label, testId, danger = false }: { busy: boolean; disabled: boolean; label: string; testId: string; danger?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || busy}
      aria-busy={busy}
      data-testid={testId}
      className={
        danger
          ? "flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-[15px] font-bold text-rose-600 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          : `${BTN_PRIMARY} mt-1`
      }
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {label}
    </button>
  );
}
