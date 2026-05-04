import { useState } from 'react';
import { useI18n } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Badge, Card, Pill, Select, Stat } from '../components/UI';
import {
  DEVICE_MODELS,
  recommendForDevice,
  type RefreshRate,
} from '../data/devices';
import { SENSITIVITY_PRESETS } from '../data/sensitivity';

export default function DeviceProfile() {
  const { t } = useI18n();
  const [modelId, setModelId] = useLocalStorage<string>(
    'pubgm.device.model',
    'iphone-15-pro',
  );
  const [refresh, setRefresh] = useState<RefreshRate>(120);
  const model =
    DEVICE_MODELS.find((d) => d.id === modelId) ?? DEVICE_MODELS[0];
  const profile = recommendForDevice(model, refresh);
  const preset = SENSITIVITY_PRESETS.find(
    (p) => p.id === profile.recommendedPresetId,
  );

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
          <p className="text-sm text-text-soft">{preset.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {preset.tags.map((tg) => (
              <Badge key={tg} tone="default">
                {tg}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
