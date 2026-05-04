import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import {
  Crosshair,
  Settings,
  Sparkles,
  LayoutGrid,
  RotateCw,
  TrendingUp,
  Target,
  Swords,
  Zap,
  TrendingDown,
  Backpack,
  Plus,
  Smartphone,
  Map,
  Lightbulb,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { I18nContext, DICTIONARIES, type Lang, useI18n } from './i18n';
import { useLocalStorage } from './hooks/useLocalStorage';

const SensitivityBuilder = lazy(() => import('./modules/SensitivityBuilder'));
const HudLayoutGenerator = lazy(() => import('./modules/HudLayoutGenerator'));
const GyroCalibration = lazy(() => import('./modules/GyroCalibration'));
const RecoilPatternLab = lazy(() => import('./modules/RecoilPatternLab'));
const HeadshotDrillTrainer = lazy(() => import('./modules/HeadshotDrillTrainer'));
const WeaponTtkCalculator = lazy(() => import('./modules/WeaponTtkCalculator'));
const ReactionTimeTester = lazy(() => import('./modules/ReactionTimeTester'));
const DamageFalloffCalculator = lazy(() => import('./modules/DamageFalloffCalculator'));
const LoadoutPlanner = lazy(() => import('./modules/LoadoutPlanner'));
const CrosshairTrainer = lazy(() => import('./modules/CrosshairTrainer'));
const DeviceProfile = lazy(() => import('./modules/DeviceProfile'));
const DropSpots = lazy(() => import('./modules/DropSpots'));
const TipsCoach = lazy(() => import('./modules/TipsCoach'));
const ControlsSetup = lazy(() => import('./modules/ControlsSetup'));
const ProTweaks = lazy(() => import('./modules/ProTweaks'));

type ModuleId =
  | 'sensitivity'
  | 'controls'
  | 'pro'
  | 'hud'
  | 'gyro'
  | 'recoil'
  | 'drill'
  | 'ttk'
  | 'reaction'
  | 'falloff'
  | 'loadout'
  | 'crosshair'
  | 'device'
  | 'maps'
  | 'tips';

interface NavItem {
  id: ModuleId;
  labelKey: string;
  Icon: LucideIcon;
  // RGB triplets for module accent gradient (used as CSS vars)
  accent: [string, string];
}

const NAV: NavItem[] = [
  { id: 'sensitivity', labelKey: 'nav.sensitivity', Icon: Crosshair, accent: ['251 146 60', '249 115 22'] }, // orange
  { id: 'controls', labelKey: 'nav.controls', Icon: Settings, accent: ['96 165 250', '59 130 246'] }, // blue
  { id: 'pro', labelKey: 'nav.pro', Icon: Sparkles, accent: ['167 139 250', '139 92 246'] }, // violet
  { id: 'hud', labelKey: 'nav.hud', Icon: LayoutGrid, accent: ['52 211 153', '16 185 129'] }, // emerald
  { id: 'gyro', labelKey: 'nav.gyro', Icon: RotateCw, accent: ['34 211 238', '6 182 212'] }, // cyan
  { id: 'recoil', labelKey: 'nav.recoil', Icon: TrendingUp, accent: ['251 113 133', '244 63 94'] }, // rose
  { id: 'drill', labelKey: 'nav.drill', Icon: Target, accent: ['251 191 36', '245 158 11'] }, // amber
  { id: 'ttk', labelKey: 'nav.ttk', Icon: Swords, accent: ['248 113 113', '239 68 68'] }, // red
  { id: 'reaction', labelKey: 'nav.reaction', Icon: Zap, accent: ['163 230 53', '132 204 22'] }, // lime
  { id: 'falloff', labelKey: 'nav.falloff', Icon: TrendingDown, accent: ['244 114 182', '236 72 153'] }, // pink
  { id: 'loadout', labelKey: 'nav.loadout', Icon: Backpack, accent: ['45 212 191', '20 184 166'] }, // teal
  { id: 'crosshair', labelKey: 'nav.crosshair', Icon: Plus, accent: ['129 140 248', '99 102 241'] }, // indigo
  { id: 'device', labelKey: 'nav.device', Icon: Smartphone, accent: ['232 121 249', '217 70 239'] }, // fuchsia
  { id: 'maps', labelKey: 'nav.maps', Icon: Map, accent: ['74 222 128', '34 197 94'] }, // green
  { id: 'tips', labelKey: 'nav.tips', Icon: Lightbulb, accent: ['250 204 21', '234 179 8'] }, // yellow
];

export default function App() {
  const [lang, setLang] = useLocalStorage<Lang>('pubgm.lang', 'ru');
  const [tab, setTab] = useLocalStorage<ModuleId>('pubgm.tab', 'sensitivity');

  const i18n = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: string) => DICTIONARIES[lang][key] ?? key,
    }),
    [lang, setLang],
  );

  return (
    <I18nContext.Provider value={i18n}>
      <Shell tab={tab} setTab={setTab} />
    </I18nContext.Provider>
  );
}

