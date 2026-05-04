import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
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
  icon: string;
}

const NAV: NavItem[] = [
  { id: 'sensitivity', labelKey: 'nav.sensitivity', icon: '◎' },
  { id: 'controls', labelKey: 'nav.controls', icon: '⚙' },
  { id: 'pro', labelKey: 'nav.pro', icon: '★' },
  { id: 'hud', labelKey: 'nav.hud', icon: '⊞' },
  { id: 'gyro', labelKey: 'nav.gyro', icon: '⟲' },
  { id: 'recoil', labelKey: 'nav.recoil', icon: '↑' },
  { id: 'drill', labelKey: 'nav.drill', icon: '◉' },
  { id: 'ttk', labelKey: 'nav.ttk', icon: '✕' },
  { id: 'reaction', labelKey: 'nav.reaction', icon: '⚡' },
  { id: 'falloff', labelKey: 'nav.falloff', icon: '↘' },
  { id: 'loadout', labelKey: 'nav.loadout', icon: '🎒' },
  { id: 'crosshair', labelKey: 'nav.crosshair', icon: '+' },
  { id: 'device', labelKey: 'nav.device', icon: '📱' },
  { id: 'maps', labelKey: 'nav.maps', icon: '🗺' },
  { id: 'tips', labelKey: 'nav.tips', icon: '★' },
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

  return (
    <div className="mx-auto flex min-h-full max-w-[480px] flex-col">
      <Header
        bannerDismissed={bannerDismissed}
        showBanner={() => setBannerDismissed(false)}
      />
      <TopTabStrip tab={tab} setTab={setTab} />
      <main className="min-w-0 flex-1 px-3 pb-32 pt-3">
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
  // Auto-scroll active tab into view
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab-id="${tab}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [tab]);
  return (
    <div className="sticky top-[64px] z-10 -mx-px border-b border-line/60 bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/55">
      <div
        ref={stripRef}
        className="scrollbar-thin flex gap-1.5 overflow-x-auto px-3 py-2"
        style={{ scrollbarGutter: 'stable' }}
      >
        {NAV.map((n) => {
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              data-tab-id={n.id}
              onClick={() => setTab(n.id)}
              className={`group relative inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] transition ${
                active
                  ? 'pill-pulse border-accent bg-gradient-to-b from-accent to-[#d8881a] text-bg'
                  : 'border-line bg-panel-soft/70 text-text-soft hover:border-accent/50 hover:text-accent'
              }`}
            >
              <span className="text-base leading-none">{n.icon}</span>
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
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line/80 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      <div className="grid grid-cols-5">
        {PRIMARY_TABS.map((id) => {
          const item = NAV.find((n) => n.id === id);
          if (!item) return null;
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`group relative flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 transition ${
                active ? 'text-accent' : 'text-text-dim hover:text-text-soft'
              }`}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-[2px] rounded-b-md bg-accent shadow-[0_0_10px_rgba(245,165,36,0.8)]" />
              )}
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-center font-display text-[8.5px] font-bold uppercase leading-[1.1] tracking-[0.06em]">
                {t(`nav.short.${id}`)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ExplainerBanner({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className="hud-corners relative mb-3 overflow-hidden rounded-xl border border-accent/45 bg-gradient-to-br from-accent/10 via-bg/60 to-accent-2/10 p-4 backdrop-blur-sm md:p-5">
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent via-accent-2 to-accent" />
      <div className="flex items-start gap-3 pl-2">
        <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-md border border-accent/50 bg-accent/15 text-accent shadow-[0_0_14px_-2px_rgba(245,165,36,0.55)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13px] font-bold uppercase tracking-[0.1em] text-accent">
            ▸ {t('app.banner.title')}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-text-soft">
            {t('app.banner.body')}
          </p>
          <button
            onClick={onDismiss}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-soft px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-text-soft hover:border-accent/60 hover:text-accent"
          >
            {t('app.banner.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({
  bannerDismissed,
  showBanner,
}: {
  bannerDismissed: boolean;
  showBanner: () => void;
}) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/65">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent blur-sm" />
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Logo />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-display text-[14px] font-extrabold uppercase tracking-[0.12em] text-text">
            PUBGM <span className="text-accent">Toolkit</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
            <span className="pulse-ring inline-block h-1.5 w-1.5 rounded-full bg-good" />
            <span className="text-good">ONLINE</span>
            <span className="text-text-dim">·</span>
            <span>v0.2 · 3.x</span>
          </div>
        </div>
        {bannerDismissed && (
          <button
            onClick={showBanner}
            aria-label={t('app.banner.show')}
            className="grid h-9 w-9 place-items-center rounded-md border border-line bg-panel-soft text-text-soft hover:border-accent/60 hover:text-accent"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <LangSwitcher />
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-md border border-accent/60 bg-gradient-to-br from-bg to-panel-soft shadow-[0_0_18px_-2px_rgba(245,165,36,0.55),inset_0_0_0_1px_rgba(245,165,36,0.25)]">
      {/* Spinning crosshair */}
      <svg
        viewBox="0 0 32 32"
        className="crosshair-rot absolute inset-0 h-full w-full text-accent/35"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <circle cx="16" cy="16" r="11" strokeDasharray="2 4" />
      </svg>
      {/* Static reticle */}
      <svg
        viewBox="0 0 32 32"
        className="relative h-6 w-6 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="16" cy="16" r="6" />
        <path d="M16 2v6M16 24v6M2 16h6M24 16h6" strokeLinecap="round" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-line bg-panel-soft p-0.5 font-display text-[11px] font-bold uppercase tracking-[0.1em]">
      <button
        onClick={() => setLang('ru')}
        className={`px-3 py-1.5 transition ${
          lang === 'ru'
            ? 'bg-gradient-to-b from-accent to-[#d8881a] text-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
            : 'text-text-soft hover:text-accent'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 transition ${
          lang === 'en'
            ? 'bg-gradient-to-b from-accent to-[#d8881a] text-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
            : 'text-text-soft hover:text-accent'
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
