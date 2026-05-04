import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { Badge, Card, Pill } from '../components/UI';
import { DROP_SPOTS, type DropSpot } from '../data/maps';

const MAPS: DropSpot['map'][] = ['Erangel', 'Miramar', 'Sanhok', 'Livik'];

export default function DropSpots() {
  const { t } = useI18n();
  const [map, setMap] = useState<DropSpot['map']>('Erangel');

  const filtered = useMemo(
    () => DROP_SPOTS.filter((s) => s.map === map),
    [map],
  );

  const lootTone = {
    low: 'default',
    mid: 'default',
    high: 'accent',
    top: 'warn',
  } as const;
  const riskTone = {
    low: 'good',
    mid: 'warn',
    high: 'bad',
  } as const;

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('maps.title')} subtitle={t('maps.lead')}>
        <div className="flex flex-wrap gap-2">
          {MAPS.map((m) => (
            <Pill key={m} active={map === m} onClick={() => setMap(m)}>
              {m}
            </Pill>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border border-line bg-panel p-4"
          >
            <header className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold leading-tight">{s.name}</h3>
                <div className="text-[11px] text-text-dim">{s.map}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={lootTone[s.loot]}>{t(`maps.loot.${s.loot}`)}</Badge>
                <Badge tone={riskTone[s.risk]}>{t(`maps.risk.${s.risk}`)}</Badge>
              </div>
            </header>
            <p className="text-sm text-text-soft">{s.notes}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
