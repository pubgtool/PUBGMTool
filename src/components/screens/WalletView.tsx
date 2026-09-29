"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, History, Ticket, Wallet, Zap, type LucideIcon } from "lucide-react";
import { GuestGate } from "@/components/auth/GuestGate";
import { DepositPanel } from "@/components/screens/wallet/DepositPanel";
import { HistoryPanel } from "@/components/screens/wallet/HistoryPanel";
import { WithdrawPanel } from "@/components/screens/wallet/WithdrawPanel";
import { formatAmount } from "@/lib/format";
import { selectTotalBalance, useAppStore } from "@/lib/store";
import type { WalletSection } from "@/types/domain";

const SECTIONS: ReadonlyArray<{ id: WalletSection; label: string; Icon: LucideIcon }> = [
  { id: "deposit", label: "Deposit", Icon: ArrowDownLeft },
  { id: "withdraw", label: "Withdraw", Icon: ArrowUpRight },
  { id: "history", label: "History", Icon: History },
];

const SPRING = { type: "spring", stiffness: 500, damping: 35 } as const;

export function WalletView() {
  const section = useAppStore((s) => s.walletSection);
  const setSection = useAppStore((s) => s.setWalletSection);
  const total = useAppStore(selectTotalBalance);
  const balances = useAppStore((s) => s.balances);
  const guest = useAppStore((s) => s.user.isGuest);

  const anchorRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const tabRefs = useRef(new Map<WalletSection, HTMLButtonElement>());

  // After a section switch, keep the new panel's top in view rather than the old scroll offset.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const anchor = anchorRef.current;
    if (!anchor) return;
    const top = anchor.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top });
  }, [section]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = SECTIONS[(index + step + SECTIONS.length) % SECTIONS.length];
    if (!next) return;
    setSection(next.id);
    tabRefs.current.get(next.id)?.focus();
  };

  const cards: Array<{ label: string; value: number; Icon: LucideIcon; testId: string }> = [
    { label: "Available Cash", value: balances.available, Icon: Wallet, testId: "bal-available" },
    { label: "Active VIP Contracts", value: balances.staked, Icon: Zap, testId: "bal-staked" },
    { label: "Trial Fund", value: balances.trialVoucher, Icon: Ticket, testId: "bal-voucher" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 pt-6">
        <h1 className="text-xl font-semibold tracking-tight">Wallet</h1>
        <p className="mt-0.5 text-xs text-slate-500">Deposit, withdraw and audit your USDT balance</p>

        <section
          aria-label="Balance summary"
          className="mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Assets</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span data-testid="bal-total" className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
              {formatAmount(total)}
            </span>
            <span className="text-sm font-medium text-slate-400">USDT</span>
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
            {cards.map(({ label, value, Icon, testId }) => (
              <div
                key={label}
                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 min-[380px]:block"
              >
                <dt className="flex items-start gap-1 text-[10px] uppercase leading-tight tracking-wider text-slate-400">
                  <Icon className="mt-px h-3 w-3 shrink-0" aria-hidden />
                  <span>{label}</span>
                </dt>
                <dd
                  data-testid={testId}
                  title={formatAmount(value)}
                  className="shrink-0 font-mono text-[13px] font-semibold tabular-nums min-[380px]:mt-1.5 min-[380px]:block min-[380px]:shrink min-[380px]:truncate min-[380px]:text-xs"
                >
                  {formatAmount(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </header>

      <div ref={anchorRef} />
      <div className="sticky top-0 z-30 bg-slate-50/90 px-4 py-2.5 backdrop-blur-xl">
        <div
          role="tablist"
          aria-label="Wallet sections"
          className="relative grid grid-cols-3 rounded-2xl bg-slate-200/60 p-1"
        >
          {SECTIONS.map(({ id, label, Icon }, index) => {
            const active = id === section;
            return (
              <button
                key={id}
                ref={(el) => {
                  if (el) tabRefs.current.set(id, el);
                  else tabRefs.current.delete(id);
                }}
                type="button"
                role="tab"
                id={`wallet-tab-${id}`}
                aria-selected={active}
                aria-controls={`wallet-panel-${id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setSection(id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className="relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {active && (
                  <motion.span
                    layoutId="wallet-section-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm"
                    transition={SPRING}
                  />
                )}
                <Icon className={`relative h-3.5 w-3.5 ${active ? "text-slate-950" : "text-slate-500"}`} aria-hidden />
                <span className={`relative ${active ? "text-slate-950" : "text-slate-500"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.main
        key={section}
        role="tabpanel"
        id={`wallet-panel-${section}`}
        aria-labelledby={`wallet-tab-${section}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="px-4 pb-4 pt-2"
      >
        {section === "deposit" &&
          (guest ? (
            <GuestGate
              title="Sign in to deposit"
              text="Your personal deposit address is created when you sign in. Guests can't deposit."
              reason="Sign in to deposit"
            />
          ) : (
            <DepositPanel />
          ))}
        {section === "withdraw" &&
          (guest ? (
            <GuestGate
              title="Sign in to withdraw"
              text="Withdrawals go to your verified payout address. Sign in to continue."
              reason="Sign in to withdraw"
            />
          ) : (
            <WithdrawPanel />
          ))}
        {section === "history" && <HistoryPanel />}
      </motion.main>
    </div>
  );
}
