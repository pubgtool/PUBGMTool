"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { CalendarCheck, ChevronRight, Cpu, Gift, type LucideIcon } from "lucide-react";
import { GoldGlow } from "@/components/ui/GoldGlow";
import { CYCLE_LABEL } from "@/config/nodes";
import { FESTIVAL, countdownParts, msUntilRoundEnd } from "@/lib/festival";
import { formatRate } from "@/lib/format";
import { useLiveNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import type { AppTab } from "@/types/domain";

const AUTO_MS = 5_000;
const COUNT = 3;
const pad2 = (n: number) => String(n).padStart(2, "0");

function FestivalCountdown() {
  const { t } = useT();
  const now = useLiveNow(1_000);
  const parts = now === null ? null : countdownParts(msUntilRoundEnd(now));
  const time = parts ? `${pad2(parts.h)}:${pad2(parts.m)}:${pad2(parts.s)}` : "--:--:--";
  return (
    <span
      role="timer"
      data-testid="home-countdown"
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-amber-100"
    >
      {t("home.promo.festival.ends")}
      <span className="font-mono font-bold tabular-nums text-amber-300">{time}</span>
    </span>
  );
}

function GoLink({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-amber-300">
      {label}
      <ChevronRight className="h-4 w-4" aria-hidden />
    </span>
  );
}

interface SlideProps {
  index: number;
  tab: AppTab;
  Icon: LucideIcon;
  eyebrow: string;
  title: string;
  sub: string;
  footer: ReactNode;
}

function Slide({ index, tab, Icon, eyebrow, title, sub, footer }: SlideProps) {
  const { t } = useT();
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  return (
    <div role="group" aria-roledescription="slide" aria-label={t("home.promo.slide", { n: index + 1, total: COUNT })} className="w-full shrink-0 snap-start snap-always">
      <button
        type="button"
        data-testid={`home-slide-${index}`}
        onClick={() => setActiveTab(tab)}
        className="relative flex h-full min-h-[148px] w-full flex-col items-start overflow-hidden bg-gradient-to-r from-[#1E1B18] via-[#2A2318] to-[#3B301D] px-5 pb-1.5 pt-4 text-left text-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
      >
        <GoldGlow />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
        <span aria-hidden className="absolute right-4 top-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-amber-300">
          <Icon className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">{eyebrow}</span>
        <span className="mt-1.5 block pr-16 text-xl font-black leading-tight tracking-tight">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-amber-100/80">{sub}</span>
        <span className="mt-auto flex min-h-9 items-center pr-36 pt-2">{footer}</span>
      </button>
    </div>
  );
}

export function PromoCarousel() {
  const { t } = useT();
  const tiers = useAppStore((s) => s.tiers);
  const reduceMotion = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const holds = useRef(new Set<string>());
  const touchedAt = useRef(0);
  const [active, setActive] = useState(0);

  const topRate = useMemo(() => tiers.reduce((max, tier) => (tier.isActive ? Math.max(max, tier.dailyRatePct) : max), 0), [tiers]);

  const scrollToSlide = useCallback(
    (index: number) => {
      const el = track.current;
      if (el) el.scrollTo({ left: index * el.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [reduceMotion],
  );

  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.min(COUNT - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  };

  // Any hover, focus or touch pauses auto-advance, and it waits a full interval after letting go.
  const hold = (reason: string) => {
    holds.current.add(reason);
    touchedAt.current = Date.now();
  };
  const release = (reason: string) => {
    holds.current.delete(reason);
    touchedAt.current = Date.now();
  };

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      const el = track.current;
      if (!el || el.clientWidth === 0 || document.hidden || holds.current.size > 0 || Date.now() - touchedAt.current < AUTO_MS) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: ((current + 1) % COUNT) * el.clientWidth, behavior: "smooth" });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("home.promo.label")}
      onPointerEnter={(event) => event.pointerType === "mouse" && hold("hover")}
      onPointerLeave={() => release("hover")}
      onPointerDown={() => hold("touch")}
      onPointerUp={() => release("touch")}
      onPointerCancel={() => release("touch")}
      onFocusCapture={() => hold("focus")}
      onBlurCapture={() => release("focus")}
      className="relative overflow-hidden rounded-2xl shadow-sm"
    >
      <div ref={track} data-testid="home-carousel" onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
        <Slide
          index={0}
          tab="vaults"
          Icon={Cpu}
          eyebrow={t("home.promo.staking.eyebrow")}
          title={t("home.promo.staking.title")}
          sub={topRate > 0 ? t("home.promo.staking.sub", { rate: formatRate(topRate) }) : t("home.promo.staking.subPlain", { time: CYCLE_LABEL })}
          footer={<GoLink label={t("home.promo.staking.cta")} />}
        />
        <Slide
          index={1}
          tab="promos"
          Icon={Gift}
          eyebrow={t("home.promo.festival.eyebrow")}
          title={FESTIVAL.title}
          sub={t("home.promo.festival.sub", { pct: FESTIVAL.bonusPct })}
          footer={<FestivalCountdown />}
        />
        <Slide
          index={2}
          tab="tasks"
          Icon={CalendarCheck}
          eyebrow={t("home.promo.tasks.eyebrow")}
          title={t("home.promo.tasks.title")}
          sub={t("home.promo.tasks.sub")}
          footer={<GoLink label={t("home.promo.tasks.cta")} />}
        />
      </div>

      <div className="absolute bottom-0 right-2 flex">
        {Array.from({ length: COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            data-testid={`home-dot-${i}`}
            aria-label={t("home.promo.goTo", { n: i + 1 })}
            aria-current={active === i ? "true" : undefined}
            onClick={() => scrollToSlide(i)}
            className="group flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <span className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${active === i ? "w-5 bg-amber-300" : "w-1.5 bg-white/40 group-hover:bg-white/60"}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
