"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowRightLeft, Plus, Ticket } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { GoldGlow } from "@/components/ui/GoldGlow";
import { BTN_GOLD, BTN_PRIMARY, CARD, EYEBROW, VIP_PANEL } from "@/components/ui/styles";
import { CrownBadge, rankLabel } from "@/components/vip/CrownBadge";
import { NodeSheet } from "@/components/vip/NodeSheet";
import { VIPMatrixModal } from "@/components/vip/VIPMatrixModal";
import { ctaFor, usdt, type Cta } from "@/components/vip/cta";
import { CYCLE_LABEL } from "@/config/nodes";
import { FESTIVAL, bonusFor } from "@/lib/festival";
import { formatAmount, formatRate } from "@/lib/format";
import { useRequireAuth } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { currentNode, isTrialTier, projectOutput, quoteAllocation, utilizationPct } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";
import { useBoost } from "@/lib/useBoost";
import type { VipTier } from "@/types/domain";

const PERIODS = [1, 7, 30] as const;
type Period = (typeof PERIODS)[number];
const HIGHLIGHT_MS = 2_400;

function SlotMeter({ tier }: { tier: VipTier }) {
  const pct = utilizationPct(tier);
  const left = Math.max(0, tier.capacity - tier.activeNodes);
  return (
    <div data-testid={`slots-${tier.level}`}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-fg-secondary">{left > 0 ? `${formatAmount(left, 0)} slots left` : "Sold out"}</span>
        <span className="font-mono tabular-nums text-fg-muted">{Math.round(pct)}% allocated</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${rankLabel(tier.level)} slots allocated`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"
      >
        <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

interface CardProps {
  tier: VipTier;
  cta: Cta;
  isCurrent: boolean;
  highlighted: boolean;
  /** Festival bonus this activation would pay; 0 when none applies. */
  bonus: number;
  /** Level of the running node when this card is a step up from it. */
  compareFrom: number | null;
  register: (id: string, el: HTMLElement | null) => void;
  onAction: (tier: VipTier, cta: Cta) => void;
  onCompare: (level: number) => void;
}

function TierCard({ tier, cta, isCurrent, highlighted, bonus, compareFrom, register, onAction, onCompare }: CardProps) {
  const [days, setDays] = useState<Period>(1);
  const trial = isTrialTier(tier);
  const { total } = projectOutput(tier, days, false);
  const shownDays = Math.min(days, tier.durationDays ?? days);
  const roi = tier.feeUsdt > 0 ? (total / tier.feeUsdt) * 100 : 0;
  const spec: Array<[string, string]> = [
    ["Allocation", trial ? "Free" : `${usdt(tier.feeUsdt)} USDT`],
    ["Daily yield", trial ? "Fixed" : formatRate(tier.dailyRatePct)],
    ["Compute power", `${formatAmount(tier.hashrateTh, 0)} TH/s`],
    ["Term", tier.durationDays ? `${tier.durationDays} days` : "Open term"],
    ...(tier.minKycTier > 0 ? ([["Verification", `Level ${tier.minKycTier}`]] as Array<[string, string]>) : []),
  ];

  return (
    <article
      ref={(el) => register(tier.id, el)}
      data-testid={`vip-card-${tier.level}`}
      data-current={isCurrent || undefined}
      aria-label={`${rankLabel(tier.level)} ${tier.title}`}
      className={`${CARD} p-5 transition-shadow duration-500 ${highlighted ? "ring-2 ring-gray-900 ring-offset-2" : isCurrent ? "ring-1 ring-emerald-500/60" : ""}`}
    >
      <div className="flex items-center gap-5">
        <CrownBadge level={tier.level} />
        <div className="min-w-0 flex-1">
          {isCurrent && <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Your node</p>}
          <h3 className="text-xl font-black leading-tight tracking-tight text-gray-900">{tier.title}</h3>
          <p className="mt-1 text-sm text-fg-secondary">{trial ? "Free for new accounts" : `${usdt(tier.feeUsdt)} USDT allocation`}</p>
        </div>
      </div>

      <p className={`mt-7 ${EYEBROW}`}>Projected output</p>
      <p className="mt-1 font-black text-3xl text-emerald-600 tracking-tight">
        <AnimatedNumber value={total} prefix="+" testId={`tier-output-${tier.level}`} />{" "}
        <span className="text-lg font-extrabold text-emerald-700/80">USDT / {shownDays === 1 ? "DAY" : `${shownDays} DAYS`}</span>
      </p>
      <p className="mt-1 text-sm text-fg-secondary">
        {trial ? `Free trial · no deposit · ${tier.durationDays}-day term` : `${formatRate(tier.dailyRatePct)} daily yield · ROI +${formatAmount(roi, roi < 10 ? 2 : 1)}%`}
      </p>

      <div role="group" aria-label={`${rankLabel(tier.level)} projection period`} className="mt-5 grid grid-cols-3 gap-2">
        {PERIODS.map((d) => {
          const on = d === days;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => setDays(d)}
              data-testid={`chip-${tier.level}-${d}`}
              className={`min-h-11 rounded-xl px-2 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                on ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {d} {d === 1 ? "Day" : "Days"}
            </button>
          );
        })}
      </div>

      <dl className="mt-6 divide-y divide-gray-100 border-y border-gray-100 text-sm">
        {spec.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-fg-secondary">{label}</dt>
            <dd className="font-mono font-semibold tabular-nums text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <SlotMeter tier={tier} />
      </div>

      {bonus > 0 && (
        <p data-testid={`bonus-${tier.level}`} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-900">
          <Ticket className="h-4 w-4 shrink-0" aria-hidden />
          Boost ticket: +{formatAmount(bonus)} USDT bonus on activation
        </p>
      )}

      <button type="button" disabled={cta.disabled} onClick={() => onAction(tier, cta)} data-testid={`cta-${tier.level}`} className={`${BTN_PRIMARY} mt-5`}>
        {cta.label}
      </button>
      {compareFrom !== null && (
        <button
          type="button"
          onClick={() => onCompare(tier.level)}
          data-testid={`compare-${tier.level}`}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          <ArrowRightLeft className="h-4 w-4" aria-hidden />
          Compare with VIP {compareFrom}
        </button>
      )}
    </article>
  );
}

