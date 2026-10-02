"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { LanguagePanel } from "@/components/language/LanguagePanel";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Full-screen language picker that sits above every other layer (including the auth screens). */
export function LanguageSelectModal({ open, onClose }: Props) {
  const { t } = useT();
  const reduceMotion = useReducedMotion();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                data-testid="language-modal"
                className="fixed inset-0 z-[70] flex justify-center bg-white outline-none sm:bg-black/40"
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              >
                <div className="flex h-dvh w-full max-w-md flex-col bg-white sm:shadow-2xl">
                  <Dialog.Title className="sr-only">{t("language.heading")}</Dialog.Title>
                  <LanguagePanel onBack={onClose} onDone={onClose} />
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
