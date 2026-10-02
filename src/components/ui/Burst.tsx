"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#f59e0b", "#fbbf24", "#ef4444", "#10b981", "#0ea5e9", "#a855f7", "#f8fafc"] as const;
const PROFIT_COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#fbbf24"] as const;
const BURST_MS = 1_200;
const RAIN_MS = 4_600;

function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(items: readonly T[], r: number): T => items[Math.floor(r * items.length)] ?? items[0]!;

interface BurstProps {
  /** Increment to fire a new burst; 0 renders nothing. */
  burstKey: number;
  count?: number;
  radius?: number;
  /** "profit" bursts in emerald for claimed output. */
  palette?: "celebrate" | "profit";
}

/** Radial particle pop centred in its (relative) parent. */
export function BurstEffect({ burstKey, count = 16, radius = 72, palette = "celebrate" }: BurstProps) {
  const reduceMotion = useReducedMotion();
  const [activeKey, setActiveKey] = useState(0);

  useEffect(() => {
    if (!burstKey) return;
    setActiveKey(burstKey);
    const id = setTimeout(() => setActiveKey(0), BURST_MS);
    return () => clearTimeout(id);
  }, [burstKey]);

  const particles = useMemo(() => {
    const rand = seeded(burstKey * 9_973 + 17);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.5;
      const distance = radius * (0.55 + rand() * 0.45);
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 8,
        size: 4 + Math.round(rand() * 4),
        color: pick(palette === "profit" ? PROFIT_COLORS : COLORS, rand()),
      };
    });
  }, [burstKey, count, radius, palette]);

  if (reduceMotion || activeKey === 0) return null;

  return (
    <span
      aria-hidden
      data-testid="burst"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {particles.map((p) => (
        <motion.span
          key={`${activeKey}-${p.id}`}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </span>
  );
}

/** Full-screen falling confetti; stops on its own after a few seconds. */
export function ConfettiRain({ count = 46 }: { count?: number }) {
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDone(true), RAIN_MS);
    return () => clearTimeout(id);
  }, []);

  const pieces = useMemo(() => {
    const rand = seeded(count * 131 + 7);
    return Array.from({ length: count }, (_, i) => {
      const sway = 18 + rand() * 30;
      return {
        id: i,
        left: rand() * 100,
        width: 6 + Math.round(rand() * 5),
        height: 9 + Math.round(rand() * 7),
        color: pick(COLORS, rand()),
        delay: rand() * 0.6,
        duration: 2.4 + rand() * 1.6,
        spin: (rand() > 0.5 ? 1 : -1) * (360 + rand() * 720),
        sway: [0, sway, -sway, sway / 2],
      };
    });
  }, [count]);

  if (reduceMotion || done) return null;

  return (
    <div
      aria-hidden
      data-testid="confetti"
      className="pointer-events-none fixed inset-0 z-[47] overflow-hidden"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 rounded-[2px]"
          style={{ left: `${p.left}%`, width: p.width, height: p.height, backgroundColor: p.color }}
          initial={{ y: "-8vh", x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "108vh", x: p.sway, rotate: p.spin, opacity: [1, 1, 0.9, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
