"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { formatAmount } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { WITHDRAWAL_ETA, WITHDRAWAL_FEE, getNetwork } from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

const PROCESSING_MS = 600;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface WithdrawDraft {
  amount: number;
  address: string;
  network: PaymentNetwork;
}

interface Props {
  draft: WithdrawDraft | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export function WithdrawConfirmSheet({ draft, onClose, onSubmitted }: Props) {
  return (
    <BottomSheet open={draft !== null} onClose={onClose}>
      {draft && <Body draft={draft} onClose={onClose} onSubmitted={onSubmitted} />}
    </BottomSheet>
  );
}

function Body({ draft, onClose, onSubmitted }: { draft: WithdrawDraft; onClose: () => void; onSubmitted: () => void }) {
  const withdraw = useAppStore((s) => s.withdraw);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const info = getNetwork(draft.network);
  const net = Math.max(0, Math.round((draft.amount - WITHDRAWAL_FEE) * 1e6) / 1e6);

  const submit = async () => {
    if (!acknowledged || busy) return;
    setBusy(true);
    setError(null);
    await wait(PROCESSING_MS);
    if (!mounted.current) return;
    const result = withdraw(draft.amount, draft.address, draft.network);
    if (result.ok) {
      toast.success(`Withdrawal request submitted: ${formatAmount(net)} USDT pending`);
      onSubmitted();
    } else {
      setError(result.error);
      toast.error(result.error);
      setBusy(false);
    }
  };

  const rows: Array<[string, React.ReactNode]> = [
    ["Network", `${info.label} (${info.chain})`],
    ["Amount", `${formatAmount(draft.amount)} USDT`],
    ["Network gas fee", `-${formatAmount(WITHDRAWAL_FEE)} USDT`],
    ["Est. arrival", WITHDRAWAL_ETA],
  ];

  return (
    <form
      className="flex flex-col gap-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <SheetTitle className="text-lg font-semibold tracking-tight">Review Withdrawal</SheetTitle>
          <SheetDescription className="mt-1 text-xs text-slate-500">
            Check the details. Blockchain transfers can&apos;t be reversed.
          </SheetDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full bg-slate-100 p-2 text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Destination</p>
        <p className="mt-1.5 break-all rounded-2xl bg-slate-50 px-3.5 py-3 font-mono text-[13px] font-medium leading-relaxed">
          {draft.address}
        </p>
      </div>

      <dl className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-mono font-medium tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 bg-slate-50 px-3.5 py-3 text-sm">
          <dt className="font-semibold">You receive</dt>
          <dd className="font-mono text-base font-semibold tabular-nums text-emerald-600">
            {formatAmount(net)} USDT
          </dd>
        </div>
      </dl>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-3.5 py-3 text-xs text-slate-600 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-900">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-slate-950"
        />
        <span>
          I&apos;ve verified that this is a <strong className="font-semibold text-slate-800">{info.chain} ({info.short})</strong>{" "}
          address I control.
        </span>
      </label>

      {error && (
        <p role="alert" className="-mt-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={acknowledged && !busy ? { scale: 0.98 } : undefined}
        transition={SPRING}
        disabled={!acknowledged && !busy}
        aria-busy={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Submitting…
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" aria-hidden /> Confirm Withdrawal Request
          </>
        )}
      </motion.button>
    </form>
  );
}
