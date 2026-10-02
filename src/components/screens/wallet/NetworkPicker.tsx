"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { NetworkTile } from "@/components/screens/wallet/NetworkBadge";
import { SPRING, TAP } from "@/components/screens/wallet/styles";
import { NETWORKS, getNetwork } from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

interface NetworkPickerProps {
  name: string;
  value: PaymentNetwork;
  onChange: (network: PaymentNetwork) => void;
}

const SELECTED =
  "border-amber-400/70 bg-amber-500/[0.09] shadow-[0_0_0_1px_rgba(251,191,36,0.3),0_0_22px_-6px_rgba(251,191,36,0.5)]";
const IDLE = "border-gray-200 bg-canvas/50 hover:border-gray-300";

export function NetworkPicker({ name, value, onChange }: NetworkPickerProps) {
  const reduceMotion = useReducedMotion();
  const current = getNetwork(value);
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Network</legend>
      <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-4">
        {NETWORKS.map((network) => {
          const selected = value === network.id;
          return (
            <label key={network.id} className="block cursor-pointer">
              <input
                type="radio"
                name={name}
                value={network.id}
                checked={selected}
                onChange={() => onChange(network.id)}
                className="peer sr-only"
              />
              <motion.span
                whileTap={TAP}
                transition={SPRING}
                className={`relative flex h-full min-h-[104px] flex-col items-center gap-1 rounded-2xl border px-1 pb-2.5 pt-3 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2 ${
                  selected ? SELECTED : IDLE
                }`}
              >
                {selected && (
                  <motion.span
                    aria-hidden
                    initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING}
                    className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-slate-950"
                  >
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </motion.span>
                )}
                <NetworkTile id={network.id} />
                <span className="sr-only">{network.label}</span>
                <span aria-hidden className="mt-0.5 text-[13px] font-bold leading-none text-fg">
                  {network.short}
                </span>
                <span className="text-[11px] leading-tight text-fg-secondary">{network.chain}</span>
                {network.tag && (
                  <span className="mt-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-emerald-700">
                    <span className="hidden max-[359px]:inline">{network.tag}</span>
                    <span className="max-[359px]:hidden">{network.tagShort ?? network.tag}</span>
                  </span>
                )}
              </motion.span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-fg-secondary" aria-live="polite">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
        <span>
          {current.label} ({current.chain}): {current.note}
        </span>
      </p>
    </fieldset>
  );
}
