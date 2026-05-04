import {
  Crosshair,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Wrench,
  Swords,
  Timer,
  Share2,
  RotateCcw,
  Check,
  AlertTriangle,
  Sparkles,
  Layers,
  RotateCw,
  Move,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { Card, Button, Badge } from '../components/UI';
import { SCOPES, type ScopeKey } from '../data/sensitivity';
import type { SetupResult } from './generator';
import { DEVICE_OPTIONS } from './wizardConfig';

export function SetupResultView({
  result,
  onRestart,
  onTools,
}: {
  result: SetupResult;
  onRestart: () => void;
  onTools: () => void;
}) {
  const { t, lang } = useI18n();
  const archetypeKey = `result.archetype.${result.archetype}`;

  const deviceLabel =
    DEVICE_OPTIONS.find((d) => d.id === result.answers.device)?.label ??
    result.answers.device;

  function shareText(): string {
    const a = result.answers;
    const s = result.sensitivity;
    const fmt = (row: Record<ScopeKey, number>) =>
      SCOPES.map((sc) => `${sc.label}: ${row[sc.key]}`).join('\n');
    return [
      `📱 PUBGM Setup`,
      `Device: ${deviceLabel}`,
      `Style: ${a.playstyle} · Fingers: ${a.fingers} · Gyro: ${a.gyroMode}`,
      `Score: ${result.score}/100`,
      ``,
      `▼ Camera (Free Look)`,
      fmt(s.camera),
      ``,
      `▼ ADS Sensitivity`,
      fmt(s.ads),
      ``,
      `▼ Gyroscope`,
      fmt(s.gyro),
    ].join('\n');
  }

  function copyText() {
    void navigator.clipboard.writeText(shareText());
  }

  function shareLink() {
    const data = btoa(
      encodeURIComponent(JSON.stringify(result.answers)),
    );
    const url = `${window.location.origin}${window.location.pathname}?setup=${data}`;
    if (navigator.share) {
      void navigator.share({ title: 'My PUBGM Setup', url });
    } else {
      void navigator.clipboard.writeText(url);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pubgm-setup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 px-4 pb-32 pt-4">
      {/* Hero */}
      <div className="hero-grad pop-in relative overflow-hidden rounded-3xl p-5 shadow-[0_18px_48px_-12px_rgb(var(--module-accent)/0.55)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-black/20 blur-2xl" />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
            PUBG MOBILE SETUP
          </div>
          <h1 className="mt-1.5 font-display text-[26px] font-extrabold leading-[1.1] tracking-tight text-white">
            {t('result.title')}
          </h1>
          <p className="mt-2 text-[13px] font-medium leading-snug text-white/85">
            {t('result.subtitle')}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            <span className="text-[12px] font-bold text-white">
              {t(archetypeKey)}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Summary */}
      <Card title={t('result.summary.title')}>
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryRow label={t('result.summary.archetype')} value={t(archetypeKey)} />
          <SummaryRow label={t('result.summary.device')} value={deviceLabel} />
          <SummaryRow
            label={t('result.summary.style')}
            value={t(`wizard.style.${styleSlug(result.answers.playstyle)}.label`)}
          />
          <SummaryRow
            label={t('result.summary.fingers')}
            value={`${result.answers.fingers}`}
          />
          <SummaryRow
            label={t('result.summary.gyro')}
            value={
              result.answers.gyroMode === 'always_on'
                ? 'Always On'
                : result.answers.gyroMode === 'scope_on'
                  ? 'Scope On'
                  : 'Off'
            }
          />
          <SummaryRow
            label="Refresh"
            value={`${result.answers.refresh} Hz`}
          />
        </div>
      </Card>

      {/* 2. Score */}
      <Card title={t('result.score.title')} subtitle={t('result.score.desc')}>
        <div className="mb-4 flex items-end gap-3">
          <div className="font-display text-[44px] font-black leading-none text-module">
            {result.score}
          </div>
          <div className="pb-2 text-[13px] font-semibold text-text-soft">/ 100</div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full module-tint px-3 py-1.5">
            <span className="text-[11.5px] font-bold uppercase tracking-wider">
              {scoreTier(result.score, lang)}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {result.scoreBreakdown.map((b) => {
            const pct = (b.value / b.max) * 100;
            return (
              <div key={b.label} className="space-y-1">
                <div className="flex items-center justify-between text-[12px] text-text-soft">
                  <span>{t(b.label)}</span>
                  <span className="font-mono font-bold text-text">
                    {b.value}/{b.max}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-panel-soft">
                  <div
                    className="hero-grad h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Graphics */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.graphics.title')}</span>
          </span>
        }
        subtitle={t('result.graphics.desc')}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <SettingTile label={t('result.graphics.quality')} value={result.graphics.quality} />
          <SettingTile label={t('result.graphics.frameRate')} value={result.graphics.frameRate} />
          <SettingTile label={t('result.graphics.style')} value={result.graphics.style} />
          <SettingTile label={t('result.graphics.brightness')} value={`${result.graphics.brightness}%`} />
          <SettingTile label={t('result.graphics.shadows')} value={result.graphics.shadows} />
          <SettingTile label={t('result.graphics.aa')} value={result.graphics.antiAliasing} />
          <SettingTile label={t('result.graphics.colorblind')} value={result.graphics.colorblind} colSpan />
        </div>
      </Card>

      {/* 4-6. Sensitivity */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.sens.camera.title')}</span>
          </span>
        }
        subtitle={t('result.sens.camera.desc')}
      >
        <SensTable values={result.sensitivity.camera} />
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2">
            <Move className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.sens.ads.title')}</span>
          </span>
        }
        subtitle={t('result.sens.ads.desc')}
      >
        <SensTable values={result.sensitivity.ads} />
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2">
            <RotateCw className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.sens.gyro.title')}</span>
          </span>
        }
        subtitle={t('result.sens.gyro.desc')}
      >
        <SensTable values={result.sensitivity.gyro} />
      </Card>

      {/* 7. HUD */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.hud.title')}</span>
          </span>
        }
        subtitle={t('result.hud.desc')}
      >
        <div className="rounded-2xl border border-line bg-panel-soft/60 p-4">
          <div className="font-display text-[15px] font-bold text-text">
            {t(`result.hud.layout.${result.hudLayout}`)}
          </div>
          <p className="mt-1.5 text-[12.5px] text-text-soft">
            {hudDescription(result.hudLayout, lang)}
          </p>
        </div>
        <button
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-module hover:opacity-80"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('pubgm:nav', { detail: { tab: 'hud' } }),
            )
          }
        >
          {t('result.hud.openModule')}
        </button>
      </Card>

      {/* 8. Controls checklist */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.controls.title')}</span>
          </span>
        }
        subtitle={t('result.controls.desc')}
      >
        <div className="space-y-2">
          {result.controls.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-line bg-panel-soft/60 p-3.5"
            >
              <div className="hero-grad mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-white">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11.5px] font-semibold uppercase tracking-wider text-text-dim">
                  {t(c.pathKey)}
                </div>
                <div className="mt-0.5 font-display text-[14px] font-bold text-text">
                  {c.setting} ={' '}
                  <span className="text-module">{t(c.recommendedKey)}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-text-soft">
                  {t(c.rationaleKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 9. Problem fixes */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.fixes.title')}</span>
          </span>
        }
        subtitle={t('result.fixes.desc')}
      >
        {result.fixes.length === 0 ? (
          <div className="rounded-2xl border border-line bg-panel-soft/60 p-3.5 text-[13px] text-text-soft">
            <Check className="mr-1.5 inline h-4 w-4 text-good" strokeWidth={2.5} />
            {t('result.fixes.empty')}
          </div>
        ) : (
          <div className="space-y-2">
            {result.fixes.map((f) => (
              <div
                key={f.problem}
                className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/[0.05] p-3.5"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warn"
                  strokeWidth={2.4}
                />
                <div>
                  <div className="font-display text-[13.5px] font-bold text-text">
                    {t(`wizard.problems.${f.problem}`)}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-text-soft">
                    {t(f.fixesKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 10. Weapons */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.weapons.title')}</span>
          </span>
        }
        subtitle={t('result.weapons.desc')}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <WeaponSlot label={t('result.weapons.primary')} weapon={result.weapons.primary} />
          <WeaponSlot label={t('result.weapons.secondary')} weapon={result.weapons.secondary} />
        </div>
        <p className="mt-3 text-[12px] leading-snug text-text-soft">
          {result.weapons.rationale}
        </p>
      </Card>

      {/* 11. Drill */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.drill.title')}</span>
          </span>
        }
        subtitle={t('result.drill.desc')}
      >
        <div className="space-y-2">
          {result.drill.map((d) => (
            <div
              key={d.step}
              className="flex items-start gap-3 rounded-2xl border border-line bg-panel-soft/60 p-3.5"
            >
              <div className="hero-grad grid h-9 w-9 shrink-0 place-items-center rounded-2xl font-display text-[12px] font-black text-white">
                {d.step}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-display text-[13.5px] font-bold text-text">
                    {t(d.titleKey)}
                  </div>
                  <Badge tone="accent">
                    {d.durationMin} {t('result.drill.duration')}
                  </Badge>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-text-soft">
                  {t(d.bodyKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Apply how-to */}
      <Card title={t('result.applyTitle')}>
        <ol className="space-y-2 text-[13px] leading-relaxed text-text-soft">
          <li>{t('result.apply.step1')}</li>
          <li>{t('result.apply.step2')}</li>
          <li>{t('result.apply.step3')}</li>
          <li>{t('result.apply.step4')}</li>
          <li>{t('result.apply.step5')}</li>
        </ol>
      </Card>

      {/* 12. Export */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-module" strokeWidth={2.4} />
            <span>{t('result.export.title')}</span>
          </span>
        }
        subtitle={t('result.export.desc')}
      >
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={shareLink}>
            <Share2 className="h-4 w-4" strokeWidth={2.5} />
            {t('result.export.share')}
          </Button>
          <Button onClick={copyText}>{t('result.export.copy')}</Button>
          <Button onClick={exportJson}>{t('result.export.json')}</Button>
          <Button onClick={() => window.print()}>{t('result.export.print')}</Button>
        </div>
      </Card>

      {/* Footer actions */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="default" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
          {t('result.restart')}
        </Button>
        <Button variant="default" onClick={onTools}>
          {t('result.tools')}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-soft/60 p-3">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-dim">
        {label}
      </div>
      <div className="mt-0.5 truncate font-display text-[13.5px] font-bold text-text">
        {value}
      </div>
    </div>
  );
}

function SettingTile({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string;
  colSpan?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-panel-soft/60 p-3 ${
        colSpan ? 'col-span-2' : ''
      }`}
    >
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-dim">
        {label}
      </div>
      <div className="mt-0.5 font-display text-[14px] font-bold text-module">
        {value}
      </div>
    </div>
  );
}

function SensTable({ values }: { values: Record<ScopeKey, number> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      {SCOPES.map((s, i) => (
        <div
          key={s.key}
          className={`flex items-center justify-between px-4 py-3 text-[13px] ${
            i % 2 === 0 ? 'bg-panel-soft/50' : 'bg-panel/50'
          }`}
        >
          <span className="text-text-soft">{s.label}</span>
          <span
            className={`font-mono font-bold ${
              values[s.key] > 0 ? 'text-module' : 'text-text-dim'
            }`}
          >
            {values[s.key]}
          </span>
        </div>
      ))}
    </div>
  );
}

function WeaponSlot({ label, weapon }: { label: string; weapon: string }) {
  return (
    <div className="card-glass rounded-2xl border border-line bg-panel-soft/60 p-4">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-dim">
        {label}
      </div>
      <div className="mt-1 font-display text-[20px] font-extrabold tracking-tight text-text">
        {weapon.toUpperCase()}
      </div>
    </div>
  );
}

function styleSlug(s: string): string {
  // Map generator playstyle → wizard config slug
  if (s === 'tdm_aggressive') return 'tdm';
  return s;
}

function hudDescription(layoutId: string, lang: 'ru' | 'en'): string {
  const map: Record<string, { ru: string; en: string }> = {
    two_finger_thumb: {
      ru: 'Две большие пальца. Огонь, прицел и движение через основной палец. Самая простая раскладка.',
      en: 'Two thumbs. Fire, scope, and movement on the main thumb. The simplest layout.',
    },
    three_finger: {
      ru: '2 больших + указательный сверху для огня. Освобождает большие пальцы для движения и ADS.',
      en: '2 thumbs + index up top for fire. Frees thumbs for movement and ADS.',
    },
    four_finger_claw: {
      ru: '2 больших снизу + 2 указательных сверху. Огонь и прицел разнесены — стандарт для 4000+ ELO.',
      en: '2 thumbs below + 2 indexes up top. Fire and scope split — standard for 4000+ ELO.',
    },
    six_finger_pro: {
      ru: 'Все 4 пальца снизу + 2 указательных сверху. Киберспорт. Каждое действие на своём пальце.',
      en: 'All 4 fingers below + 2 indexes up top. Esports. Every action on its own finger.',
    },
  };
  return map[layoutId]?.[lang] ?? '';
}

function scoreTier(score: number, lang: 'ru' | 'en'): string {
  if (score >= 85) return lang === 'ru' ? 'PRO' : 'PRO';
  if (score >= 70) return lang === 'ru' ? 'СИЛЬНО' : 'STRONG';
  if (score >= 55) return lang === 'ru' ? 'ОК' : 'OK';
  return lang === 'ru' ? 'НУЖНА ПРОКАЧКА' : 'NEEDS WORK';
}
