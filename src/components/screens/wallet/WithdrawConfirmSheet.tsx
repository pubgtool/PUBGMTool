"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { CodeField } from "@/components/security/Fields";
import { NetworkTile } from "@/components/screens/wallet/NetworkBadge";
import { CTA, EYEBROW, FOCUS, SPRING, TAP, TAP_CTA } from "@/components/screens/wallet/styles";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { formatAmount } from "@/lib/format";
import { selectHasPaymentPassword, selectHasTwoFactor, useAppStore } from "@/lib/store";
import { WITHDRAWAL_ETA, WITHDRAWAL_FEE, getNetwork } from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

const PROCESSING_MS = 600;
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
  const needsPin = useAppStore(selectHasPaymentPassword);
  const needsCode = useAppStore(selectHasTwoFactor);
  const verifyPaymentPassword = useAppStore((s) => s.verifyPaymentPassword);
  const verifyTwoFactor = useAppStore((s) => s.verifyTwoFactor);
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
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

  const verified = (!needsPin || pin.length === 6) && (!needsCode || code.length === 6);

  const submit = async () => {
    if (!acknowledged || !verified || busy) return;
    setBusy(true);
    setError(null);
    const checks = [needsPin && (() => verifyPaymentPassword(pin)), needsCode && (() => verifyTwoFactor(code))];
    for (const check of checks) {
      if (!check) continue;
      const checked = await check();
      if (!checked.ok) {
        if (mounted.current) {
          setError(checked.error);
          setBusy(false);
        }
        return;
      }
    }
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
    [
      "Network",
      <span key="network" className="inline-flex items-center gap-2">
        <NetworkTile id={draft.network} size="xs" />
        {info.label} ({info.chain})
      </span>,
    ],
    ["Amount", `${formatAmount(draft.amount)} USDT`],
    ["Network gas fee", `-${formatAmount(WITHDRAWAL_FEE)} USDT`],
    ["Est. arrival", WITHDRAWAL_ETA],
  ];

  return (
    <form
      className="flex flex-col gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SheetTitle className="text-lg font-bold tracking-tight">Review Withdrawal</SheetTitle>
          <SheetDescription className="mt-1 text-xs leading-relaxed text-fg-secondary">
            Check the details. Blockchain transfers can&apos;t be reversed.
          </SheetDescription>
        </div>
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={onClose}
          aria-label="Close"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-fg-secondary transition-colors hover:text-fg ${FOCUS}`}
        >
          <X className="h-4 w-4" aria-hidden />
        </motion.button>
      </div>

      <div>
        <p className={EYEBROW}>Destination</p>
        <p className="mt-2 break-all rounded-2xl border border-gray-200 bg-canvas/70 px-3.5 py-3 font-mono text-[13px] font-medium leading-relaxed">
          {draft.address}
        </p>
      </div>

      <dl className="overflow-hidden rounded-2xl border border-gray-200 bg-canvas/40">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 border-b border-dashed border-gray-200 px-3.5 py-2.5 text-sm"
          >
            <dt className="text-fg-secondary">{label}</dt>
            <dd className="text-right font-mono font-medium tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 bg-emerald-500/10 px-3.5 py-3.5 text-sm">
          <dt className="font-bold">You receive</dt>
          <dd className="font-mono text-lg font-extrabold tabular-nums text-emerald-700 [text-shadow:0_0_18px_rgba(16,185,129,0.45)]">
            {formatAmount(net)} USDT
          </dd>
        </div>
      </dl>

      {needsPin && <CodeField masked label="Transaction password" value={pin} onChange={setPin} testId="wd-pin" />}
      {needsCode && <CodeField label="Authenticator code" value={code} onChange={setCode} testId="wd-code" />}

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-amber-500/[0.06] px-3.5 py-3.5 text-xs leading-relaxed text-fg-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-400">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"
        />
        <span>
          I&apos;ve verified that this is a <strong className="font-semibold text-fg">{info.chain} ({info.short})</strong>{" "}
          address I control.
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="-mt-1 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-xs leading-relaxed text-rose-800"
        >
          {error}
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={acknowledged && verified && !busy ? TAP_CTA : undefined}
        transition={SPRING}
        disabled={(!acknowledged || !verified) && !busy}
        aria-busy={busy}
        className={CTA}
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
