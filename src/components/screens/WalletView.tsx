"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, History, Nfc, Ticket, Wallet, Zap, type LucideIcon } from "lucide-react";
import { GuestGate } from "@/components/auth/GuestGate";
import { DepositPanel } from "@/components/screens/wallet/DepositPanel";
import { HistoryPanel } from "@/components/screens/wallet/HistoryPanel";
import { WithdrawPanel } from "@/components/screens/wallet/WithdrawPanel";
import { SPRING, TAP } from "@/components/screens/wallet/styles";
import { PROTOCOL } from "@/config/protocol";
import { formatAmount } from "@/lib/format";
import { selectTotalBalance, useAppStore } from "@/lib/store";
import type { WalletSection } from "@/types/domain";

const SECTIONS: ReadonlyArray<{ id: WalletSection; label: string; Icon: LucideIcon }> = [
  { id: "deposit", label: "Deposit", Icon: ArrowDownLeft },
  { id: "withdraw", label: "Withdraw", Icon: ArrowUpRight },
  { id: "history", label: "History", Icon: History },
];

interface Tone {
  idle: string;
  active: string;
  fill: string;
  ring: string;
}

/** Idle tabs are plain white; the active one is solid black. */
const IDLE = "border-gray-200 bg-white text-fg-secondary hover:text-fg";
const ACTIVE = { active: "border-transparent text-white", fill: "bg-gray-900 shadow-btn", ring: "focus-visible:ring-gray-900" };
const TONES: Record<WalletSection, Tone> = {
  deposit: { idle: IDLE, ...ACTIVE },
  withdraw: { idle: IDLE, ...ACTIVE },
  history: { idle: IDLE, ...ACTIVE },
};

/** Steps the total's size down so seven-figure balances stay on one line at 320px. */
const totalSize = (text: string) => (text.length > 15 ? "text-xl" : text.length > 11 ? "text-2xl" : "text-3xl");
const statSize = (text: string) => (text.length > 10 ? "text-[11px]" : text.length > 8 ? "text-xs" : "text-[13px]");

function CardChip() {
  return (
    <span
      aria-hidden
      className="relative block h-[26px] w-9 overflow-hidden rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25),0_1px_8px_rgba(245,158,11,0.35)]"
    >
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/30" />
      <span className="absolute inset-y-0 left-1/3 w-px bg-black/30" />
      <span className="absolute inset-y-0 left-2/3 w-px bg-black/30" />
      <span className="absolute inset-[6px] rounded-[3px] border border-black/25" />
    </span>
  );
}

export function WalletView() {
  const section = useAppStore((s) => s.walletSection);
  const setSection = useAppStore((s) => s.setWalletSection);
  const total = useAppStore(selectTotalBalance);
  const balances = useAppStore((s) => s.balances);
  const guest = useAppStore((s) => s.user.isGuest);
  const reduceMotion = useReducedMotion();

  const anchorRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const tabRefs = useRef(new Map<WalletSection, HTMLButtonElement>());
  const [stuck, setStuck] = useState(false);

  // The bar only needs a backdrop once it has left its resting place under the card.
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

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

  const cards: Array<{ label: string; value: number; Icon: LucideIcon; tint: string; testId: string }> = [
    { label: "Available Cash", value: balances.available, Icon: Wallet, tint: "text-emerald-400", testId: "bal-available" },
    { label: "Active VIP Contracts", value: balances.staked, Icon: Zap, tint: "text-amber-300", testId: "bal-staked" },
    { label: "Trial Fund", value: balances.trialVoucher, Icon: Ticket, tint: "text-sky-400", testId: "bal-voucher" },
  ];
  const totalText = formatAmount(total);

  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 pt-6">
        <h1 className="text-xl font-bold tracking-tight">Wallet</h1>
        <p className="mt-0.5 text-xs text-fg-secondary">Deposit, withdraw and audit your USDT balance</p>

        <section
          aria-label="Balance summary"
          className="relative isolate mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-[linear-gradient(150deg,#453823_0%,#2A241C_45%,#1C1A17_100%)] p-5 shadow-[0_22px_48px_-24px_rgba(245,158,11,0.55),inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.028)_0_1px,transparent_1px_7px)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(112deg,transparent_24%,rgba(255,255,255,0.075)_40%,rgba(255,255,255,0.02)_52%,transparent_64%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-14 -top-20 -z-10 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl"
          />

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <CardChip />
              <Nfc className="h-[18px] w-[18px] rotate-90 text-amber-100/40" aria-hidden />
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 text-xs font-black text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.45)]"
              >
                N
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-100/80">
                {PROTOCOL.shortName}
              </span>
            </span>
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/70">Total Assets</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span
              data-testid="bal-total"
              className={`max-w-full font-extrabold tracking-tight tabular-nums text-white [overflow-wrap:anywhere] ${totalSize(totalText)}`}
            >
              {totalText}
            </span>
            <span className="text-sm font-bold text-amber-300">USDT</span>
          </p>

          <dl className="mt-5 grid grid-cols-1 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-black/25 min-[380px]:grid-cols-3 min-[380px]:divide-x min-[380px]:divide-y-0">
            {cards.map(({ label, value, Icon, tint, testId }) => {
              const text = formatAmount(value);
              return (
                <div
                  key={label}
                  className="flex min-w-0 items-center justify-between gap-3 px-3.5 py-3 min-[380px]:flex-col min-[380px]:items-start min-[380px]:justify-between min-[380px]:gap-2 min-[380px]:px-3"
                >
                  <dt className="flex items-start gap-1.5 text-[11px] leading-tight text-amber-100/70">
                    <Icon className={`mt-px h-3 w-3 shrink-0 ${tint}`} aria-hidden />
                    <span>{label}</span>
                  </dt>
                  <dd
                    data-testid={testId}
                    title={text}
                    className={`shrink-0 font-mono font-bold tabular-nums text-white min-[380px]:max-w-full min-[380px]:shrink min-[380px]:truncate ${statSize(text)}`}
                  >
                    {text}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      </header>

      <div ref={anchorRef} />
      <div
        className={`sticky top-0 z-30 border-b px-4 py-3 transition-colors ${
          stuck ? "border-gray-100 bg-canvas/85 backdrop-blur-xl" : "border-transparent"
        }`}
      >
        <div role="tablist" aria-label="Wallet sections" className="grid grid-cols-[1fr_1fr_auto] gap-2.5">
          {SECTIONS.map(({ id, label, Icon }, index) => {
            const active = id === section;
            const tone = TONES[id];
            const compact = id === "history";
            return (
              <motion.button
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
                whileTap={TAP}
                transition={SPRING}
                className={`relative flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${tone.ring} ${
                  active ? tone.active : tone.idle
                } ${compact ? "min-w-[52px] px-3.5 text-xs font-semibold" : "px-2 text-[15px] font-extrabold tracking-tight"}`}
              >
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.94 }}
                  transition={reduceMotion ? { duration: 0 } : SPRING}
                  className={`pointer-events-none absolute -inset-px rounded-2xl ${tone.fill}`}
                />
                <Icon className="relative h-5 w-5 shrink-0" strokeWidth={compact ? 2.2 : 2.6} aria-hidden />
                <span className={`relative ${compact ? "max-[359px]:sr-only" : ""}`}>{label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.main
        key={section}
        role="tabpanel"
        id={`wallet-panel-${section}`}
        aria-labelledby={`wallet-tab-${section}`}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="px-4 pb-12 pt-2"
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
