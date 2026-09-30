"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, FlaskConical } from "lucide-react";
import { CARD, TierBadge } from "@/components/vip/parts";
import { useNow } from "@/lib/hooks";
import { currentNode, relativeAge, telemetryEvents } from "@/lib/nodes";
import { useAppStore } from "@/lib/store";

const SPRING = { type: "spring", stiffness: 500, damping: 38 } as const;

/**
 * Sample activity for the demo. The events are generated on this device from a
 * fixed formula; they are not real users, and the screen says so.
 */
export function TelemetryFeed() {
  const positions = useAppStore((s) => s.positions);
  const now = useNow(1_000);
  const reduceMotion = useReducedMotion();
  const events = useMemo(() => telemetryEvents(now), [now]);
  const mine = currentNode(positions);
  // Rows that arrive after the first paint slide in; the initial list just appears.
  const animate = useRef(false);
  useEffect(() => {
    animate.current = true;
  }, []);

  return (
    <section aria-label="Node telemetry" data-testid="telemetry" className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Activity className="h-4 w-4 text-amber-400" aria-hidden />
          Node Telemetry
        </h2>
        <span
          data-testid="telemetry-simulated"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300"
        >
          <FlaskConical className="h-3 w-3" aria-hidden />
          Simulated
        </span>
      </div>

      {mine && (
        <p data-testid="telemetry-mine" className="mt-3 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          <TierBadge level={mine.tierLevel} />
          <span className="min-w-0 flex-1 truncate">You have a {mine.tierName} node running</span>
          <span className="shrink-0 tabular-nums text-amber-200/80">{relativeAge(now - Date.parse(mine.openedAt))}</span>
        </p>
      )}

      <ul className="mt-3 divide-y divide-slate-800" aria-label="Sample network activity">
        {events.map((event) => (
          <motion.li
            key={event.id}
            data-testid="telemetry-event"
            initial={reduceMotion || !animate.current ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="flex items-center gap-2 py-2.5 text-xs text-slate-300"
          >
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-mono tabular-nums text-slate-100">Node {event.maskedId}</span> activated{" "}
              <span className="font-semibold text-amber-300">VIP {event.level}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-400">{relativeAge(now - event.at)}</span>
          </motion.li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">Sample data generated on your device to preview the feed. These are not real users or real activity.</p>
    </section>
  );
}
