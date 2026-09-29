"use client";

import { motion } from "framer-motion";
import { Copy, FlaskConical, Gift, Link2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { REFERRAL } from "@/config/protocol";
import { copyText } from "@/lib/clipboard";
import { formatAmount } from "@/lib/format";
import { referralCode, referralLink } from "@/lib/identity";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

export function ReferralCard() {
  const user = useAppStore((s) => s.user);
  const simulateReferral = useAppStore((s) => s.simulateReferral);

  const copy = async (text: string, done: string) => {
    if (await copyText(text)) toast.success(done);
    else toast.error("Couldn't copy. Select the text and copy it manually.");
  };

  if (user.isGuest) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" aria-label="Invite to earn">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Gift className="h-4 w-4 text-slate-400" aria-hidden />
          Invite &amp; Earn
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Sign in to get your invite code and earn up to {REFERRAL.tiers[0].ratePct}% commission on your network&apos;s deposits.
        </p>
      </section>
    );
  }

  const code = referralCode(user.id);
  const link = referralLink(code);

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" aria-label="Invite to earn">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Gift className="h-4 w-4 text-slate-400" aria-hidden />
        Invite &amp; Earn
      </h2>
      <p className="mt-1 text-xs text-slate-500">Earn commission on deposits made by people you invite.</p>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Invite code</p>
          <button
            type="button"
            onClick={() => copy(code, "Invite code copied")}
            aria-label={`Copy invite code ${code}`}
            className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <span data-testid="referral-code" className="font-mono text-sm font-semibold tabular-nums">
              {code}
            </span>
            <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          </button>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Invite link</p>
          <p
            data-testid="referral-link"
            className="mt-1.5 break-all rounded-2xl bg-slate-50 px-3.5 py-3 font-mono text-[11px] leading-relaxed text-slate-700"
          >
            {link}
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={TAP}
        transition={SPRING}
        onClick={() => copy(link, "Referral link copied")}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-sm font-medium text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
      >
        <Link2 className="h-4 w-4" aria-hidden />
        Copy Referral Link
      </motion.button>

      <dl className="mt-4 grid grid-cols-3 gap-2" aria-label="Commission tiers">
        {REFERRAL.tiers.map((tier) => (
          <div key={tier.level} className="rounded-2xl bg-slate-50 px-3 py-2.5 text-center">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Tier {tier.level}</dt>
            <dd className="mt-0.5 font-mono text-base font-semibold tabular-nums">{tier.ratePct}%</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-2 grid grid-cols-2 gap-2" aria-label="Referral stats">
        <div className="rounded-2xl border border-slate-100 px-3.5 py-3">
          <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Invites</dt>
          <dd data-testid="referral-invites" className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
            {user.referral.invites}
          </dd>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-100 px-3.5 py-3">
          <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Commission Earned</dt>
          <dd className="mt-0.5 flex items-baseline gap-1 text-emerald-600">
            <span data-testid="referral-commission" className="min-w-0 truncate font-mono text-lg font-semibold tabular-nums">
              {formatAmount(user.referral.commissionEarned)}
            </span>
            <span className="shrink-0 text-xs font-medium text-emerald-600/70">USDT</span>
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <FlaskConical className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          Testnet Sandbox
        </p>
        <p className="mt-0.5 text-xs text-slate-500">Simulate a new Tier 1 invite making a deposit.</p>
        <motion.button
          type="button"
          whileTap={TAP}
          transition={SPRING}
          onClick={() => {
            const result = simulateReferral();
            if (!result.ok) toast.error(result.error);
            else toast.success("Referral commission credited");
          }}
          className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Simulate Invite
        </motion.button>
      </div>
    </section>
  );
}
