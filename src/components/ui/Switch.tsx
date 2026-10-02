"use client";

import { motion } from "framer-motion";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

const SPRING = { type: "spring", stiffness: 600, damping: 34 } as const;

/** iOS-style toggle: slate track, emerald when on. */
export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-8 w-[52px] shrink-0 items-center rounded-full p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "justify-end bg-emerald-500 shadow-btn-green" : "justify-start bg-gray-300"
      }`}
    >
      <motion.span layout transition={SPRING} className="h-7 w-7 rounded-full bg-white shadow-md" />
    </button>
  );
}
