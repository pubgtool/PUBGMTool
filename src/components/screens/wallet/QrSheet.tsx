"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, Copy, RefreshCw, X } from "lucide-react";
import { NetworkBadge } from "@/components/screens/wallet/NetworkBadge";
import { CTA, EYEBROW, FOCUS, SPRING, TAP, TAP_CTA, WARNING_STRIP } from "@/components/screens/wallet/styles";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { QrCode } from "@/components/ui/QrCode";
import { getNetwork } from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

interface QrSheetProps {
  open: boolean;
  onClose: () => void;
  network: PaymentNetwork;
  address: string;
  copied: boolean;
  expired: boolean;
  onCopy: () => void;
  onRestart: () => void;
}

/** Full-size deposit QR in a modal, so the page itself stays compact. */
export function QrSheet({ open, onClose, network, address, copied, expired, onCopy, onRestart }: QrSheetProps) {
  const info = getNetwork(network);
  return (
    <BottomSheet open={open} onClose={onClose} tone="dark">
      <div className="flex flex-col gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SheetTitle className="text-lg font-bold tracking-tight">Scan to deposit</SheetTitle>
            <SheetDescription className="mt-1 text-xs leading-relaxed text-fg-secondary">
              Send only USDT on {info.chain} ({info.short}). Other assets or networks can&apos;t be recovered.
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

        <div className="flex justify-center">
          <NetworkBadge id={network} />
        </div>

        <div className="relative mx-auto w-[min(15.5rem,44dvh)]">
          <div
            className={`rounded-2xl bg-white p-3 shadow-[0_0_48px_-12px_rgba(251,191,36,0.55)] ring-1 ring-amber-300/50 transition-opacity ${
              expired ? "opacity-20" : ""
            }`}
          >
            <QrCode value={address} label={`${info.label} deposit address QR code`} className="block h-auto w-full" />
          </div>
          {expired && (
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-fg">
              Window expired
            </span>
          )}
        </div>

        <div>
          <p className={EYEBROW}>Deposit address</p>
          <p
            data-testid="qr-sheet-address"
            className="mt-2 break-all rounded-2xl border border-gray-200 bg-canvas/70 px-3.5 py-3 font-mono text-[13px] font-medium leading-relaxed text-fg"
          >
            {address}
          </p>
        </div>

        <p className={WARNING_STRIP}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <span>
            <strong className="font-bold text-amber-900">Demo address</strong> — nobody holds its keys. Never send real
            funds to it.
          </span>
        </p>

        {expired ? (
          <motion.button type="button" whileTap={TAP_CTA} transition={SPRING} onClick={onRestart} className={CTA}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Restart payment window
          </motion.button>
        ) : (
          <motion.button type="button" whileTap={TAP_CTA} transition={SPRING} onClick={onCopy} className={CTA}>
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden /> Copy Address
              </>
            )}
          </motion.button>
        )}
      </div>
    </BottomSheet>
  );
}