function Shell({
  tab,
  setTab,
}: {
  tab: ModuleId;
  setTab: (t: ModuleId) => void;
}) {
  const [bannerDismissed, setBannerDismissed] = useLocalStorage<boolean>(
    'pubgm.banner.dismissed',
    false,
  );

  // Other modules can request a tab switch by dispatching window event
  // `pubgm:nav` with detail.tab — used by Device Profile to push the user
  // back to Sensitivity Builder after applying a preset.
  useEffect(() => {
    const valid: ReadonlySet<ModuleId> = new Set(NAV.map((n) => n.id));
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string }>).detail;
      const next = detail?.tab;
      if (typeof next === 'string' && valid.has(next as ModuleId)) {
        setTab(next as ModuleId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('pubgm:nav', handler);
    return () => window.removeEventListener('pubgm:nav', handler);
  }, [setTab]);

  // Set CSS vars for current module's accent
  const navItem = NAV.find((n) => n.id === tab) ?? NAV[0];
  const moduleStyle = {
    ['--module-accent' as string]: navItem.accent[0],
    ['--module-accent-2' as string]: navItem.accent[1],
  } as React.CSSProperties;

  return (
    <div
      className="mx-auto flex min-h-full max-w-[440px] flex-col"
      style={moduleStyle}
    >
      <Hero
        tab={tab}
        navItem={navItem}
        bannerDismissed={bannerDismissed}
        showBanner={() => setBannerDismissed(false)}
      />
      <TopTabStrip tab={tab} setTab={setTab} />
      <main className="min-w-0 flex-1 space-y-3 px-4 pb-32 pt-3">
        {!bannerDismissed && (
          <ExplainerBanner onDismiss={() => setBannerDismissed(true)} />
        )}
        <Suspense fallback={<ModuleSkeleton />}>{renderModule(tab)}</Suspense>
      </main>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

function TopTabStrip({
  tab,
  setTab,
}: {
  tab: ModuleId;
  setTab: (t: ModuleId) => void;
}) {
  const { t } = useI18n();
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab-id="${tab}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [tab]);
  return (
    <div className="sticky top-0 z-20 bg-gradient-to-b from-bg via-bg to-bg/0 pb-2 pt-2">
      <div
        ref={stripRef}
        className="no-scrollbar flex gap-2 overflow-x-auto px-4"
      >
        {NAV.map((n) => {
          const active = tab === n.id;
          const Icon = n.Icon;
          const accentStyle = {
            ['--module-accent' as string]: n.accent[0],
            ['--module-accent-2' as string]: n.accent[1],
          } as React.CSSProperties;
          return (
            <button
              key={n.id}
              data-tab-id={n.id}
              onClick={() => setTab(n.id)}
              style={active ? accentStyle : undefined}
              className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition active:scale-[0.96] ${
                active
                  ? 'hero-grad text-white shadow-[0_6px_18px_-4px_rgb(var(--module-accent)/0.6)]'
                  : 'border border-line bg-panel-soft/70 text-text-soft hover:text-text'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
              <span className="whitespace-nowrap">{t(n.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PRIMARY_TABS: ModuleId[] = [
  'sensitivity',
  'controls',
  'pro',
  'tips',
  'device',
];

function BottomNav({
  tab,
  setTab,
}: {
  tab: ModuleId;
  setTab: (t: ModuleId) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[440px] justify-center px-3 pt-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <nav className="pointer-events-auto flex w-full items-center gap-1 rounded-full border border-line/80 bg-panel/95 p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {PRIMARY_TABS.map((id) => {
          const item = NAV.find((n) => n.id === id);
          if (!item) return null;
          const active = tab === id;
          const Icon = item.Icon;
          const accentStyle = {
            ['--module-accent' as string]: item.accent[0],
            ['--module-accent-2' as string]: item.accent[1],
          } as React.CSSProperties;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-label={t(`nav.short.${id}`)}
              style={active ? accentStyle : undefined}
              className={`flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2 transition active:scale-[0.96] ${
                active
                  ? 'hero-grad text-white shadow-[0_4px_12px_-2px_rgb(var(--module-accent)/0.55)]'
                  : 'text-text-soft hover:text-text'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
              <span className="text-[10px] font-semibold leading-none">
                {t(`nav.short.${id}`)}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function ExplainerBanner({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card-glass relative overflow-hidden rounded-3xl border border-line bg-panel/70 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl module-tint">
          <Info className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14.5px] font-bold text-text">
            {t('app.banner.title')}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-text-soft">
            {t('app.banner.body')}
          </p>
          <button
            onClick={onDismiss}
            className="mt-2.5 text-[12.5px] font-semibold text-module hover:opacity-80"
          >
            {t('app.banner.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Hero({
  bannerDismissed,
  showBanner,
  tab,
  navItem,
}: {
  bannerDismissed: boolean;
  showBanner: () => void;
  tab: ModuleId;
  navItem: NavItem;
}) {
  const { t } = useI18n();
  const Icon = navItem.Icon;
  // Re-trigger animation when module changes
  return (
    <header className="relative px-4 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="hero-grad grid h-10 w-10 place-items-center rounded-2xl shadow-[0_8px_22px_-6px_rgb(var(--module-accent)/0.7)]">
            <Crosshair className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold tracking-tight text-text">
              PUBGM Toolkit
            </div>
            <div className="text-[11px] font-medium text-text-dim">
              v0.2 · S{30}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bannerDismissed && (
            <button
              onClick={showBanner}
              aria-label={t('app.banner.show')}
              className="grid h-9 w-9 place-items-center rounded-full border border-line bg-panel/80 text-text-soft hover:text-text"
            >
              <Info className="h-4 w-4" strokeWidth={2.2} />
            </button>
          )}
          <LangSwitcher />
        </div>
      </div>

      {/* Big hero card */}
      <div
        key={tab}
        className="hero-grad pop-in relative overflow-hidden rounded-3xl p-5 shadow-[0_18px_50px_-12px_rgb(var(--module-accent)/0.55)]"
      >
        {/* Decorative bg blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-black/15 blur-2xl" />
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
              {t('app.hero.eyebrow')}
            </div>
            <h1 className="mt-1.5 font-display text-[26px] font-extrabold leading-[1.1] tracking-tight text-white">
              {t(navItem.labelKey)}
            </h1>
            <p className="mt-2 text-[13px] font-medium leading-snug text-white/85">
              {t(`module.${tab}.tagline`)}
            </p>
          </div>
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Icon className="h-8 w-8 text-white" strokeWidth={2.2} />
          </div>
        </div>
      </div>
    </header>
  );
}

function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line bg-panel/80 p-0.5 text-[11px] font-bold backdrop-blur-sm">
      <button
        onClick={() => setLang('ru')}
        className={`rounded-full px-2.5 py-1 transition ${
          lang === 'ru'
            ? 'hero-grad text-white shadow-sm'
            : 'text-text-soft hover:text-text'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => setLang('en')}
        className={`rounded-full px-2.5 py-1 transition ${
          lang === 'en'
            ? 'hero-grad text-white shadow-sm'
            : 'text-text-soft hover:text-text'
        }`}
      >
        EN
      </button>
    </div>
  );
}

function ModuleSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-xl border border-line bg-panel" />
      <div className="h-64 animate-pulse rounded-xl border border-line bg-panel" />
    </div>
  );
}

function renderModule(id: ModuleId) {
  switch (id) {
    case 'sensitivity':
      return <SensitivityBuilder />;
    case 'controls':
      return <ControlsSetup />;
    case 'pro':
      return <ProTweaks />;
    case 'hud':
      return <HudLayoutGenerator />;
    case 'gyro':
      return <GyroCalibration />;
    case 'recoil':
      return <RecoilPatternLab />;
    case 'drill':
      return <HeadshotDrillTrainer />;
    case 'ttk':
      return <WeaponTtkCalculator />;
    case 'reaction':
      return <ReactionTimeTester />;
    case 'falloff':
      return <DamageFalloffCalculator />;
    case 'loadout':
      return <LoadoutPlanner />;
    case 'crosshair':
      return <CrosshairTrainer />;
    case 'device':
      return <DeviceProfile />;
    case 'maps':
      return <DropSpots />;
    case 'tips':
      return <TipsCoach />;
  }
}
