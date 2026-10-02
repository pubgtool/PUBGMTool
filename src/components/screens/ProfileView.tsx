"use client";

import { useState } from "react";
import { AssetHero } from "@/components/screens/profile/AssetHero";
import { CoreFunctions } from "@/components/screens/profile/CoreFunctions";
import { GuestPrompt } from "@/components/screens/profile/GuestPrompt";
import { IdentityBar } from "@/components/screens/profile/IdentityBar";
import { UtilityGrid } from "@/components/screens/profile/UtilityGrid";
import { useAppStore } from "@/lib/store";

export function ProfileView() {
  const guest = useAppStore((s) => s.user.isGuest);
  const [hidden, setHidden] = useState(false);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
      <IdentityBar hidden={hidden} onToggle={() => setHidden((h) => !h)} />
      {guest && <GuestPrompt />}
      <AssetHero hidden={hidden} />
      <UtilityGrid />
      <CoreFunctions />
    </main>
  );
}
