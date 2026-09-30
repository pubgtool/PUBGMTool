"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
const SPRING = { type: "spring", stiffness: 500, damping: 35 } as const;

const stamp = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const formatTime = (iso: string) => stamp.format(new Date(iso));

interface Meta {
  title: string;
  Icon: LucideIcon;
  tint: string;
  /** "±" follows the sign of the stored amount. */
  sign: "+" | "-" | "±";
}

const META: Record<TransactionType, Meta> = {
  deposit: { title: "Deposit", Icon: ArrowDownLeft, tint: "bg-emerald-50 text-emerald-600", sign: "+" },
  withdraw: { title: "Withdrawal", Icon: ArrowUpRight, tint: "bg-orange-50 text-orange-600", sign: "-" },
  bounty: { title: "Reward Bounty", Icon: Trophy, tint: "bg-amber-50 text-amber-600", sign: "+" },
  commission: { title: "Referral Commission", Icon: Gift, tint: "bg-sky-50 text-sky-600", sign: "+" },
  earning: { title: "Daily Income", Icon: Sparkles, tint: "bg-violet-50 text-violet-600", sign: "+" },
  harvest: { title: "Income Harvested", Icon: Sparkles, tint: "bg-violet-50 text-violet-600", sign: "+" },
  stake: { title: "Node Allocation", Icon: Layers, tint: "bg-slate-100 text-slate-600", sign: "-" },
  unstake: { title: "Node Released", Icon: Layers, tint: "bg-slate-100 text-slate-600", sign: "+" },
  early_unstake: { title: "Early Exit", Icon: Layers, tint: "bg-slate-100 text-slate-600", sign: "+" },
  fee: { title: "Fee", Icon: Receipt, tint: "bg-slate-100 text-slate-600", sign: "-" },
  voucher: { title: "Trial Voucher", Icon: Ticket, tint: "bg-amber-50 text-amber-600", sign: "+" },
  adjustment: { title: "Sandbox Adjustment", Icon: SlidersHorizontal, tint: "bg-slate-100 text-slate-600", sign: "±" },
};

function matches(filter: Filter, tx: Transaction): boolean {
  if (filter === "all") return true;
  if (filter === "deposits") return tx.type === "deposit";
  if (filter === "withdrawals") return tx.type === "withdraw";
  if (filter === "rewards") return tx.type === "bounty" || tx.type === "commission";
  return tx.type === "earning";
}

function signedAmount(tx: Transaction): { text: string; positive: boolean | null } {
  const abs = Math.abs(tx.amount);
  const digits = tx.type === "earning" || tx.type === "harvest" ? formatReward(abs) : formatAmount(abs);
  if (abs === 0) return { text: `${digits} USDT`, positive: null };
  const meta = META[tx.type];
  const positive = meta.sign === "±" ? tx.amount > 0 : meta.sign === "+";
  return { text: `${positive ? "+" : "-"}${digits} USDT`, positive };
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  const pending = status === "PENDING";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide ${
        pending ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {pending && <span className="h-1 w-1 animate-pulse rounded-full bg-amber-500" />}
      {status}
    </span>
  );
}

function Details({ tx, id }: { tx: Transaction; id: string }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Reference", <span key="ref" className="font-mono">{tx.id.slice(0, 18)}</span>],
  ];
  if (tx.network) {
    const network = getNetwork(tx.network);
    rows.push(["Network", `${network.label} (${network.chain})`]);
  }
  if (tx.address) {
    rows.push([
      tx.type === "deposit" ? "Deposit address" : "Destination",
      <span key="addr" className="break-all font-mono text-[11px]">{tx.address}</span>,
    ]);
  }
  if (tx.fee !== undefined) rows.push(["Network fee", `${formatAmount(tx.fee)} USDT`]);
  if (tx.type === "withdraw") {
    rows.push(["Net received", `${formatAmount(Math.max(0, tx.amount - (tx.fee ?? 0)))} USDT`]);
  }
  if (tx.txHash) {
    const hash = tx.txHash;
    rows.push([
      "Transaction hash",
      <span key="hash" className="flex items-start justify-end gap-2">
        <span data-testid="tx-hash" className="break-all font-mono text-[11px]">{hash}</span>
        <button
          type="button"
          onClick={async () =>
            (await copyText(hash)) ? toast.success("Transaction hash copied") : toast.error("Couldn't copy the hash")
          }
          aria-label="Copy transaction hash"
          className="shrink-0 rounded-md p-1 text-slate-500 outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
        </button>
      </span>,
    ]);
  } else if (tx.type === "withdraw" && tx.status === "PENDING") {
    rows.push(["Transaction hash", "Awaiting network broadcast…"]);
  }
  if (tx.completedAt) rows.push(["Completed", formatTime(tx.completedAt)]);
  if (tx.note && !tx.network) rows.push(["Note", tx.note]);

  return (
    <motion.div
      id={id}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={SPRING}
      className="overflow-hidden"
    >
      <dl className="mx-3.5 mb-3.5 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3.5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-2">
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="min-w-0 text-right font-medium text-slate-800">{value}</dd>
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
      <div role="group" aria-label="Filter transactions" className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setFilter(f.id);
                setLimit(PAGE_SIZE);
                setOpenId(null);
              }}
              className="relative shrink-0 rounded-full px-3 py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {active ? (
                <motion.span
                  layoutId="wallet-filter-pill"
                  className="absolute inset-0 rounded-full bg-slate-950"
                  transition={SPRING}
                />
              ) : (
                <span className="absolute inset-0 rounded-full border border-slate-200 bg-white" />
              )}
              <span className={`relative ${active ? "text-white" : "text-slate-600"}`}>{f.label}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-slate-100 bg-white px-4 py-10 text-center shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
            <Receipt className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-medium">{empty[filter].text}</p>
          <button
            type="button"
            onClick={empty[filter].onPress}
            className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
          >
            {empty[filter].cta}
          </button>
        </div>
      ) : (
        <ul
          aria-label="Transactions"
          className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
        >
          {visible.map((tx) => {
            const meta = META[tx.type];
            const amount = signedAmount(tx);
            const open = openId === tx.id;
            const detailsId = `tx-details-${tx.id}`;
            const context = tx.network ? getNetwork(tx.network).short : tx.note;
            return (
              <li key={tx.id} data-testid="tx-row" data-type={tx.type} data-status={tx.status}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : tx.id)}
                  aria-expanded={open}
                  aria-controls={detailsId}
                  className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.tint}`}>
                    <meta.Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{meta.title}</span>
                      <StatusBadge status={tx.status} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {formatTime(tx.createdAt)}
                      {context ? ` · ${context}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      data-testid="tx-amount"
                      className={`font-mono text-sm font-semibold tabular-nums ${
                        amount.positive === true ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {amount.text}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </span>
                </button>
                <AnimatePresence initial={false}>{open && <Details tx={tx} id={detailsId} />}</AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > visible.length && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE_SIZE)}
          className="rounded-2xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Show more ({items.length - visible.length} remaining)
        </button>
      )}
    </div>
  );
}
