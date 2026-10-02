"use client";

import { LanguagePanel } from "@/components/language/LanguagePanel";
import { useAppStore } from "@/lib/store";

/** Language as a sub-screen of Settings; it covers the dock so the confirm bar stays reachable. */
export function LanguageView() {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const back = () => setActiveTab("settings");
  return (
    <div data-testid="language-view" className="fixed inset-0 z-[55] flex justify-center bg-white sm:bg-black/40">
      <div className="flex h-dvh w-full max-w-md flex-col bg-white sm:shadow-2xl">
        <LanguagePanel onBack={back} onDone={back} />
      </div>
    </div>
  );
}
