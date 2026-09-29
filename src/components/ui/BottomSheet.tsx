"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;
const DISMISS_OFFSET_PX = 120;
const DISMISS_VELOCITY = 600;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Lift the sheet above the on-screen keyboard. Mobile browsers overlay the
   * keyboard without resizing the layout viewport, which would cover a
   * bottom-pinned input. Exposes the usable height as `--sheet-max`.
   */
  keyboardAware?: boolean;
}

interface ViewportInset {
  bottom: number;
  height: number | null;
}

const NO_INSET: ViewportInset = { bottom: 0, height: null };

function useKeyboardInset(enabled: boolean): ViewportInset {
  const [inset, setInset] = useState<ViewportInset>(NO_INSET);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) return;
    const update = () =>
      setInset({
        bottom: Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
        height: viewport.height,
      });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setInset(NO_INSET);
    };
  }, [enabled]);
  return inset;
}

/**
 * Radix Dialog (focus trap, Escape, scroll lock, aria) with a Framer Motion
 * spring sheet that can be dragged down from the handle to dismiss. Pass
 * `SheetTitle` inside children for the accessible name.
 */
export function BottomSheet({ open, onClose, children, keyboardAware = false }: BottomSheetProps) {
  const controls = useDragControls();
  const inset = useKeyboardInset(keyboardAware && open);
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
            <div className="fixed inset-x-0 bottom-0 z-[46] mx-auto max-w-md" style={{ bottom: inset.bottom }}>
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
                  style={inset.height ? ({ "--sheet-max": `${Math.floor(inset.height * 0.92)}px` } as React.CSSProperties) : undefined}
                  className="max-h-[var(--sheet-max,92dvh)] overflow-y-auto overscroll-contain rounded-t-[28px] border border-b-0 border-slate-100 bg-white shadow-2xl outline-none"
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
