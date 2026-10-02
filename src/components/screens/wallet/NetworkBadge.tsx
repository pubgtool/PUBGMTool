import { getNetwork } from "@/lib/wallet";
import type { PaymentNetwork } from "@/types/domain";

const TONE: Record<PaymentNetwork, string> = {
  trc20: "bg-rose-500/15 text-rose-600 ring-rose-400/30",
  erc20: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30",
  ton: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  bep20: "bg-yellow-500/15 text-yellow-300 ring-yellow-400/30",
};

function Marks({ id }: { id: PaymentNetwork }) {
  switch (id) {
    case "trc20":
      return (
        <>
          <path d="M3.5 4.5 20.5 7.5 12.3 20.5Z" />
          <path d="M3.5 4.5 14.6 12.4M20.5 7.5 14.6 12.4M12.3 20.5 14.6 12.4" />
        </>
      );
    case "erc20":
      return (
        <>
          <path d="M12 2.5 5.5 12.2 12 16 18.5 12.2Z" fill="currentColor" fillOpacity={0.9} stroke="none" />
          <path d="M12 17.6 5.5 13.8 12 21.5 18.5 13.8Z" fill="currentColor" fillOpacity={0.6} stroke="none" />
        </>
      );
    case "ton":
      return (
        <>
          <path d="M5.4 6.2h13.2c.85 0 1.35.9.93 1.63l-6.6 11.6a1.07 1.07 0 0 1-1.86 0l-6.6-11.6A1.07 1.07 0 0 1 5.4 6.2Z" />
          <path d="M12 6.5v13" />
        </>
      );
    case "bep20":
      return (
        <g fill="currentColor" stroke="none">
          <path d="M12 9.6 14.4 12 12 14.4 9.6 12Z" />
          <path d="M12 3 14.4 5.4 12 7.8 9.6 5.4Z" />
          <path d="M12 16.2 14.4 18.6 12 21 9.6 18.6Z" />
          <path d="M3 12 5.4 9.6 7.8 12 5.4 14.4Z" />
          <path d="M16.2 12 18.6 9.6 21 12 18.6 14.4Z" />
        </g>
      );
  }
}

/** Abstract chain marks. Decorative: the network name always sits next to them. */
export function NetworkGlyph({ id, className = "h-4 w-4" }: { id: PaymentNetwork; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <Marks id={id} />
    </svg>
  );
}

interface TileProps {
  id: PaymentNetwork;
  size?: "xs" | "sm" | "md";
  round?: boolean;
}

const TILE: Record<NonNullable<TileProps["size"]>, { box: string; glyph: string }> = {
  xs: { box: "h-6 w-6", glyph: "h-3.5 w-3.5" },
  sm: { box: "h-8 w-8", glyph: "h-4 w-4" },
  md: { box: "h-10 w-10", glyph: "h-5 w-5" },
};

export function NetworkTile({ id, size = "md", round = false }: TileProps) {
  const { box, glyph } = TILE[size];
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center ring-1 ring-inset ${box} ${
        round ? "rounded-full" : size === "xs" ? "rounded-md" : "rounded-xl"
      } ${TONE[id]}`}
    >
      <NetworkGlyph id={id} className={glyph} />
    </span>
  );
}

/** Read-only network pill, for places that show the choice without offering it. */
export function NetworkBadge({ id }: { id: PaymentNetwork }) {
  const info = getNetwork(id);
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-canvas/60 py-1.5 pl-1.5 pr-4">
      <NetworkTile id={id} size="sm" round />
      <span className="text-left leading-tight">
        <span className="block text-sm font-bold text-fg">{info.label}</span>
        <span className="block text-[11px] text-fg-secondary">{info.chain}</span>
      </span>
    </span>
  );
}
