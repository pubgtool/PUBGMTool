import { AuthModal } from "@/components/auth/AuthModal";
import { DemoStrip } from "@/components/layout/DemoStrip";
import { DistributionFeedback } from "@/components/layout/DistributionFeedback";
import { KYCModal } from "@/components/kyc/KYCModal";
import { AnnouncementModal } from "@/components/promo/AnnouncementModal";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppProviders } from "@/components/providers/AppProviders";
import { ToastHost } from "@/components/ui/Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div id="root" className="flex min-h-screen justify-center bg-canvas selection:bg-gray-900 selection:text-white">
      <AppProviders>
        <div className="relative flex min-h-screen w-full flex-col overflow-x-clip border-x border-gray-200/70 bg-canvas pb-28">
          <DemoStrip />
          {children}
        </div>
        <BottomNav />
        <DistributionFeedback />
        <AuthModal />
        <KYCModal />
        <AnnouncementModal />
      </AppProviders>
      <ToastHost />
    </div>
  );
}
