"use client";

import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { BTN_PRIMARY, CARD } from "@/components/ui/styles";
import { CrownBadge, rankLabel, rankName } from "@/components/vip/CrownBadge";
import { NodeSheet } from "@/components/vip/NodeSheet";
import { ctaFor, usdt, type Cta, type CtaKind } from "@/components/vip/cta";
import { formatRate } from "@/lib/format";
import { useRequireAuth } from "@/lib/hooks";
import { type MessageKey, useT } from "@/lib/i18n";
import { type AllocationQuote, currentNode, quoteAllocation, utilizationPct } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";
import type { VipTier } from "@/types/domain";

const MAX_CARDS = 3;

type PoolStatus = "open" | "soldOut" | "closed";

const STATUS: Record<PoolStatus, { label: MessageKey; tone: string }> = {
  open: { label: "home.pool.open", tone: "bg-emerald-50 text-emerald-700" },
  soldOut: { label: "home.pool.soldOut", tone: "bg-rose-50 text-rose-700" },
  closed: { label: "home.pool.closed", tone: "bg-gray-100 text-fg-secondary" },
};

const CTA_LABELS: Record<Exclude<CtaKind, "activate" | "upgrade">, MessageKey> = {
  signin: "home.cta.signin",
  kyc: "home.cta.kyc",
  deposit: "home.cta.deposit",
  current: "home.cta.current",
  included: "home.cta.included",
  trial_used: "home.cta.trialUsed",
  sold_out: "home.cta.soldOut",
  closed: "home.cta.closed",
};

const statusOf = (tier: VipTier): PoolStatus => (!tier.isActive ? "closed" : tier.activeNodes >= tier.capacity ? "soldOut" : "open");

/** Next levels above the user's node; everyone else sees the entry-level paid tiers. */
function pickTiers(tiers: readonly VipTier[], nodeLevel: number | null): VipTier[] {
  const open = tiers.filter((tier) => tier.isActive && tier.level >= 1).sort((a, b) => a.level - b.level);
  const above = nodeLevel === null ? open : open.filter((tier) => tier.level > nodeLevel);
  return above.length > 0 ? above.slice(0, MAX_CARDS) : open.slice(-MAX_CARDS);
}

interface CardProps {
  tier: VipTier;
  quote: AllocationQuote;
  cta: Cta;
  onAction: (tier: VipTier, cta: Cta) => void;
}

function PoolCard({ tier, quote, cta, onAction }: CardProps) {
  const { t } = useT();
  const pct = Math.round(utilizationPct(tier));
  const status = STATUS[statusOf(tier)];
  const label =
    cta.kind === "activate" || cta.kind === "upgrade"
      ? t("home.pool.stake")
      : t(CTA_LABELS[cta.kind], { level: quote.kycRequired, amount: usdt(quote.shortfall) });
  const metrics: Array<{ name: MessageKey; value: ReactNode; tone?: string }> = [
    {
      name: "home.pool.minAllocation",
      value: (
        <>
          {usdt(tier.feeUsdt)} <span className="text-[11px] font-semibold text-fg-muted">USDT</span>
        </>
      ),
    },
    { name: "home.pool.dailyRate", value: formatRate(tier.dailyRatePct), tone: "text-emerald-600" },
    { name: "home.pool.lockup", value: tier.durationDays ? t("home.pool.days", { n: tier.durationDays }) : t("home.pool.flexible") },
  ];

  return (
    <article
      data-testid={`pool-card-${tier.level}`}
      aria-label={`${rankLabel(tier.level)} ${tier.title}`}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex shrink-0 rounded-full bg-[#1C1A17]">
            <CrownBadge level={tier.level} size="pill" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted">{rankName(tier.level)}</span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${status.tone}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {t(status.label)}
          </span>
        </div>
        <h3 className="mt-2.5 text-base font-extrabold leading-snug tracking-tight text-gray-900">{tier.title}</h3>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-gray-100">
        {metrics.map((m, i) => (
          <div key={m.name} className={`min-w-0 ${i === 0 ? "pr-3" : "px-3"}`}>
            <dt className="text-[11px] leading-tight text-fg-muted">{t(m.name)}</dt>
            <dd className={`mt-1 whitespace-nowrap text-[15px] font-bold tabular-nums ${m.tone ?? "text-gray-900"}`}>{m.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-fg-muted">{t("home.pool.capacity")}</span>
          <span className="font-semibold tabular-nums text-fg-secondary">{t("home.pool.allocated", { n: pct })}</span>
        </div>
        <div
          role="progressbar"
          aria-label={`${rankLabel(tier.level)} · ${t("home.pool.capacity")}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100"
        >
          <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <button
        type="button"
        disabled={cta.disabled}
        onClick={() => onAction(tier, cta)}
        data-testid={`pool-cta-${tier.level}`}
        className={`${BTN_PRIMARY} min-h-11 !rounded-xl !py-2.5 !text-sm`}
      >
        {label}
      </button>
    </article>
  );
}

export function PoolList() {
  const { t } = useT();
  const headingId = useId();
  const tiers = useAppStore((s) => s.tiers);
  const positions = useAppStore((s) => s.positions);
  const balances = useAppStore((s) => s.balances);
  const kycTier = useAppStore((s) => s.user.kycTier);
  const guest = useAppStore((s) => s.user.isGuest);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const openKycModal = useAppStore((s) => s.openKycModal);
  const requireAuth = useRequireAuth();
  const [sheetTier, setSheetTier] = useState<string | null>(null);
  const closeSheet = useCallback(() => setSheetTier(null), []);

  const nodeLevel = guest ? null : (currentNode(positions)?.tierLevel ?? null);
  const shown = useMemo(() => pickTiers(tiers, nodeLevel), [tiers, nodeLevel]);
  const useVoucher = balances.trialVoucher > 0;

  const onAction = (tier: VipTier, cta: Cta) => {
    if (cta.kind === "signin") requireAuth(t("home.pool.authReason", { name: tier.name }), "register");
    else if (cta.kind === "kyc") openKycModal();
    else if (cta.kind === "activate" || cta.kind === "upgrade" || cta.kind === "deposit") setSheetTier(tier.id);
  };

  return (
    <section aria-labelledby={headingId} data-testid="pool-list" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="min-w-0 text-lg font-extrabold tracking-tight text-gray-900">
          {t("home.pools.title")}
        </h2>
        <button
          type="button"
          onClick={() => setActiveTab("vaults")}
          data-testid="pool-viewall"
          className="-mr-2 flex min-h-11 shrink-0 items-center gap-0.5 rounded-full pl-3 pr-2 text-sm font-semibold text-gray-700 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          {t("home.pools.viewAll")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {shown.length === 0 ? (
        <p className={`${CARD} px-4 py-6 text-center text-sm text-fg-secondary`}>{t("home.pools.empty")}</p>
      ) : (
        shown.map((tier) => {
          const quote = quoteAllocation({ tier, positions, balances, kycTier, isGuest: guest, useVoucher });
          return <PoolCard key={tier.id} tier={tier} quote={quote} cta={ctaFor(quote)} onAction={onAction} />;
        })
      )}

      <NodeSheet tierId={sheetTier} onClose={closeSheet} />
    </section>
  );
}
