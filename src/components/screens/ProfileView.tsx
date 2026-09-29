"use client";

import { useCallback, useState } from "react";
import { AboutCard } from "@/components/screens/profile/AboutCard";
import { IdentityCard } from "@/components/screens/profile/IdentityCard";
import { KycSheet } from "@/components/screens/profile/KycSheet";
import { ReferralCard } from "@/components/screens/profile/ReferralCard";
import { SecurityCard } from "@/components/screens/profile/SecurityCard";
import { SupportCard } from "@/components/screens/profile/SupportCard";
import { LiveChatSheet } from "@/components/support/LiveChatSheet";

export function ProfileView() {
  const [kycOpen, setKycOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const closeKyc = useCallback(() => setKycOpen(false), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-0.5 text-xs text-slate-500">Identity, invites, support and security</p>
      </header>

      <IdentityCard onOpenKyc={() => setKycOpen(true)} />
      <ReferralCard />
      <SupportCard onOpenChat={() => setChatOpen(true)} />
      <SecurityCard />
      <AboutCard />

      <KycSheet open={kycOpen} onClose={closeKyc} />
      <LiveChatSheet open={chatOpen} onClose={closeChat} />
    </main>
  );
}
