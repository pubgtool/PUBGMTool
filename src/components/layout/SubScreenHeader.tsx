"use client";

import { ScreenBar } from "@/components/layout/ScreenBar";
import { useAppStore } from "@/lib/store";
import type { AppTab } from "@/types/domain";

/** ScreenBar wired to "back to where this screen was opened from". Render it above the padded <main>. */
export function SubScreenHeader({ title, fallback = "profile" }: { title: string; fallback?: AppTab }) {
  const backTab = useAppStore((s) => s.backTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  return <ScreenBar title={title} onBack={() => setActiveTab(backTab ?? fallback)} />;
}
