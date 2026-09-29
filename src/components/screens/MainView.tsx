"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  History,
  Layers,
  Gift,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ENGINE } from "@/config/protocol";
import { formatAmount, formatRate, formatSignedPct } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { summarizeRewards } from "@/lib/rewards";
import { TRIAL_VOUCHER_AMOUNT, selectTotalBalance, selectUnreadCount, useAppStore } from "@/lib/store";
import type { VaultPosition, WalletSection } from "@/types/domain";

const MASK = "••••••";
const MAX_POSITIONS_SHOWN = 4;
const TAP = { scale: 0.95 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

const CARD = "rounded-3xl border border-slate-100 bg-white shadow-sm";

/**
 * Progress through the current 24h reward cycle. Uses the ticker-maintained
 * `lastAccruedAt` as "now", so it stays live without its own clock.
 */
function cycleProgress(p: VaultPosition): number {
  const elapsed = Date.parse(p.lastAccruedAt) - Date.parse(p.openedAt);
  if (!(elapsed > 0)) return 0;
  return (elapsed % ENGINE.msPerDay) / ENGINE.msPerDay;
}

export function MainView() {
  const user = useAppStore((s) => s.user);
  const balances = useAppStore((s) => s.balances);
  const equity = useAppStore(selectTotalBalance);
  const unread = useAppStore(selectUnreadCount);
  const positions = useAppStore((s) => s.positions);
  const tiers = useAppStore((s) => s.tiers);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setWalletSection = useAppStore((s) => s.setWalletSection);
  const setFocusedTierId = useAppStore((s) => s.setFocusedTierId);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const [hidden, setHidden] = useState(false);
  const now = useNow(30_000);

  const active = useMemo(() => positions.filter((p) => p.status === "active"), [positions]);
  const openTiers = useMemo(() => tiers.filter((t) => t.isActive), [tiers]);
  const trending = openTiers.slice(0, 2);
  const starterTier = openTiers[0];
  const vipLevel = useMemo(() => active.reduce((max, p) => Math.max(max, p.tierLevel), 0), [active]);

  const voucher = balances.trialVoucher;
  const dayStartEquity = equity - balances.dailyAccrued;
  const dailyPct = dayStartEquity > 0 ? (balances.dailyAccrued / dayStartEquity) * 100 : 0;
  const mask = (value: string) => (hidden ? MASK : value);

  const rewards = useMemo(() => summarizeRewards(user, positions, now), [user, positions, now]);
  const rewardsReady = (rewards.checkInAvailable ? 1 : 0) + rewards.readyTasks;
  const rewardsHint = user.isGuest
    ? "Daily check-in, gift codes and missions"
    : [
        rewards.checkInAvailable ? "Daily check-in ready" : "Checked in today",
        rewards.readyTasks > 0 ? `${rewards.readyTasks} ${rewards.readyTasks === 1 ? "bounty" : "bounties"} to claim` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  const openWallet = (section: WalletSection) => {
    setWalletSection(section);
    setActiveTab("wallet");
  };
  const openVaults = (tierId: string | null = null) => {
    setFocusedTierId(tierId);
    setActiveTab("vaults");
  };

  const actions: Array<{ label: string; Icon: LucideIcon; primary?: boolean; onPress: () => void }> = [
    { label: "Deposit", Icon: ArrowDownLeft, primary: true, onPress: () => openWallet("deposit") },
    { label: "Withdraw", Icon: ArrowUpRight, onPress: () => openWallet("withdraw") },
    { label: "VIP Plans", Icon: Zap, onPress: () => openVaults() },
    { label: "History", Icon: History, onPress: () => openWallet("history") },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">Welcome back,</p>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {user.isGuest ? "Anonymous Node" : user.displayName}
            </h1>
            {vipLevel > 0 && (
              <span className="shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                VIP {vipLevel}
              </span>
            )}
            {user.kycStatus === "VERIFIED" && (
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="KYC verified" />
            )}
            {user.kycStatus === "PENDING" && (
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" aria-label="KYC pending" />
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Operational
          </div>
          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={() => setActiveTab("notifications")}
            aria-label={unread > 0 ? `Alerts, ${unread} unread` : "Alerts"}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/60 bg-white text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none tabular-nums text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      {user.isGuest && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          onClick={() => openAuthModal("register", "Create a free account to claim your trial voucher")}
          data-testid="guest-cta"
          className="flex w-full items-center gap-3 rounded-3xl bg-slate-950 p-4 text-left text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Ticket className="h-5 w-5 text-amber-300" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Claim {TRIAL_VOUCHER_AMOUNT.toFixed(2)} USDT trial voucher</span>
            <span className="block text-xs text-slate-300">Create a free account or sign in to start</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </motion.button>
      )}

      {/* Hero balance */}
      <section className={`${CARD} relative overflow-hidden p-5`}>
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-slate-50" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Account Equity
            </p>
            <button
              type="button"
              onClick={() => setHidden((h) => !h)}
              aria-label={hidden ? "Show balances" : "Hide balances"}
              aria-pressed={hidden}
              className="rounded-full p-1.5 text-slate-400 outline-none transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {hidden ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
              {mask(formatAmount(equity))}
            </span>
            <span className="text-sm font-medium text-slate-400">USDT</span>
          </p>

          <div className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            <span className="tabular-nums">
              +{mask(formatAmount(balances.dailyAccrued, 4))} USDT ({formatSignedPct(dailyPct)}) Today
            </span>
          </div>

          {voucher > 0 && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              transition={SPRING}
              onClick={() => openVaults(starterTier?.id ?? null)}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-yellow-50 px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Ticket className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold tabular-nums text-amber-900">
                  {mask(formatAmount(voucher))} USDT Trial Allocation Active
                </span>
                <span className="block text-xs text-amber-700/80">
                  Deploy it into {starterTier?.name ?? "a VIP plan"} to start earning
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            </motion.button>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="grid grid-cols-4 gap-3">
        {actions.map(({ label, Icon, primary, onPress }) => (
          <motion.button
            key={label}
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={onPress}
            className={`flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
              primary
                ? "bg-slate-950 text-white shadow-sm"
                : "border border-slate-100 bg-white text-slate-800 shadow-sm"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </motion.button>
        ))}
      </section>

      {/* Tasks & rewards */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={SPRING}
        onClick={() => setActiveTab("tasks")}
        data-testid="rewards-entry"
        className="flex w-full items-center gap-3 rounded-3xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-left shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
          <Gift className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Tasks &amp; Rewards</span>
          <span data-testid="rewards-entry-hint" className="block truncate text-xs text-slate-600">
            {rewardsHint}
          </span>
        </span>
        {rewardsReady > 0 && (
          <span
            data-testid="rewards-entry-badge"
            aria-label={`${rewardsReady} ready`}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none tabular-nums text-white"
          >
            {rewardsReady}
          </span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      </motion.button>

      {/* Active allocations */}
      <section className={`${CARD} p-4`}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-slate-400" aria-hidden />
            Active Investment Plans
          </h2>
          {active.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
              {active.length}
            </span>
          )}
        </div>

        {active.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl bg-slate-50 px-4 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <Zap className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-medium">No active plans</p>
            <p className="mt-1 text-xs text-slate-500">
              {voucher > 0
                ? "Put your trial voucher to work and start earning daily income."
                : "Activate a VIP plan to start earning daily income."}
            </p>
            <motion.button
              type="button"
              whileTap={TAP}
              transition={SPRING}
              onClick={() => openVaults(voucher > 0 ? (starterTier?.id ?? null) : null)}
              className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {voucher > 0
                ? `Activate Starter Node with ${formatAmount(voucher, Number.isInteger(voucher) ? 0 : 2)} USDT Voucher`
                : "Explore VIP Plans"}
            </motion.button>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {active.slice(0, MAX_POSITIONS_SHOWN).map((p) => {
              const progress = cycleProgress(p) * 100;
              return (
                <li key={p.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold">{p.tierName}</p>
                      {p.fundedBy === "voucher" && (
                        <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-800">
                          Trial
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500">
                      {formatRate(p.dailyRatePct)} / day
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-slate-400">Invested</dt>
                      <dd className="mt-0.5 font-mono text-sm font-medium tabular-nums">
                        {mask(formatAmount(p.principal))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-slate-400">Income</dt>
                      <dd className="mt-0.5 font-mono text-sm font-medium tabular-nums text-emerald-600">
                        {hidden ? MASK : `+${formatAmount(p.accrued, 6)}`}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>24h income cycle</span>
                      <span className="tabular-nums">{progress.toFixed(0)}%</span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-slate-200/70"
                      role="progressbar"
                      aria-label="24 hour income cycle"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress)}
                    >
                      <div
                        className="h-full rounded-full bg-slate-900 transition-[width] duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
            {active.length > MAX_POSITIONS_SHOWN && (
              <li>
                <button
                  type="button"
                  onClick={() => openVaults()}
                  className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  +{active.length - MAX_POSITIONS_SHOWN} more plans
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Trending vaults */}
      <section className={`${CARD} p-4`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-slate-400" aria-hidden />
          Trending VIP Packages
        </h2>

        {trending.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
            No vaults are open for deposits right now.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {trending.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className="font-mono font-medium tabular-nums text-emerald-600">
                      {formatRate(t.dailyRatePct)}
                    </span>{" "}
                    daily · Min{" "}
                    <span className="tabular-nums">{formatAmount(t.minDeposit, 0)}</span> USDT
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={TAP}
                  transition={SPRING}
                  onClick={() => openVaults(t.id)}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  Inspect Tier
                </motion.button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => openVaults()}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold text-slate-600 outline-none transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          View All Tiers
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </section>
    </main>
  );
}
