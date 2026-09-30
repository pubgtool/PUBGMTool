"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { NodeCalculator } from "@/components/vip/NodeCalculator";
import { NodeCard } from "@/components/vip/NodeCard";
import { NodeSheet } from "@/components/vip/NodeSheet";
import { SettlementCard } from "@/components/vip/SettlementCard";
import { TelemetryFeed } from "@/components/vip/TelemetryFeed";
import { VIPMatrixModal } from "@/components/vip/VIPMatrixModal";
import { TierBadge } from "@/components/vip/parts";
import type { Cta } from "@/components/vip/cta";
import { PROJECTION_NOTE } from "@/config/nodes";
import { formatAmount } from "@/lib/format";
import { useRequireAuth } from "@/lib/hooks";
import { currentNode, quoteAllocation } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.95 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const HIGHLIGHT_MS = 2_400;

export function VIPView() {
  const tiers = useAppStore((s) => s.tiers);
  const positions = useAppStore((s) => s.positions);
  const balances = useAppStore((s) => s.balances);
  const kycTier = useAppStore((s) => s.user.kycTier);
  const guest = useAppStore((s) => s.user.isGuest);
  const focusedTierId = useAppStore((s) => s.focusedTierId);
  const setFocusedTierId = useAppStore((s) => s.setFocusedTierId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setWalletSection = useAppStore((s) => s.setWalletSection);
  const openKycModal = useAppStore((s) => s.openKycModal);
  const requireAuth = useRequireAuth();
  const reduceMotion = useReducedMotion();

  const [sheetTier, setSheetTier] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<{ open: boolean; level: number | null }>({ open: false, level: null });
  const [calcLevel, setCalcLevel] = useState(1);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.level - b.level), [tiers]);
  const node = currentNode(positions);
  const useVoucher = balances.trialVoucher > 0;

  // Consume the "Inspect Tier" intent from Main: scroll to the card and ring it briefly.
  useEffect(() => {
    if (!focusedTierId) return;
    const el = cardRefs.current.get(focusedTierId);
    setFocusedTierId(null);
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setHighlightId(focusedTierId);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  }, [focusedTierId, setFocusedTierId, reduceMotion]);
  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const closeSheet = useCallback(() => setSheetTier(null), []);
  const closeMatrix = useCallback(() => setMatrix((m) => ({ ...m, open: false })), []);

  const openDeposit = () => {
    setWalletSection("deposit");
    setActiveTab("wallet");
  };

  const allocate = (tierId: string) => {
    if (!requireAuth("Create an account to allocate a compute node", "register")) return;
    setSheetTier(tierId);
  };

  const onCardAction = (tierId: string, tierName: string, cta: Cta) => {
    if (cta.kind === "signin") requireAuth(`Create an account to allocate ${tierName}`, "register");
    else if (cta.kind === "kyc") openKycModal();
    else if (cta.kind === "activate" || cta.kind === "upgrade" || cta.kind === "deposit") setSheetTier(tierId);
  };

  return (
    <div className="-mb-20 flex min-h-screen flex-1 flex-col bg-slate-950 pb-28 text-slate-100">
      <header className="px-4 pb-1 pt-5">
        <h1 className="text-xl font-semibold tracking-tight">Compute Nodes</h1>
        <p className="mt-0.5 text-xs text-slate-400">Allocate hardware capacity. Output is distributed every 24 hours.</p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400">Your node</dt>
            <dd data-testid="header-node" className="mt-1 flex items-center gap-2">
              {node ? (
                <>
                  <TierBadge level={node.tierLevel} />
                  <span className="min-w-0 truncate text-xs text-slate-300">{sorted.find((t) => t.id === node.tierId)?.title ?? node.tierName}</span>
                </>
              ) : (
                <span className="text-sm text-slate-400">None yet</span>
              )}
            </dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 py-2 pl-3 pr-2">
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-slate-400">Available USDT</dt>
              <dd data-testid="header-available" className="mt-1 truncate font-mono text-sm font-semibold tabular-nums">
                {formatAmount(balances.available)}
              </dd>
            </div>
            <motion.button
              type="button"
              whileTap={TAP}
              transition={SPRING}
              onClick={openDeposit}
              aria-label="Deposit"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </motion.button>
          </div>
        </dl>
      </header>

      <main className="flex flex-col gap-4 px-4 pt-4">
        <SettlementCard />

        <NodeCalculator
          level={calcLevel}
          onLevel={setCalcLevel}
          onCompare={(level) => setMatrix({ open: true, level })}
          onAllocate={(level) => {
            const tier = sorted.find((t) => t.level === level);
            if (tier) allocate(tier.id);
          }}
        />

        <section aria-label="Node catalog" className="flex flex-col gap-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Node catalog</h2>
          {sorted.map((tier) => {
            const quote = quoteAllocation({ tier, positions, balances, kycTier, isGuest: guest, useVoucher });
            return (
              <NodeCard
                key={tier.id}
                tier={tier}
                quote={quote}
                highlighted={highlightId === tier.id}
                register={(el) => {
                  if (el) cardRefs.current.set(tier.id, el);
                  else cardRefs.current.delete(tier.id);
                }}
                onAction={(cta) => onCardAction(tier.id, tier.name, cta)}
              />
            );
          })}
        </section>

        <TelemetryFeed />

        <p className="px-1 pb-2 text-center text-[11px] leading-relaxed text-slate-400">
          Sandbox: allocations, output and network figures are simulated and stored in this browser. {PROJECTION_NOTE}
        </p>
      </main>

      <NodeSheet tierId={sheetTier} onClose={closeSheet} />
      <VIPMatrixModal open={matrix.open} targetLevel={matrix.level} onClose={closeMatrix} onAllocate={allocate} />
    </div>
  );
}
