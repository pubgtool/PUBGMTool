import { AuthModal } from "@/components/auth/AuthModal";
import { KYCModal } from "@/components/kyc/KYCModal";
import { AppProviders } from "@/components/providers/AppProviders";
import { ToastHost } from "@/components/ui/Toast";
import { BottomNav } from "@/components/layout/BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-slate-100 selection:bg-slate-900 selection:text-white">
      <AppProviders>
        <div className="relative flex min-h-screen w-full flex-col overflow-x-clip bg-slate-50 pb-20 shadow-2xl">
          {children}
        </div>
        <BottomNav />
        <AuthModal />
        <KYCModal />
      </AppProviders>
      <ToastHost />
    </div>
  );
}
