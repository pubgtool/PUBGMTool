"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

const C = 0.866;
const S = 0.5;
const pt = (x: number, y: number) => `${+x.toFixed(1)},${+y.toFixed(1)}`;

/** The three visible faces of an isometric box whose front-bottom corner is (x, y). */
function box(x: number, y: number, w: number, d: number, h: number) {
  const rx = x + w * C;
  const ry = y - w * S;
  const lx = x - d * C;
  const ly = y - d * S;
  const bx = rx - d * C;
  const by = ry - d * S;
  return {
    top: [pt(x, y - h), pt(rx, ry - h), pt(bx, by - h), pt(lx, ly - h)].join(" "),
    left: [pt(x, y), pt(lx, ly), pt(lx, ly - h), pt(x, y - h)].join(" "),
    right: [pt(x, y), pt(rx, ry), pt(rx, ry - h), pt(x, y - h)].join(" "),
  };
}

interface Tone {
  top: string;
  left: string;
  right: string;
}

const SKY: Tone = { top: "#E0F2FE", left: "#7DD3FC", right: "#38BDF8" };
const INDIGO: Tone = { top: "#E0E7FF", left: "#A5B4FC", right: "#6366F1" };
const SLATE: Tone = { top: "#64748B", left: "#334155", right: "#1E293B" };

function Box({ x, y, w, d, h, tone }: { x: number; y: number; w: number; d: number; h: number; tone: Tone }) {
  const faces = box(x, y, w, d, h);
  return (
    <g strokeLinejoin="round" stroke="#fff" strokeWidth="0.8" strokeOpacity="0.55">
      <polygon points={faces.left} fill={tone.left} />
      <polygon points={faces.right} fill={tone.right} />
      <polygon points={faces.top} fill={tone.top} />
    </g>
  );
}

const TOWER = { x: 96, y: 126, w: 54, d: 42, h: 17, gap: 3 };
const PAD = { x: 196, y: 130, w: 38, d: 34, h: 11 };
const LEDS = ["#34D399", "#FBBF24", "#FFFFFF"] as const;

/** A point on the right-hand face of a tower slab, `t` along the face and `v` up from its bottom edge. */
const onRight = (slabY: number, t: number, v: number) => pt(TOWER.x + t * C, slabY - t * S - v);

/** Isometric server stack wired to an arcade joystick. Decorative, so hidden from assistive tech. */
export function AnnouncementIllustration() {
  const reduceMotion = useReducedMotion();
  const id = useId();
  const slabs = [0, 1, 2].map((i) => ({ y: TOWER.y - i * (TOWER.h + TOWER.gap), tone: i === 1 ? INDIGO : SKY }));
  const padTopY = PAD.y - PAD.h;
  const stick = { x: PAD.x + ((PAD.w - PAD.d) * C) / 2, y: padTopY - ((PAD.w + PAD.d) * S) / 2 };

  return (
    <svg viewBox="0 0 240 160" aria-hidden className="mx-auto mt-1 h-[140px] w-[210px]" fill="none">
      <defs>
        <radialGradient id={`${id}-ball`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FEF3C7" />
          <stop offset="0.45" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#BAE6FD" stopOpacity="0.9" />
          <stop offset="1" stopColor="#BAE6FD" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="118" cy="86" rx="112" ry="66" fill={`url(#${id}-glow)`} />
      <ellipse cx="110" cy="136" rx="74" ry="11" fill="#0F172A" opacity="0.1" />
      <ellipse cx="198" cy="140" rx="30" ry="6" fill="#0F172A" opacity="0.12" />

      <motion.g animate={reduceMotion ? undefined : { y: [0, -4, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
        {slabs.map((slab, i) => (
          <g key={i}>
            <Box x={TOWER.x} y={slab.y} w={TOWER.w} d={TOWER.d} h={TOWER.h} tone={slab.tone} />
            {LEDS.map((color, n) => (
              <circle key={color} cx={TOWER.x + (9 + n * 8) * C} cy={slab.y - (9 + n * 8) * S - TOWER.h / 2} r="1.9" fill={color} />
            ))}
            <polygon
              points={[onRight(slab.y, 32, 5), onRight(slab.y, 47, 5), onRight(slab.y, 47, 12), onRight(slab.y, 32, 12)].join(" ")}
              fill="#0F172A"
              opacity="0.28"
            />
            <path d={`M${pt(TOWER.x - 10 * C, slab.y - 10 * S - 5)} L${pt(TOWER.x - 10 * C, slab.y - 10 * S - 12)}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
            <path d={`M${pt(TOWER.x - 18 * C, slab.y - 18 * S - 5)} L${pt(TOWER.x - 18 * C, slab.y - 18 * S - 12)}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
            <path d={`M${pt(TOWER.x - 26 * C, slab.y - 26 * S - 5)} L${pt(TOWER.x - 26 * C, slab.y - 26 * S - 12)}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        ))}

        <path d="M143 98 C 155 103, 163 107, 172 110" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <path d="M143 112 C 156 123, 168 122, 180 116" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" />
        <circle cx="143" cy="98" r="3" fill="#F59E0B" stroke="#fff" strokeWidth="1" />
        <circle cx="143" cy="112" r="3" fill="#6366F1" stroke="#fff" strokeWidth="1" />

        <Box x={PAD.x} y={PAD.y} w={PAD.w} d={PAD.d} h={PAD.h} tone={SLATE} />
        <circle cx="172" cy="110" r="2.4" fill="#F59E0B" stroke="#fff" strokeWidth="0.8" />
        <circle cx="180" cy="116" r="2.4" fill="#6366F1" stroke="#fff" strokeWidth="0.8" />
        <ellipse cx={stick.x + 9} cy={stick.y + 5} rx="4.2" ry="2.4" fill="#F59E0B" />
        <ellipse cx={stick.x + 17} cy={stick.y + 9} rx="4.2" ry="2.4" fill="#6366F1" />
        <ellipse cx={stick.x} cy={stick.y + 1} rx="7" ry="4" fill="#0F172A" opacity="0.5" />
        <path d={`M${stick.x} ${stick.y} L${stick.x} ${stick.y - 26}`} stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
        <circle cx={stick.x} cy={stick.y - 31} r="11" fill={`url(#${id}-ball)`} />
      </motion.g>

      <g fill="#7DD3FC">
        <path d="M24 40 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z" />
        <circle cx="214" cy="40" r="2.5" />
        <circle cx="30" cy="104" r="2" />
      </g>
    </svg>
  );
}
