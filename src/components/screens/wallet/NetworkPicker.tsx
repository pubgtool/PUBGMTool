"use client";

import { NETWORKS, getNetwork } from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

interface NetworkPickerProps {
  name: string;
  value: PaymentNetwork;
  onChange: (network: PaymentNetwork) => void;
}

export function NetworkPicker({ name, value, onChange }: NetworkPickerProps) {
  return (
    <fieldset>
      <legend className="sr-only">Network</legend>
      <div className="grid grid-cols-3 gap-2">
        {NETWORKS.map((network) => {
          const selected = value === network.id;
          return (
            <label key={network.id} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={network.id}
                checked={selected}
                onChange={() => onChange(network.id)}
                className="peer sr-only"
              />
              <span
                className={`flex h-full flex-col items-center justify-center gap-0.5 rounded-2xl border px-1.5 py-2.5 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-slate-900 peer-focus-visible:ring-offset-2 ${
                  selected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className="text-xs font-semibold">{network.label}</span>
                <span className={`text-[10px] ${selected ? "text-slate-300" : "text-slate-400"}`}>
                  {network.chain}
                </span>
                {network.tag && (
                  <span className="mt-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-emerald-700">
                    <span className="hidden min-[360px]:inline">{network.tag}</span>
                    <span className="min-[360px]:hidden">{network.tagShort ?? network.tag}</span>
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500" aria-live="polite">
        {getNetwork(value).label} ({getNetwork(value).chain}): {getNetwork(value).note}
      </p>
    </fieldset>
  );
}
