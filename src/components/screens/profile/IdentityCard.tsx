"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, LogOut, ShieldAlert, ShieldCheck, ShieldX, User, UserCog, Zap, type LucideIcon } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { ADMIN } from "@/config/protocol";
import { useChatStore } from "@/lib/chat";
import { initialsOf } from "@/lib/identity";
import { useAppStore } from "@/lib/store";
import type { KycStatus } from "@/types/domain";

const TAP = { scale: 0.96 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

const KYC_CHIP: Record<KycStatus, { label: string; Icon: LucideIcon; className: string }> = {
  NONE: { label: "Verify identity", Icon: ShieldAlert, className: "bg-slate-100 text-slate-700" },
  PENDING: { label: "Pending Verification", Icon: ShieldAlert, className: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified Level 1", Icon: ShieldCheck, className: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Verification rejected", Icon: ShieldX, className: "bg-rose-50 text-rose-700" },
};

const joined = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });

export function IdentityCard({ onOpenKyc }: { onOpenKyc: () => void }) {
  const user = useAppStore((s) => s.user);
  const positions = useAppStore((s) => s.positions);
  const logout = useAppStore((s) => s.logout);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const vipLevel = useMemo(
    () => positions.reduce((max, p) => (p.status === "active" ? Math.max(max, p.tierLevel) : max), 0),
    [positions],
  );

  const onLogout = () => {
    useChatStore.getState().reset();
    logout();
    toast.success("Signed out");
  };

  if (user.isGuest) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" aria-label="Identity">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">Anonymous Node</p>
            <p className="text-xs text-slate-500">Guest session</p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
          Sign in to unlock your invite link, identity verification and security settings.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={() => openAuthModal("login", "Sign in to your account")}
            data-testid="profile-signin"
            className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            Sign In
          </motion.button>
          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={() => openAuthModal("register", "Create an account to get your UID and trial voucher")}
            data-testid="profile-register"
            className="rounded-2xl bg-slate-950 py-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
          >
            Create Account
          </motion.button>
        </div>
      </section>
    );
  }

  const kyc = KYC_CHIP[user.kycStatus];

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" aria-label="Identity">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-base font-semibold text-white min-[360px]:h-14 min-[360px]:w-14 min-[360px]:text-lg"
        >
          {initialsOf(user.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p data-testid="profile-name" className="min-w-0 truncate text-lg font-semibold tracking-tight">
              {user.displayName}
            </p>
            <motion.button
              type="button"
              whileTap={TAP}
              transition={SPRING}
              onClick={onLogout}
              aria-label="Log out"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 min-[360px]:px-3"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden min-[360px]:inline">Log out</span>
            </motion.button>
          </div>
          <p data-testid="profile-uid" className="mt-0.5 whitespace-nowrap font-mono text-xs tabular-nums text-slate-500">
            UID: {user.uid}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Registered <time dateTime={user.createdAt}>{joined.format(new Date(user.createdAt))}</time>
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {vipLevel > 0 ? (
          <span
            data-testid="profile-vip"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden />
            VIP {vipLevel} Institutional Node
          </span>
        ) : (
          <button
            type="button"
            data-testid="profile-vip"
            onClick={() => setActiveTab("vaults")}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden />
            No VIP plan yet · Explore
          </button>
        )}

        <button
          type="button"
          data-testid="profile-kyc"
          onClick={onOpenKyc}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${kyc.className}`}
        >
          <kyc.Icon className="h-3.5 w-3.5" aria-hidden />
          {kyc.label}
        </button>

        {user.role === "admin" && (
          <Link
            href={ADMIN.route}
            data-testid="profile-admin-pill"
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          >
            <UserCog className="h-3.5 w-3.5" aria-hidden />
            Admin Matrix
          </Link>
        )}
      </div>
    </section>
  );
}
