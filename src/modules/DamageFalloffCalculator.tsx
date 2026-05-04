import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { Card, Pill, Select, Stat } from '../components/UI';
import {
  ARMOR_REDUCTION,
  WEAPONS_DEDUPED,
  damagePerShot,
  type ArmorLevel,
  type HitZone,
} from '../data/weapons';

export default function DamageFalloffCalculator() {
  const { t } = useI18n();
  const [weaponId, setWeaponId] = useState('m416');
  const [zone, setZone] = useState<HitZone>('body');
  const [helmet, setHelmet] = useState<ArmorLevel>('L2');
  const [vest, setVest] = useState<ArmorLevel>('L2');

  const w = WEAPONS_DEDUPED.find((x) => x.id === weaponId)!;

  const series = useMemo(() => {
    const points: { d: number; dmg: number }[] = [];
    for (let d = 0; d <= 400; d += 10) {
      points.push({
        d,
        dmg: damagePerShot(w, { zone, helmet, vest, distance: d }),
      });
    }
    return points;
  }, [w, zone, helmet, vest]);

  const max = series[0]?.dmg ?? 1;
  const width = 600;
  const height = 220;

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('falloff.title')} subtitle={t('falloff.lead')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={weaponId} onChange={(e) => setWeaponId(e.target.value)}>
            {WEAPONS_DEDUPED.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-soft">{t('common.zone')}</span>
            <div className="flex gap-1.5">
              {(['head', 'body', 'limb'] as HitZone[]).map((z) => (
                <Pill key={z} active={zone === z} onClick={() => setZone(z)}>
                  {t(`common.${z}`)}
                </Pill>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ArmorRow label={t('common.helmet')} value={helmet} onChange={setHelmet} />
          <ArmorRow label={t('common.vest')} value={vest} onChange={setVest} />
        </div>
      </Card>

      <Card>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          <rect width={width} height={height} fill="#11141b" rx="14" />
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={i}
              x1={(i + 1) * (width / 10)}
              x2={(i + 1) * (width / 10)}
              y1={20}
              y2={height - 30}
              stroke="#1d2230"
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={30}
              x2={width - 10}
              y1={20 + i * ((height - 50) / 4)}
              y2={20 + i * ((height - 50) / 4)}
              stroke="#1d2230"
            />
          ))}
          <polyline
            fill="none"
            stroke="#f5a524"
            strokeWidth="2"
            points={series
              .map(
                (p) =>
                  `${30 + (p.d / 400) * (width - 40)},${20 + (1 - p.dmg / max) * (height - 50)}`,
              )
              .join(' ')}
          />
          {/* axes labels */}
          {[0, 100, 200, 300, 400].map((d) => (
            <text
              key={d}
              x={30 + (d / 400) * (width - 40)}
              y={height - 10}
              fill="#6b738a"
              fontSize="11"
              textAnchor="middle"
            >
              {d}m
            </text>
          ))}
          <text x={5} y={20} fill="#6b738a" fontSize="11">
            {Math.round(max)}
          </text>
          <text x={5} y={height - 30} fill="#6b738a" fontSize="11">
            0
          </text>
        </svg>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[10, 50, 100, 200].map((d) => {
          const dmg = damagePerShot(w, { zone, helmet, vest, distance: d });
          return (
            <Stat
              key={d}
              label={`${d}m`}
              value={dmg.toFixed(1)}
              hint={`${Math.ceil(100 / Math.max(0.0001, dmg))} shots → 100hp`}
            />
          );
        })}
      </div>
    </div>
  );
}

function ArmorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ArmorLevel;
  onChange: (v: ArmorLevel) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-text-soft">{label}</div>
      <div className="flex gap-1.5">
        {(Object.keys(ARMOR_REDUCTION) as ArmorLevel[]).map((a) => (
          <Pill key={a} active={value === a} onClick={() => onChange(a)}>
            {a}
          </Pill>
        ))}
      </div>
    </div>
  );
}
