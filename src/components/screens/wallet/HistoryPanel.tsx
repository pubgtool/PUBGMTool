"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Copy,
  Gift,
  Trophy,
  Layers,
  Receipt,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { SPRING, TAP, TAP_CTA } from "@/components/screens/wallet/styles";
import { toast } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { formatAmount, formatReward } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { getNetwork } from "@/lib/wallet";
import type { Transaction, TransactionType } from "@/types/domain";

type Filter = "all" | "deposits" | "withdrawals" | "earnings" | "rewards";

const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "deposits", label: "Deposits" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "earnings", label: "VIP Earnings" },
  { id: "rewards", label: "Rewards" },
];

const PAGE_SIZE = 20;
const SOFT_SPRING = { type: "spring", stiffness: 500, damping: 35 } as const;
const ROW_FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400";

const stamp = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const formatTime = (iso: string) => stamp.format(new Date(iso));

/** Ledger notes written by demo tooling can carry internal wording; show neutral copy instead. */
const NEUTRAL: ReadonlyArray<[RegExp, string]> = [
  [/\bsandbox\b/gi, "Demo"],
  [/\btestnet\b/gi, "Demo"],
  [/\bsimulat(?:ed|e|ion)\b/gi, "demo"],
];
const neutralNote = (note: string) => NEUTRAL.reduce((text, [pattern, word]) => text.replace(pattern, word), note);

interface Meta {
  title: string;
  Icon: LucideIcon;
  tint: string;
  /** "±" follows the sign of the stored amount. */
  sign: "+" | "-" | "±";
}

const NEUTRAL_TINT = "bg-gray-100 text-fg-secondary ring-white/10";

const META: Record<TransactionType, Meta> = {
  deposit: { title: "Deposit", Icon: ArrowDownLeft, tint: "bg-emerald-500/15 text-emerald-700 ring-emerald-400/25", sign: "+" },
  withdraw: { title: "Withdrawal", Icon: ArrowUpRight, tint: "bg-orange-500/15 text-orange-300 ring-orange-400/25", sign: "-" },
  bounty: { title: "Reward Bounty", Icon: Trophy, tint: "bg-amber-500/15 text-amber-700 ring-amber-400/25", sign: "+" },
  commission: { title: "Referral Commission", Icon: Gift, tint: "bg-sky-500/15 text-sky-300 ring-sky-400/25", sign: "+" },
  earning: { title: "Daily Income", Icon: Sparkles, tint: "bg-violet-500/15 text-violet-600 ring-violet-400/25", sign: "+" },
  harvest: { title: "Income Harvested", Icon: Sparkles, tint: "bg-violet-500/15 text-violet-600 ring-violet-400/25", sign: "+" },
  stake: { title: "Node Allocation", Icon: Layers, tint: NEUTRAL_TINT, sign: "-" },
  unstake: { title: "Node Released", Icon: Layers, tint: NEUTRAL_TINT, sign: "+" },
  early_unstake: { title: "Early Exit", Icon: Layers, tint: NEUTRAL_TINT, sign: "+" },
  fee: { title: "Fee", Icon: Receipt, tint: NEUTRAL_TINT, sign: "-" },
  voucher: { title: "Trial Voucher", Icon: Ticket, tint: "bg-amber-500/15 text-amber-700 ring-amber-400/25", sign: "+" },
  adjustment: { title: "Balance Adjustment", Icon: SlidersHorizontal, tint: NEUTRAL_TINT, sign: "±" },
};

function matches(filter: Filter, tx: Transaction): boolean {
  if (filter === "all") return true;
  if (filter === "deposits") return tx.type === "deposit";
  if (filter === "withdrawals") return tx.type === "withdraw";
  if (filter === "rewards") return tx.type === "bounty" || tx.type === "commission";
  return tx.type === "earning";
}

