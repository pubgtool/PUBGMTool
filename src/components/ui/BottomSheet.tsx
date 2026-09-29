"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { useRef } from "react";

export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;
const DISMISS_OFFSET_PX = 120;
const DISMISS_VELOCITY = 600;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Radix Dialog (focus trap, Escape, scroll lock, aria) with a Framer Motion
 * spring sheet that can be dragged down from the handle to dismiss. Pass
 * `SheetTitle` inside children for the accessible name.
 */
export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[45] bg-slate-950/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              />
            </Dialog.Overlay>
            <div className="fixed inset-x-0 bottom-0 z-[46] mx-auto max-w-md">
              <Dialog.Content
                asChild
                forceMount
                onOpenAutoFocus={(event) => {
                  // Keep the mobile keyboard closed until the user taps the amount field.
                  event.preventDefault();
                  contentRef.current?.focus({ preventScroll: true });
                }}
              >
                <motion.div
                  ref={contentRef}
                  tabIndex={-1}
                  className="max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border border-b-0 border-slate-100 bg-white shadow-2xl outline-none"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={reduceMotion ? { duration: 0 } : SPRING}
                  drag="y"
                  dragControls={controls}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.5 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) onClose();
                  }}
                >
                  <div
                    className="flex touch-none justify-center pb-3 pt-3"
                    onPointerDown={(event) => controls.start(event)}
                    aria-hidden
                  >
                    <span className="h-1 w-10 rounded-full bg-slate-200" />
                  </div>
                  {children}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
