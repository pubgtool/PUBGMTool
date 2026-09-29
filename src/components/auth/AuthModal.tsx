"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lock, ShieldCheck, X } from "lucide-react";
import { ForgotForm } from "@/components/auth/ForgotForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { PROTOCOL } from "@/config/protocol";
import { useAppStore } from "@/lib/store";
import type { AuthTab } from "@/types/domain";

const SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 } as const;
const ORDER: readonly AuthTab[] = ["login", "register", "forgot"];

const COPY: Record<AuthTab, { title: string; subtitle: string }> = {
  login: { title: "Welcome back", subtitle: "Sign in to your terminal" },
  register: { title: "Create your account", subtitle: "Start with a 50.00 USDT trial voucher" },
  forgot: { title: "Reset password", subtitle: "Verify your identity to set a new one" },
};

/** Global sign-in modal, driven by the store so any locked feature can open it. */
export function AuthModal() {
  const open = useAppStore((s) => s.isAuthModalOpen);
  const isGuest = useAppStore((s) => s.user.isGuest);
  const closeAuthModal = useAppStore((s) => s.closeAuthModal);

  // Signed in elsewhere (another tab, demo login): nothing left to do here.
  useEffect(() => {
    if (open && !isGuest) closeAuthModal();
  }, [open, isGuest, closeAuthModal]);

  return (
    <BottomSheet open={open && isGuest} onClose={closeAuthModal} keyboardAware tone="dark">
      {open && <AuthBody onClose={closeAuthModal} />}
    </BottomSheet>
  );
}

function AuthBody({ onClose }: { onClose: () => void }) {
  const tab = useAppStore((s) => s.authModalTab);
  const reason = useAppStore((s) => s.authModalReason);
  const setTab = useAppStore((s) => s.setAuthModalTab);
  const reduceMotion = useReducedMotion();

  // Shared so what was typed survives switching tabs; passwords are never lifted.
  const [identifier, setIdentifier] = useState("");
  const previous = useRef(ORDER.indexOf(tab));
  const direction = ORDER.indexOf(tab) >= previous.current ? 1 : -1;
  useEffect(() => {
    previous.current = ORDER.indexOf(tab);
  }, [tab]);

  const onSwitch = useCallback((next: AuthTab) => setTab(next), [setTab]);
  const copy = COPY[tab];

  return (
    <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg font-semibold leading-tight tracking-tight">{copy.title}</SheetTitle>
            <SheetDescription className="truncate text-xs text-slate-500">{copy.subtitle}</SheetDescription>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full bg-slate-100 p-2 text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {reason && tab !== "forgot" && (
        <p data-testid="auth-reason" className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700">
          <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {reason}
        </p>
      )}

      {tab !== "forgot" && (
        <div role="tablist" aria-label="Account" className="relative mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          {(["login", "register"] as const).map((id) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`auth-tab-${id}`}
                aria-selected={active}
                aria-controls="auth-panel"
                onClick={() => onSwitch(id)}
                className="relative rounded-xl py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {active && (
                  <motion.span layoutId="auth-tab-pill" className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={SPRING} />
                )}
                <span className={`relative ${active ? "text-slate-950" : "text-slate-500"}`}>
                  {id === "login" ? "Sign In" : "Create Account"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <AnimatedHeight>
        <div id="auth-panel" role="tabpanel" aria-labelledby={tab === "forgot" ? undefined : `auth-tab-${tab}`} className="px-1 pb-1 pt-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduceMotion ? false : { opacity: 0, x: 18 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18 * direction }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
            >
              {tab === "login" && <LoginForm identifier={identifier} setIdentifier={setIdentifier} onSwitch={onSwitch} />}
              {tab === "register" && <RegisterForm identifier={identifier} setIdentifier={setIdentifier} onSwitch={onSwitch} />}
              {tab === "forgot" && <ForgotForm identifier={identifier} setIdentifier={setIdentifier} onSwitch={onSwitch} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </AnimatedHeight>

      <p className="mt-2 text-center text-[11px] text-slate-400">
        {PROTOCOL.name} sandbox · accounts and balances stay in this browser
      </p>
    </div>
  );
}

/** Animates between content heights so switching tabs doesn't make the sheet jump. */
function AnimatedHeight({ children }: { children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    setHeight(el.offsetHeight);
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div initial={false} animate={{ height }} transition={reduceMotion ? { duration: 0 } : SPRING} className="overflow-hidden">
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}
