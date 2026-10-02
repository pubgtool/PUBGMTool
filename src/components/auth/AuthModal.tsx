"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NavigatedContext, type BackAction } from "@/components/auth/AuthChrome";
import { ForgotView } from "@/components/auth/ForgotView";
import { LoginView } from "@/components/auth/LoginView";
import { RegisterView } from "@/components/auth/RegisterView";
import { WelcomeGatewayView } from "@/components/auth/WelcomeGatewayView";
import { type MessageKey, useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import type { AuthTab } from "@/types/domain";

/** Screens in forward order: moving to a later one slides left, to an earlier one slides right. */
const ORDER: Record<AuthTab, number> = { welcome: 0, login: 1, register: 2, forgot: 3 };

const TITLES: Record<AuthTab, MessageKey> = {
  welcome: "auth.dialog.welcome",
  login: "auth.dialog.login",
  register: "auth.dialog.register",
  forgot: "auth.dialog.forgot",
};

const SLIDE_PX = 24;

const SLIDE = {
  enter: (direction: number) => ({ opacity: 0, x: SLIDE_PX * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: -SLIDE_PX * direction }),
};
const FADE = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

/** Full-screen sign-in flow, driven by the store so any locked feature can open it. */
export function AuthModal() {
  const open = useAppStore((s) => s.isAuthModalOpen);
  const isGuest = useAppStore((s) => s.user.isGuest);
  const tab = useAppStore((s) => s.authModalTab);
  const reason = useAppStore((s) => s.authModalReason);
  const closeAuthModal = useAppStore((s) => s.closeAuthModal);

  // Signed in elsewhere (another tab, demo login): nothing left to do here.
  useEffect(() => {
    if (open && !isGuest) closeAuthModal();
  }, [open, isGuest, closeAuthModal]);

  // The dialog gets tab and reason as props so its exit animation keeps showing what it showed.
  return <AnimatePresence>{open && isGuest && <AuthDialog key="auth" tab={tab} reason={reason} />}</AnimatePresence>;
}

function AuthDialog({ tab, reason }: { tab: AuthTab; reason: string | null }) {
  const { t } = useT();
  const reduceMotion = useReducedMotion();
  const setTab = useAppStore((s) => s.setAuthModalTab);
  const closeAuthModal = useAppStore((s) => s.closeAuthModal);
  const setHasSeenWelcome = useAppStore((s) => s.setHasSeenWelcome);

  /** The screen the flow opened on decides where Back leads. */
  const [entry] = useState(tab);
  /** Shared so what was typed survives moving between screens; passwords are never lifted. */
  const [identifier, setIdentifier] = useState("");
  const [nav, setNav] = useState({ tab, direction: 1, moved: false });
  if (nav.tab !== tab) setNav({ tab, direction: ORDER[tab] >= ORDER[nav.tab] ? 1 : -1, moved: true });

  const scroller = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const continueAsGuest = () => {
    setHasSeenWelcome(true);
    closeAuthModal();
  };
  const goBack = () => {
    if (entry === "welcome") setTab("welcome");
    else closeAuthModal();
  };
  const back: BackAction = { kind: entry === "welcome" ? "back" : "close", onClick: goBack };

  const view = {
    welcome: <WelcomeGatewayView onNavigate={setTab} onGuest={continueAsGuest} />,
    login: <LoginView reason={reason} identifier={identifier} onIdentifierChange={setIdentifier} back={back} onNavigate={setTab} />,
    register: <RegisterView reason={reason} identifier={identifier} onIdentifierChange={setIdentifier} back={back} onNavigate={setTab} />,
    forgot: <ForgotView identifier={identifier} onIdentifierChange={setIdentifier} onNavigate={setTab} />,
  }[nav.tab];

  const variants = reduceMotion ? FADE : SLIDE;
  const fade = { duration: reduceMotion ? 0 : 0.18, ease: "easeOut" } as const;

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-[60] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
        </Dialog.Overlay>
        <Dialog.Content
          asChild
          aria-describedby={undefined}
          aria-modal="true"
          onOpenAutoFocus={(event) => {
            // Start on the container, not the first control, so no ring or keyboard appears unasked.
            event.preventDefault();
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            scroller.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            if (tab === "welcome") continueAsGuest();
            else if (tab === "forgot") setTab("login");
            else goBack();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <motion.div
            ref={scroller}
            tabIndex={-1}
            data-testid="auth-overlay"
            className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain outline-none"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={fade}
          >
            <Dialog.Title className="sr-only">{t(TITLES[nav.tab])}</Dialog.Title>
            <div className="mx-auto min-h-dvh w-full max-w-md">
              <NavigatedContext.Provider value={nav.moved}>
                <AnimatePresence
                  mode="wait"
                  initial={false}
                  custom={nav.direction}
                  onExitComplete={() => scroller.current?.scrollTo({ top: 0 })}
                >
                  <motion.div
                    key={nav.tab}
                    custom={nav.direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={fade}
                    className="flex min-h-dvh flex-col"
                  >
                    {view}
                  </motion.div>
                </AnimatePresence>
              </NavigatedContext.Provider>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

