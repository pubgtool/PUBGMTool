import {
  Crosshair,
  Sparkles,
  Shield,
  Timer,
  ArrowRight,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { useI18n } from '../i18n';

export function Landing({
  hasSetup,
  onStart,
  onContinue,
  onRestart,
  onTools,
}: {
  hasSetup: boolean;
  onStart: () => void;
  onContinue: () => void;
  onRestart: () => void;
  onTools: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="px-5 pb-32 pt-8">
      {/* Hero */}
      <div className="relative">
        <div className="hero-grad pop-in relative overflow-hidden rounded-[28px] p-7 shadow-[0_24px_64px_-16px_rgb(var(--module-accent)/0.7)]">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-black/20 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm">
              <Crosshair className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                {t('landing.eyebrow')}
              </span>
            </div>
            <h1 className="mt-4 font-display text-[30px] font-extrabold leading-[1.05] tracking-tight text-white">
              {t('landing.title')}
            </h1>
            <p className="mt-3 text-[14px] font-medium leading-snug text-white/85">
              {t('landing.subtitle')}
            </p>

            <div className="mt-6 space-y-2">
              {hasSetup ? (
                <>
                  <button
                    onClick={onContinue}
                    className="group flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-[15px] font-bold text-black shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] transition active:scale-[0.98]"
                  >
                    <span>{t('landing.cta.continue')}</span>
                    <ArrowRight
                      className="h-5 w-5 transition group-hover:translate-x-0.5"
                      strokeWidth={2.5}
                    />
                  </button>
                  <button
                    onClick={onRestart}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-[13.5px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-[0.98]"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
                    <span>{t('landing.cta.restart')}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onStart}
                  className="group flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-[15px] font-bold text-black shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] transition active:scale-[0.98]"
                >
                  <span>{t('landing.cta')}</span>
                  <ArrowRight
                    className="h-5 w-5 transition group-hover:translate-x-0.5"
                    strokeWidth={2.5}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-6 grid grid-cols-1 gap-3">
        <FeatureRow
          icon={<Sparkles className="h-5 w-5" strokeWidth={2.4} />}
          title={t('landing.feature.1.title')}
          body={t('landing.feature.1.body')}
        />
        <FeatureRow
          icon={<Shield className="h-5 w-5" strokeWidth={2.4} />}
          title={t('landing.feature.2.title')}
          body={t('landing.feature.2.body')}
        />
        <FeatureRow
          icon={<Timer className="h-5 w-5" strokeWidth={2.4} />}
          title={t('landing.feature.3.title')}
          body={t('landing.feature.3.body')}
        />
      </div>

      {/* Tools */}
      <button
        onClick={onTools}
        className="mt-6 flex w-full items-center justify-between rounded-3xl border border-line bg-panel/70 p-4 text-left backdrop-blur-sm transition hover:bg-panel"
      >
        <div className="min-w-0">
          <div className="font-display text-[15px] font-bold text-text">
            {t('landing.tools')}
          </div>
          <p className="mt-1 text-[12.5px] text-text-soft">
            {t('landing.tools.desc')}
          </p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-text-soft"
          strokeWidth={2.5}
        />
      </button>

      <p className="mt-5 text-center text-[11.5px] leading-relaxed text-text-dim">
        {t('landing.disclaimer')}
      </p>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card-glass flex gap-3 rounded-3xl border border-line bg-panel/70 p-4 backdrop-blur-sm">
      <div className="hero-grad grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-[0_6px_18px_-4px_rgb(var(--module-accent)/0.5)]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-[14.5px] font-bold text-text">
          {title}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-text-soft">
          {body}
        </p>
      </div>
    </div>
  );
}
