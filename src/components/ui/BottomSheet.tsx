"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

const SPRING = { type: "spring", stiffness: 300, damping: 25 } as const;
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
  /** "dark" deepens the overlay for full-attention flows such as sign-in. */
  tone?: "default" | "dark";
  /** Renders above full-screen overlays such as the auth screens. */
  elevated?: boolean;
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
export function BottomSheet({ open, onClose, children, keyboardAware = false, tone = "default", elevated = false }: BottomSheetProps) {
  const controls = useDragControls();
  const inset = useKeyboardInset(keyboardAware && open);
  const reduceMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  /** Radix only restores focus to a Dialog.Trigger; these sheets open from arbitrary buttons. */
  const returnFocus = useRef<HTMLElement | null>(null);

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
                className={`fixed inset-0 ${elevated ? "z-[65]" : "z-[45]"} ${tone === "dark" ? "bg-black/50" : "bg-black/40"} backdrop-blur-md`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              />
            </Dialog.Overlay>
            <div className={`fixed inset-x-0 bottom-0 ${elevated ? "z-[66]" : "z-[46]"} mx-auto max-w-md`} style={{ bottom: inset.bottom }}>
              <Dialog.Content
                asChild
                forceMount
                onOpenAutoFocus={(event) => {
                  returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                  // Keep the mobile keyboard closed until the user taps the amount field.
                  event.preventDefault();
                  contentRef.current?.focus({ preventScroll: true });
                }}
                onEscapeKeyDown={(event) => {
                  // An open dropdown inside the sheet handles Escape itself instead of closing the sheet.
                  if (document.querySelector("[data-escape-block]")) event.preventDefault();
                }}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  returnFocus.current?.focus({ preventScroll: true });
                  returnFocus.current = null;
                }}
              >
                <motion.div
                  ref={contentRef}
                  tabIndex={-1}
                  style={inset.height ? ({ "--sheet-max": `${Math.floor(inset.height * 0.92)}px` } as React.CSSProperties) : undefined}
                  className="-mb-8 rounded-t-[28px] border border-b-0 border-slate-100 bg-surface pb-8 shadow-2xl outline-none"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%", transition: reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
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
                    <span className="h-1 w-10 rounded-full bg-gray-300" />
                  </div>
                  <div className="max-h-[calc(var(--sheet-max,92dvh)-1.75rem)] overflow-y-auto overscroll-contain">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
