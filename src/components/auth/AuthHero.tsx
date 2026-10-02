"use client";

import { motion, useReducedMotion } from "framer-motion";
import { NexusMark } from "@/components/ui/NexusMark";

const SPARKLE = "M12 0c.7 6.6 5.4 11.3 12 12-6.6.7-11.3 5.4-12 12-.7-6.6-5.4-11.3-12-12 6.6-.7 11.3-5.4 12-12Z";

const SPARKLES = [
  { place: "-right-[20%] -top-[10%] h-[26%] w-[26%]", tone: "text-gray-900", delay: 0 },
  { place: "-left-[18%] top-[4%] h-[20%] w-[20%]", tone: "text-[#D4A017]", delay: 0.9 },
  { place: "-left-[30%] bottom-[20%] h-[12%] w-[12%]", tone: "text-gray-300", delay: 1.7 },
  { place: "-right-[28%] bottom-[6%] h-[16%] w-[16%]", tone: "text-gray-400", delay: 0.4 },
] as const;

const SIZES = {
  lg: "h-24 w-24",
  md: "h-[72px] w-[72px]",
} as const;

interface Props {
  size?: keyof typeof SIZES;
}

/** The platform mark scaled up, with four 4-point sparkles drifting around it. */
export function AuthHero({ size = "md" }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={`relative shrink-0 ${SIZES[size]}`} aria-hidden>
      <NexusMark className="h-full w-full shadow-[0_8px_24px_rgba(17,24,39,0.10)]" />
      {SPARKLES.map(({ place, tone, delay }) => (
        <motion.svg
          key={place}
          viewBox="0 0 24 24"
          className={`absolute ${place} ${tone}`}
          animate={reduceMotion ? undefined : { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay }}
        >
          <path d={SPARKLE} fill="currentColor" />
        </motion.svg>
      ))}
    </div>
  );
}

const TILE_W = 52;
const TILE_H = 90;

/** One isometric cube as three faces, drawn again at every wrap offset so the tile repeats seamlessly. */
type Point = readonly [number, number];

const FACES: ReadonlyArray<{ fill: string; points: readonly Point[] }> = [
  { fill: "#FCFCFD", points: [[0, -30], [26, -15], [0, 0], [-26, -15]] },
  { fill: "#F7F8FA", points: [[-26, -15], [0, 0], [0, 30], [-26, 15]] },
  { fill: "#F0F1F4", points: [[0, 0], [26, -15], [26, 15], [0, 30]] },
];

function cube(cx: number, cy: number): string {
  let out = "";
  for (const dx of [-TILE_W, 0, TILE_W]) {
    for (const dy of [-TILE_H, 0, TILE_H]) {
      for (const { fill, points } of FACES) {
        const path = points.map(([x, y]) => `${cx + dx + x},${cy + dy + y}`).join(" ");
        out += `<polygon points="${path}" fill="${fill}" stroke="#ECEEF1"/>`;
      }
    }
  }
  return out;
}

const TILE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}" viewBox="0 0 ${TILE_W} ${TILE_H}">${cube(26, 30)}${cube(0, 75)}</svg>`,
);

const FADE = "radial-gradient(ellipse 52% 58% at 50% 30%, #000 0%, transparent 100%)";

/** Faint isometric diamond lattice that fades out away from the hero. */
export function AuthBackdrop({ className = "inset-x-0 top-0 h-[420px]" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,${TILE}")`,
        backgroundSize: `${TILE_W}px ${TILE_H}px`,
        backgroundPosition: "center top",
        maskImage: FADE,
        WebkitMaskImage: FADE,
      }}
    />
  );
}
