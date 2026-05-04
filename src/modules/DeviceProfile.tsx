import { useState } from 'react';
import { useI18n } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Badge, Button, Card, Pill, Select, Stat } from '../components/UI';
import {
  DEVICE_MODELS,
  recommendForDevice,
  type RefreshRate,
} from '../data/devices';
import {
  SCOPES,
  SENSITIVITY_PRESETS,
  clonePreset,
} from '../data/sensitivity';

const SENS_VALUES_KEY = 'pubgm.sensitivity';
const SENS_PRESET_KEY = 'pubgm.sensitivity.preset';

export default function DeviceProfile() {
  const { t } = useI18n();
  const [modelId, setModelId] = useLocalStorage<string>(
    'pubgm.device.model',
    'iphone-15-pro',
  );
  const [refresh, setRefresh] = useState<RefreshRate>(120);
  const [appliedNote, setAppliedNote] = useState<string>('');

  const model =
    DEVICE_MODELS.find((d) => d.id === modelId) ?? DEVICE_MODELS[0];
  const profile = recommendForDevice(model, refresh);
  const preset = SENSITIVITY_PRESETS.find(
    (p) => p.id === profile.recommendedPresetId,
  );

  const onApplyPreset = () => {
    if (!preset) return;
    try {
      window.localStorage.setItem(
        SENS_VALUES_KEY,
        JSON.stringify(clonePreset(preset)),
      );
      window.localStorage.setItem(SENS_PRESET_KEY, JSON.stringify(preset.id));
      window.dispatchEvent(
        new CustomEvent('pubgm:nav', { detail: { tab: 'sensitivity' } }),
      );
      setAppliedNote(t('device.applied'));
      setTimeout(() => setAppliedNote(''), 1800);
    } catch {
      // ignore quota / privacy mode failures
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('device.title')} subtitle={t('device.lead')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-text-soft">{t('device.model')}</div>
            <Select value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {(['flagship', 'high', 'mid', 'low'] as const).map((tier) => (
                <optgroup key={tier} label={tier.toUpperCase()}>
                  {DEVICE_MODELS.filter((d) => d.tier === tier).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs text-text-soft">{t('device.refreshRate')}</div>
            <div className="flex gap-1.5">
              {([60, 90, 120, 144] as RefreshRate[]).map((r) => (
                <Pill
                  key={r}
                  active={refresh === r}
                  onClick={() => setRefresh(r)}
                  disabled={r > model.maxRefreshRate}
                  className={r > model.maxRefreshRate ? 'opacity-30' : ''}
                >
                  {r}Hz
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t('device.tier')} value={profile.tier.toUpperCase()} tone="accent" />
          <Stat label={t('device.refreshRate')} value={`${profile.refreshRate}Hz`} />
          <Stat label={t('device.graphics')} value={profile.graphicsPreset} />
          <Stat label={t('device.fps')} value={profile.graphicsFps} />
        </div>
        <div className="mt-3 rounded-xl border border-line bg-panel-soft p-3">
          <div className="mb-1 text-xs uppercase tracking-wider text-text-dim">
            {t('device.styleAdvice')}
          </div>
          <p className="text-sm text-text">{profile.styleAdvice}</p>
        </div>
      </Card>

      {preset && (
        <Card title={`${t('common.preset')}: ${preset.name}`}>
          <p className="text-sm text-text-soft">{t(preset.descriptionKey)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {preset.tags.map((tg) => (
              <Badge key={tg} tone="default">
                {tg}
              </Badge>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-panel-soft text-text-dim">
                <tr>
                  <th className="px-2 py-2 font-medium uppercase tracking-wider">
                    {t('common.scope')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium uppercase tracking-wider">
                    {t('sensitivity.channel.camera')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium uppercase tracking-wider">
                    {t('sensitivity.channel.ads')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium uppercase tracking-wider">
                    {t('sensitivity.channel.gyro')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {SCOPES.map((s, idx) => (
                  <tr
                    key={s.key}
                    className={
                      idx % 2 === 0
                        ? 'bg-panel-soft/40'
                        : 'bg-transparent'
                    }
                  >
                    <td className="px-2 py-1.5 text-text-soft">{s.label}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-text">
                      {preset.values.camera[s.key]}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-text">
                      {preset.values.ads[s.key]}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-text">
                      {preset.values.gyro[s.key]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={onApplyPreset}>
              {t('device.applyToBuilder')}
            </Button>
            {appliedNote && (
              <span className="text-sm text-good">{appliedNote}</span>
            )}
          </div>
          <p className="mt-3 rounded-xl border border-warn/30 bg-warn/5 px-3 py-2 text-xs leading-relaxed text-warn">
            {t('device.applyNote')}
          </p>
        </Card>
      )}
    </div>
  );
}
