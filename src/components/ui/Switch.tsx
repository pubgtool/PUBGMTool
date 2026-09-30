"use client";

import { motion } from "framer-motion";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  /** "dark" for use on dark surfaces. */
  tone?: "light" | "dark";
}

const SPRING = { type: "spring", stiffness: 600, damping: 34 } as const;

export function Switch({ checked, onChange, label, disabled = false, tone = "light" }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-8 w-[52px] shrink-0 items-center rounded-full p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? `justify-end ${tone === "dark" ? "bg-amber-400" : "bg-slate-950"}`
          : `justify-start ${tone === "dark" ? "bg-slate-700" : "bg-slate-200"}`
      }`}
    >
      <motion.span layout transition={SPRING} className="h-7 w-7 rounded-full bg-white shadow-sm" />
    </button>
  );
}
