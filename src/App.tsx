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
  { id: 'tips', labelKey: 'nav.tips', icon: '💡' },
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
    <div className="mx-auto flex min-h-full max-w-[440px] flex-col bg-bg">
      <Header
        bannerDismissed={bannerDismissed}
        showBanner={() => setBannerDismissed(false)}
        tab={tab}
      />
      <TopTabStrip tab={tab} setTab={setTab} />
      <main className="min-w-0 flex-1 space-y-3 px-4 pb-28 pt-4">
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
    <div className="sticky top-[60px] z-10 bg-bg">
      <div
        ref={stripRef}
        className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5"
      >
        {NAV.map((n) => {
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              data-tab-id={n.id}
              onClick={() => setTab(n.id)}
              className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                active
                  ? 'bg-accent text-bg'
                  : 'bg-panel-soft text-text-soft hover:text-text'
              }`}
            >
              <span className="text-[13px] leading-none">{n.icon}</span>
              <span className="whitespace-nowrap">{t(n.labelKey)}</span>
            </button>
          );
        })}
      </div>
      <div className="h-px bg-line/60" />
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
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[440px] border-t border-line bg-bg/98 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5">
        {PRIMARY_TABS.map((id) => {
          const item = NAV.find((n) => n.id === id);
          if (!item) return null;
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`group flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 py-2 transition ${
                active ? 'text-accent' : 'text-text-dim hover:text-text-soft'
              }`}
            >
              <span className="text-[19px] leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-none">
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
    <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-text">
            {t('app.banner.title')}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-text-soft">
            {t('app.banner.body')}
          </p>
          <button
            onClick={onDismiss}
            className="mt-2.5 text-[12.5px] font-medium text-accent hover:text-accent-2"
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
  tab,
}: {
  bannerDismissed: boolean;
  showBanner: () => void;
  tab: ModuleId;
}) {
  const { t } = useI18n();
  const navItem = NAV.find((n) => n.id === tab);
  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <Logo />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[11px] font-medium text-text-dim">
            PUBGM Toolkit
          </div>
          <div className="truncate text-[17px] font-semibold tracking-tight text-text">
            {navItem ? t(navItem.labelKey) : 'PUBGM Toolkit'}
          </div>
        </div>
        {bannerDismissed && (
          <button
            onClick={showBanner}
            aria-label={t('app.banner.show')}
            className="grid h-9 w-9 place-items-center rounded-full bg-panel-soft text-text-soft hover:text-text"
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
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent">
      <svg
        viewBox="0 0 32 32"
        className="h-5 w-5 text-bg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <circle cx="16" cy="16" r="6" />
        <path d="M16 4v5M16 23v5M4 16h5M23 16h5" strokeLinecap="round" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-full bg-panel-soft p-0.5 text-[11px] font-semibold">
      <button
        onClick={() => setLang('ru')}
        className={`rounded-full px-2.5 py-1 transition ${
          lang === 'ru' ? 'bg-accent text-bg' : 'text-text-soft hover:text-text'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => setLang('en')}
        className={`rounded-full px-2.5 py-1 transition ${
          lang === 'en' ? 'bg-accent text-bg' : 'text-text-soft hover:text-text'
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
