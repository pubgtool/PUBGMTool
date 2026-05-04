import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button, Card, NumberInput, Pill, Slider, Stat } from '../components/UI';
import {
  CHANNELS,
  SCOPES,
  SENSITIVITY_PRESETS,
  clonePreset,
  emptySensitivity,
  type Channel,
  type ScopeKey,
  type Sensitivity,
} from '../data/sensitivity';
import { copyToClipboard, makeShareUrl, parseShareHash } from '../utils/share';

const SHARE_PREFIX = 'sens';

export default function SensitivityBuilder() {
  const { t } = useI18n();
  const [values, setValues] = useLocalStorage<Sensitivity>(
    'pubgm.sensitivity',
    clonePreset(SENSITIVITY_PRESETS[0]),
  );
  const [activePreset, setActivePreset] = useLocalStorage<string>(
    'pubgm.sensitivity.preset',
    SENSITIVITY_PRESETS[0].id,
  );
  const [shareNote, setShareNote] = useState<string>('');

  // Load preset from share URL on mount.
  useEffect(() => {
    const fromHash = parseShareHash<Sensitivity>(SHARE_PREFIX);
    if (fromHash) {
      setValues(fromHash);
      setActivePreset('custom');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOne = (channel: Channel, scope: ScopeKey, v: number) => {
    setValues((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [scope]: v },
    }));
    setActivePreset('custom');
  };

  const onApplyPreset = (id: string) => {
    const p = SENSITIVITY_PRESETS.find((p) => p.id === id);
    if (!p) return;
    setValues(clonePreset(p));
    setActivePreset(id);
  };

  const reset = () => {
    setValues(emptySensitivity());
    setActivePreset('custom');
  };

  const onShare = async () => {
    const url = makeShareUrl(SHARE_PREFIX, values);
    const ok = await copyToClipboard(url);
    setShareNote(ok ? t('common.copied') : url);
    setTimeout(() => setShareNote(''), 1500);
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(values, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pubgm-sensitivity-${activePreset}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (file: File) => {
    file.text().then((txt) => {
      try {
        const parsed = JSON.parse(txt) as Sensitivity;
        setValues(parsed);
        setActivePreset('custom');
      } catch {
        // ignore
      }
    });
  };

  const summary = useMemo(() => {
    const sum = (rec: Record<string, number>) =>
      Object.values(rec).reduce((a, b) => a + b, 0);
    const camAvg = Math.round(sum(values.camera) / SCOPES.length);
    const adsAvg = Math.round(sum(values.ads) / SCOPES.length);
    const gyroAvg = Math.round(sum(values.gyro) / SCOPES.length);
    return { camAvg, adsAvg, gyroAvg };
  }, [values]);

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('sensitivity.title')} subtitle={t('sensitivity.lead')}>
        <div className="flex flex-wrap items-center gap-2">
          {SENSITIVITY_PRESETS.map((p) => (
            <Pill
              key={p.id}
              active={activePreset === p.id}
              onClick={() => onApplyPreset(p.id)}
            >
              {p.name}
            </Pill>
          ))}
          <Pill active={activePreset === 'custom'} onClick={() => setActivePreset('custom')}>
            Custom
          </Pill>
        </div>
        {activePreset !== 'custom' && (
          <p className="mt-3 text-sm text-text-soft">
            {(() => {
              const p = SENSITIVITY_PRESETS.find((p) => p.id === activePreset);
              return p ? t(p.descriptionKey) : '';
            })()}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Camera avg" value={summary.camAvg} />
        <Stat label="ADS avg" value={summary.adsAvg} />
        <Stat label="Gyro avg" value={summary.gyroAvg} />
      </div>

      {CHANNELS.map((ch) => (
        <Card
          key={ch.key}
          title={t(`sensitivity.channel.${ch.key}`)}
          subtitle={t(ch.descriptionKey)}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCOPES.map((s) => (
              <div
                key={s.key}
                className="rounded-xl border border-line bg-panel-soft p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm text-text-soft">{s.label}</div>
                  <NumberInput
                    value={values[ch.key][s.key]}
                    onChange={(e) =>
                      setOne(ch.key, s.key, Math.max(0, Math.min(300, Number(e.target.value) || 0)))
                    }
                    className="w-20 text-right"
                    min={0}
                    max={300}
                  />
                </div>
                <Slider
                  value={values[ch.key][s.key]}
                  onChange={(v) => setOne(ch.key, s.key, v)}
                  max={300}
                />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card title={t('sensitivity.applyTitle')}>
        <ol className="space-y-2 text-sm leading-relaxed text-text-soft">
          <li className="rounded-xl border border-line bg-panel-soft px-3 py-2">
            {t('sensitivity.apply.step1')}
          </li>
          <li className="rounded-xl border border-line bg-panel-soft px-3 py-2">
            {t('sensitivity.apply.step2')}
          </li>
          <li className="rounded-xl border border-line bg-panel-soft px-3 py-2">
            {t('sensitivity.apply.step3')}
          </li>
          <li className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-text">
            {t('sensitivity.apply.step4')}
          </li>
          <li className="rounded-xl border border-line bg-panel-soft px-3 py-2">
            {t('sensitivity.apply.step5')}
          </li>
        </ol>
        <p className="mt-3 rounded-xl border border-warn/30 bg-warn/5 px-3 py-2 text-xs leading-relaxed text-warn">
          {t('sensitivity.apply.note')}
        </p>
      </Card>

      <Card title={t('common.export') + ' / ' + t('common.share')}>
        <p className="mb-3 text-sm text-text-soft">{t('sensitivity.exportHint')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={onShare}>
            {t('common.share')}
          </Button>
          <Button onClick={onExport}>{t('common.export')} JSON</Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel-soft px-3 py-2 text-sm font-medium text-text hover:bg-line">
            {t('common.import')}
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
              }}
            />
          </label>
          <Button variant="ghost" onClick={reset}>
            {t('common.reset')}
          </Button>
          {shareNote && <span className="text-sm text-good">{shareNote}</span>}
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-text-soft">JSON preview</summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-bg-soft p-3 font-mono text-xs leading-relaxed text-text-soft scrollbar-thin">
            {JSON.stringify(values, null, 2)}
          </pre>
        </details>
      </Card>
    </div>
  );
}