function signedAmount(tx: Transaction): { value: string; positive: boolean | null } {
  const abs = Math.abs(tx.amount);
  const digits = tx.type === "earning" || tx.type === "harvest" ? formatReward(abs) : formatAmount(abs);
  if (abs === 0) return { value: digits, positive: null };
  const meta = META[tx.type];
  const positive = meta.sign === "±" ? tx.amount > 0 : meta.sign === "+";
  return { value: `${positive ? "+" : "-"}${digits}`, positive };
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  const pending = status === "PENDING";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset ${
        pending
          ? "bg-amber-500/15 text-amber-700 ring-amber-400/25"
          : "bg-emerald-500/15 text-emerald-700 ring-emerald-400/25"
      }`}
    >
      {pending && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 motion-reduce:animate-none" />}
      <span className="lowercase first-letter:uppercase">{status}</span>
    </span>
  );
}

interface DetailRow {
  label: string;
  value: React.ReactNode;
  /** Long values (addresses, hashes) sit under their label instead of beside it. */
  stack?: boolean;
}

function Details({ tx, id }: { tx: Transaction; id: string }) {
  const reduceMotion = useReducedMotion();
  const rows: DetailRow[] = [
    { label: "Reference", value: <span className="font-mono">{tx.id.slice(0, 18)}</span> },
  ];
  if (tx.network) {
    const network = getNetwork(tx.network);
    rows.push({ label: "Network", value: `${network.label} (${network.chain})` });
  }
  if (tx.address) {
    rows.push({
      label: tx.type === "deposit" ? "Deposit address" : "Destination",
      value: <span className="break-all font-mono text-[11px] leading-relaxed">{tx.address}</span>,
      stack: true,
    });
  }
  if (tx.fee !== undefined) rows.push({ label: "Network fee", value: `${formatAmount(tx.fee)} USDT` });
  if (tx.type === "withdraw") {
    rows.push({ label: "Net received", value: `${formatAmount(Math.max(0, tx.amount - (tx.fee ?? 0)))} USDT` });
  }
  if (tx.txHash) {
    const hash = tx.txHash;
    rows.push({
      label: "Transaction hash",
      stack: true,
      value: (
        <span className="flex items-start gap-2">
          <span data-testid="tx-hash" className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed">
            {hash}
          </span>
          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={async () =>
              (await copyText(hash)) ? toast.success("Transaction hash copied") : toast.error("Couldn't copy the hash")
            }
            aria-label="Copy transaction hash"
            className="-my-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-secondary transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400 outline-none"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </motion.button>
        </span>
      ),
    });
  } else if (tx.type === "withdraw" && tx.status === "PENDING") {
    rows.push({ label: "Transaction hash", value: "Awaiting network broadcast…" });
  }
  if (tx.completedAt) rows.push({ label: "Completed", value: formatTime(tx.completedAt) });
  if (tx.note && !tx.network) rows.push({ label: "Note", value: neutralNote(tx.note) });

  return (
    <motion.div
      id={id}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={reduceMotion ? { duration: 0 } : SOFT_SPRING}
      className="overflow-hidden"
    >
      <dl className="mx-3 mb-3 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-canvas/60 px-3.5 py-3.5 text-xs">
        {rows.map(({ label, value, stack }) => (
          <div key={label} className={stack ? "flex flex-col gap-1.5" : "flex items-start justify-between gap-4"}>
            <dt className="shrink-0 text-fg-secondary">{label}</dt>
            <dd className={`min-w-0 font-medium text-fg ${stack ? "" : "text-right"}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}

