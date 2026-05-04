import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { I18nContext, DICTIONARIES, type Lang, useI18n } from './i18n';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Pill } from './components/UI';

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
  const [navOpen, setNavOpen] = useState(false);
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
        setNavOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('pubgm:nav', handler);
    return () => window.removeEventListener('pubgm:nav', handler);
  }, [setTab]);

  return (
    <div className="min-h-full">
      <Header
        onMenu={() => setNavOpen((o) => !o)}
        bannerDismissed={bannerDismissed}
        showBanner={() => setBannerDismissed(false)}
      />
      <div className="mx-auto max-w-[1400px] px-3 pt-3 md:px-6">
        {!bannerDismissed && (
          <ExplainerBanner onDismiss={() => setBannerDismissed(true)} />
        )}
      </div>
      <div className="mx-auto flex max-w-[1400px] gap-0 px-3 pb-12 pt-3 md:gap-6 md:px-6">
        <Nav tab={tab} setTab={setTab} open={navOpen} setOpen={setNavOpen} />
        <main className="min-w-0 flex-1">
          <Suspense fallback={<ModuleSkeleton />}>{renderModule(tab)}</Suspense>
        </main>
      </div>
    </div>
  );
}

function ExplainerBanner({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mb-3 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-accent-2/10 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-text">{t('app.banner.title')}</div>
          <p className="mt-1 text-sm leading-relaxed text-text-soft">
            {t('app.banner.body')}
          </p>
          <button
            onClick={onDismiss}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-soft px-3 py-1.5 text-xs font-medium text-text-soft hover:text-text"
          >
            {t('app.banner.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({
  onMenu,
  bannerDismissed,
  showBanner,
}: {
  onMenu: () => void;
  bannerDismissed: boolean;
  showBanner: () => void;
}) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-3 md:px-6">
        <button
          onClick={onMenu}
          className="rounded-lg border border-line bg-panel-soft p-2 md:hidden"
          aria-label="menu"
        >
          <span className="block h-0.5 w-5 bg-text" />
          <span className="mt-1 block h-0.5 w-5 bg-text" />
          <span className="mt-1 block h-0.5 w-5 bg-text" />
        </button>
        <div className="flex items-center gap-2">
          <Logo />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">
              PUBGM Toolkit
            </div>
            <div className="text-[11px] text-text-dim">
              Performance · v0.1 · Patch 3.x ref.
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {bannerDismissed && (
            <button
              onClick={showBanner}
              className="hidden rounded-full border border-line bg-panel-soft px-3 py-1 text-xs text-text-soft hover:text-text sm:inline-flex"
            >
              {t('app.banner.show')}
            </button>
          )}
          <LangSwitcher />
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-bg">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line bg-panel-soft p-0.5 text-xs">
      <button
        onClick={() => setLang('ru')}
        className={`px-3 py-1 ${
          lang === 'ru' ? 'bg-accent text-bg' : 'text-text-soft'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1 ${
          lang === 'en' ? 'bg-accent text-bg' : 'text-text-soft'
        }`}
      >
        EN
      </button>
    </div>
  );
}

function Nav({
  tab,
  setTab,
  open,
  setOpen,
}: {
  tab: ModuleId;
  setTab: (t: ModuleId) => void;
  open: boolean;
  setOpen: (b: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <aside
      className={`${
        open ? 'block' : 'hidden'
      } md:block w-full md:w-60 shrink-0`}
    >
      <nav className="md:sticky md:top-[68px] flex flex-wrap gap-1.5 rounded-2xl border border-line bg-panel p-2 md:flex-col md:gap-1">
        {NAV.map((n) => (
          <Pill
            key={n.id}
            active={tab === n.id}
            onClick={() => {
              setTab(n.id);
              setOpen(false);
            }}
            className="md:justify-start md:w-full md:rounded-xl md:px-3 md:py-2 md:text-sm"
          >
            <span className="text-base leading-none">{n.icon}</span>
            <span>{t(n.labelKey)}</span>
          </Pill>
        ))}
      </nav>
    </aside>
  );
}

function ModuleSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-2xl border border-line bg-panel" />
      <div className="h-64 animate-pulse rounded-2xl border border-line bg-panel" />
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
