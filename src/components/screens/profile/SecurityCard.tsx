"use client";

import { Bell, KeyRound, ShieldCheck, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";
import type { SecuritySettings } from "@/types/domain";

interface Row {
  key: keyof SecuritySettings;
  title: string;
  Icon: LucideIcon;
  status: (on: boolean) => string;
  toast: (on: boolean) => string;
}

const ROWS: readonly Row[] = [
  {
    key: "twoFactor",
    title: "Security & 2FA",
    Icon: ShieldCheck,
    status: (on) => (on ? "Google Authenticator · Enabled" : "Google Authenticator · Not set up"),
    toast: (on) => `Two-factor authentication ${on ? "enabled" : "disabled"}`,
  },
  {
    key: "paymentPin",
    title: "Payment Password",
    Icon: KeyRound,
    status: (on) => (on ? "PIN protection on" : "PIN protection off"),
    toast: (on) => `Payment PIN protection ${on ? "enabled" : "disabled"}`,
  },
  {
    key: "pushAlerts",
    title: "Notifications",
    Icon: Bell,
    status: (on) => (on ? "Push alerts on" : "Push alerts off"),
    toast: (on) => `Push alerts ${on ? "enabled" : "disabled"}`,
  },
];

export function SecurityCard() {
  const user = useAppStore((s) => s.user);
  const setSecurityPreference = useAppStore((s) => s.setSecurityPreference);

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" aria-label="Account security">
      <h2 className="text-sm font-semibold">Account Security</h2>
      <ul className="mt-2 divide-y divide-slate-100">
        {ROWS.map((row) => {
          const on = user.security[row.key];
          return (
            <li key={row.key} className="flex items-center gap-3 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <row.Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{row.title}</span>
                <span data-testid={`status-${row.key}`} className="block text-xs text-slate-500">
                  {row.status(on)}
                </span>
              </span>
              <Switch
                checked={on}
                disabled={user.isGuest}
                label={row.title}
                onChange={(next) => {
                  const result = setSecurityPreference(row.key, next);
                  if (result.ok) toast.success(row.toast(next));
                  else toast.error(result.error);
                }}
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[11px] text-slate-400">
        {user.isGuest
          ? "Sign in to manage security settings."
          : "Sandbox preferences: they're saved to your account but not enforced at sign-in or withdrawal yet."}
      </p>
    </section>
  );
}