export function HistoryPanel() {
  const transactions = useAppStore((s) => s.transactions);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setWalletSection = useAppStore((s) => s.setWalletSection);

  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      transactions
        .filter((tx) => matches(filter, tx))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [transactions, filter],
  );
  const visible = items.slice(0, limit);

  const empty: Record<Filter, { text: string; cta: string; onPress: () => void }> = {
    all: { text: "No activity yet.", cta: "Make a deposit", onPress: () => setWalletSection("deposit") },
    deposits: { text: "No deposits yet.", cta: "Make a deposit", onPress: () => setWalletSection("deposit") },
    withdrawals: { text: "No withdrawals yet.", cta: "Withdraw funds", onPress: () => setWalletSection("withdraw") },
    earnings: { text: "No VIP earnings yet.", cta: "Activate a VIP plan", onPress: () => setActiveTab("vaults") },
    rewards: { text: "No rewards claimed yet.", cta: "Open Tasks & Rewards", onPress: () => setActiveTab("tasks") },
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Filter transactions"
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <motion.button
              key={f.id}
              type="button"
              aria-pressed={active}
              whileTap={TAP}
              transition={SPRING}
              onClick={() => {
                setFilter(f.id);
                setLimit(PAGE_SIZE);
                setOpenId(null);
              }}
              className="relative h-11 shrink-0 rounded-full px-4 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              {active ? (
                <motion.span
                  layoutId="wallet-filter-pill"
                  className="btn-primary absolute inset-0 rounded-full shadow-btn"
                  transition={SPRING}
                />
              ) : (
                <span className="absolute inset-0 rounded-full border border-gray-200 bg-surface" />
              )}
              <span className={`relative ${active ? "text-white" : "text-fg-secondary"}`}>{f.label}</span>
            </motion.button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-surface px-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-fg-secondary ring-1 ring-inset ring-white/10">
            <Receipt className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold">{empty[filter].text}</p>
          <motion.button
            type="button"
            whileTap={TAP_CTA}
            transition={SPRING}
            onClick={empty[filter].onPress}
            className="mt-4 min-h-11 rounded-2xl btn-primary px-6 py-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            {empty[filter].cta}
          </motion.button>
        </div>
      ) : (
        <ul aria-label="Transactions" className="flex flex-col gap-2">
          {visible.map((tx) => {
            const meta = META[tx.type];
            const amount = signedAmount(tx);
            const open = openId === tx.id;
            const detailsId = `tx-details-${tx.id}`;
            const context = tx.network ? getNetwork(tx.network).short : tx.note ? neutralNote(tx.note) : undefined;
            return (
              <li
                key={tx.id}
                data-testid="tx-row"
                data-type={tx.type}
                data-status={tx.status}
                className={`overflow-hidden rounded-2xl border bg-surface transition-colors ${
                  open ? "border-slate-100" : "border-gray-200"
                }`}
              >
                <motion.button
                  type="button"
                  whileTap={TAP}
                  transition={SPRING}
                  onClick={() => setOpenId(open ? null : tx.id)}
                  aria-expanded={open}
                  aria-controls={detailsId}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 rounded-2xl px-3 py-3.5 text-left ${ROW_FOCUS}`}
                >
                  <span
                    className={`row-span-2 flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset ${meta.tint}`}
                  >
                    <meta.Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="truncate text-sm font-semibold">{meta.title}</span>
                  <span
                    data-testid="tx-amount"
                    className={`text-right font-mono text-[13px] font-bold tabular-nums ${
                      amount.positive === true ? "text-emerald-600" : "text-fg"
                    }`}
                  >
                    {amount.value} <span className="text-[11px] font-semibold opacity-70">USDT</span>
                  </span>
                  <span className="truncate text-[11px] text-fg-secondary">
                    {formatTime(tx.createdAt)}
                    {context ? ` · ${context}` : ""}
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    <StatusBadge status={tx.status} />
                    <ChevronDown
                      className={`h-4 w-4 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </span>
                </motion.button>
                <AnimatePresence initial={false}>{open && <Details tx={tx} id={detailsId} />}</AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > visible.length && (
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={() => setLimit((n) => n + PAGE_SIZE)}
          className="min-h-11 rounded-2xl border border-gray-200 bg-surface py-3 text-xs font-bold text-fg outline-none transition-colors hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Show more ({items.length - visible.length} remaining)
        </motion.button>
      )}
    </div>
  );
}
