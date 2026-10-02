"use client";

import { useCallback, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { AnnouncementIllustration } from "@/components/promo/AnnouncementIllustration";
import { ExpandableDescription } from "@/components/promo/ExpandableDescription";
import { usdt } from "@/components/vip/cta";
import { useT } from "@/lib/i18n";
import { TRIAL_VOUCHER_AMOUNT, useAppStore, useStoreHydration } from "@/lib/store";

/** Trial-voucher offer for guests who have not seen it yet. Any way of closing it counts as seen. */
export function AnnouncementModal() {
  const { t } = useT();
  const hydrated = useStoreHydration();
  const seen = useAppStore((s) => s.hasSeenAnnouncement);
  const guest = useAppStore((s) => s.user.isGuest);
  const authOpen = useAppStore((s) => s.isAuthModalOpen);
  const welcomeDone = useAppStore((s) => s.hasSeenWelcome);
  const setSeen = useAppStore((s) => s.setHasSeenAnnouncement);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const regionId = useId();
  const content = useRef<HTMLDivElement>(null);

  // Only on the app itself, and only once the welcome gateway is out of the way: two overlays
  // racing at boot left this one mounted on top of a signed-in session.
  const open = hydrated && welcomeDone && !seen && guest && !authOpen && pathname === "/";
  const amount = usdt(TRIAL_VOUCHER_AMOUNT);
  const dismiss = useCallback(() => setSeen(true), [setSeen]);
  const showDetails = () => {
    setSeen(true);
    openAuthModal("register", t("announcement.reason", { amount }));
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto p-4">
              <motion.div
                aria-hidden
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              />
              <Dialog.Content
                asChild
                forceMount
                aria-modal="true"
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  content.current?.focus({ preventScroll: true });
                }}
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <motion.div
                  ref={content}
                  tabIndex={-1}
                  data-testid="announcement-modal"
                  className="relative my-auto flex w-full max-w-sm flex-col items-center outline-none"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                >
                  <div className="w-full overflow-hidden rounded-[32px] bg-white shadow-2xl">
                    <div className="bg-gradient-to-b from-sky-50 to-white px-6 pb-2 pt-6 text-center">
                      <Dialog.Title className="text-2xl font-black tracking-tight text-gray-900">{t("announcement.title")}</Dialog.Title>
                      <AnnouncementIllustration />
                    </div>

                    <div className="space-y-3 px-6 py-4">
                      <h3 className="text-lg font-bold leading-snug text-gray-900">{t("announcement.headline", { amount })}</h3>
                      <ExpandableDescription id={regionId} expanded={expanded}>
                        {t("announcement.body", { amount })} {t("announcement.demo")}
                      </ExpandableDescription>
                      <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        aria-expanded={expanded}
                        aria-controls={regionId}
                        data-testid="announcement-expand"
                        className="-my-2 flex min-h-11 items-center gap-1 rounded-md text-sm font-semibold text-blue-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        {expanded ? t("announcement.collapse") : t("announcement.expand")}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                    </div>

                    <div className="flex justify-end px-6 pb-6 pt-2">
                      <button
                        type="button"
                        onClick={showDetails}
                        data-testid="announcement-details"
                        className="min-h-11 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white outline-none transition-all hover:bg-gray-800 active:scale-95 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      >
                        {t("announcement.details")}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={dismiss}
                    aria-label={t("announcement.close")}
                    data-testid="announcement-close"
                    className="mt-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white outline-none transition-all hover:bg-white/30 active:scale-95 focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </motion.div>
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
