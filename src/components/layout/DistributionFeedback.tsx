"use client";

import { useEffect, useRef } from "react";
import { haptic, playChime } from "@/lib/feedback";
import { useAppStore } from "@/lib/store";

/**
 * One listener for the whole app: a chime and a short vibration whenever compute output reaches the
 * wallet, whether it was claimed or the 00:00 UTC cycle paid it. A payout that was already on record
 * when the app loaded is not replayed.
 */
export function DistributionFeedback() {
  const event = useAppStore((s) => s.distribution);
  const seen = useRef(event?.id ?? 0);

  useEffect(() => {
    if (!event || event.id === seen.current) return;
    seen.current = event.id;
    playChime("collect");
    haptic([16, 40, 24]);
  }, [event]);

  return null;
}