function BoostStrip() {
  const { status, claim } = useBoost();
  if (status === "paid" || status === "ineligible") return null;

  return (
    <section aria-label="Festival boost" data-testid="vip-boost" data-status={status} className={`${VIP_PANEL} p-5`}>
      <GoldGlow />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200">{FESTIVAL.title}</p>
        <p className="mt-2 text-2xl font-black leading-tight tracking-tight">
          +{FESTIVAL.bonusPct}% <span className="text-amber-300">first activation bonus</span>
        </p>
        {status === "held" ? (
          <p className="mt-2 text-sm font-semibold text-amber-100">Ticket active until {CYCLE_LABEL}. It pays on your first paid node.</p>
        ) : (
          <button type="button" onClick={() => void claim()} data-testid="vip-claim-boost" className={`${BTN_GOLD} mt-4`}>
            <Ticket className="h-5 w-5" aria-hidden />
            Claim Boost Ticket
          </button>
        )}
      </div>
    </section>
  );
}

export function VIPView() {
  const { t } = useT();
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
  const { status: boost } = useBoost();

  const [sheetTier, setSheetTier] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<{ open: boolean; level: number | null }>({ open: false, level: null });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.level - b.level), [tiers]);
  const node = currentNode(positions);
  const useVoucher = balances.trialVoucher > 0;

  // "View tier" from Home: scroll to the card and ring it briefly.
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

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);
  const closeSheet = useCallback(() => setSheetTier(null), []);
  const closeMatrix = useCallback(() => setMatrix((m) => ({ ...m, open: false })), []);
  const onCompare = useCallback((level: number) => setMatrix({ open: true, level }), []);

  const allocate = (tierId: string) => {
    if (!requireAuth("Create an account to allocate a compute node", "register")) return;
    setSheetTier(tierId);
  };

  const onAction = (tier: VipTier, cta: Cta) => {
    if (cta.kind === "signin") requireAuth(`Create an account to allocate ${tier.name}`, "register");
    else if (cta.kind === "kyc") openKycModal();
    else if (cta.kind === "activate" || cta.kind === "upgrade" || cta.kind === "deposit") setSheetTier(tier.id);
  };

  const openDeposit = () => {
    setWalletSection("deposit");
    setActiveTab("wallet");
  };

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("staking.title")}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t("staking.sub", { time: CYCLE_LABEL })}</p>
      </header>

      <section aria-label="Your balance" className={`${CARD} p-5`}>
        <p className={EYEBROW}>Available balance</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span data-testid="header-available" className="font-mono text-4xl font-black tracking-tight tabular-nums text-gray-900">
            <AnimatedNumber value={balances.available} />
          </span>
          <span className="text-base font-bold text-fg-muted">USDT</span>
        </p>
        <div data-testid="header-node" className="mt-3 flex items-center gap-2 text-sm text-fg-secondary">
          {node ? (
            <>
              <CrownBadge level={node.tierLevel} size="pill" />
              <span className="min-w-0 truncate">{sorted.find((x) => x.id === node.tierId)?.title ?? node.tierName}</span>
            </>
          ) : (
            <span>No node running yet. Pick a level below.</span>
          )}
        </div>
        {balances.trialVoucher > 0 && <p className="mt-2 text-sm font-semibold text-amber-700">{formatAmount(balances.trialVoucher)} USDT trial voucher applies automatically</p>}
        <button type="button" onClick={openDeposit} data-testid="vip-deposit" className={`${BTN_PRIMARY} mt-5`}>
          <Plus className="h-5 w-5" aria-hidden />
          Deposit USDT
        </button>
      </section>

      <BoostStrip />

      {sorted.map((tier) => {
        const quote = quoteAllocation({ tier, positions, balances, kycTier, isGuest: guest, useVoucher });
        const cta = ctaFor(quote);
        const payable = cta.kind === "activate" || cta.kind === "deposit" || cta.kind === "signin" || cta.kind === "kyc";
        const bonus = boost === "held" && payable && tier.feeUsdt > 0 ? bonusFor(tier.feeUsdt) : 0;
        return (
          <TierCard
            key={tier.id}
            tier={tier}
            cta={cta}
            isCurrent={node?.tierId === tier.id}
            highlighted={highlightId === tier.id}
            bonus={bonus}
            compareFrom={node && tier.level > node.tierLevel ? node.tierLevel : null}
            register={register}
            onAction={onAction}
            onCompare={onCompare}
          />
        );
      })}

      <p className="px-2 text-center text-xs text-fg-muted">Projections use each node&apos;s current daily rate, simple and not compounded. Actual output can differ.</p>

      <NodeSheet tierId={sheetTier} onClose={closeSheet} />
      <VIPMatrixModal open={matrix.open} targetLevel={matrix.level} onClose={closeMatrix} onAllocate={allocate} />
    </main>
  );
}
