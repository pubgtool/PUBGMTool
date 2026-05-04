import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { Badge, Card, Pill, Select, Slider, Stat } from '../components/UI';
import {
  ARMOR_REDUCTION,
  WEAPONS_DEDUPED,
  damagePerShot,
  shotsToKill,
  ttkMs,
  type ArmorLevel,
  type HitZone,
  type Weapon,
} from '../data/weapons';

export default function WeaponTtkCalculator() {
  const { t } = useI18n();
  const [w1Id, setW1Id] = useState('m416');
  const [w2Id, setW2Id] = useState('akm');
  const [zone, setZone] = useState<HitZone>('body');
  const [helmet, setHelmet] = useState<ArmorLevel>('L2');
  const [vest, setVest] = useState<ArmorLevel>('L2');
  const [distance, setDistance] = useState(50);
  const [hp, setHp] = useState(100);

  const w1 = WEAPONS_DEDUPED.find((w) => w.id === w1Id)!;
  const w2 = WEAPONS_DEDUPED.find((w) => w.id === w2Id)!;

  const rows = useMemo(() => {
    const opts = { zone, helmet, vest, distance };
    return [w1, w2].map((w) => {
      const dmg = damagePerShot(w, opts);
      const shots = shotsToKill(w, opts, hp);
      const ttk = ttkMs(w, opts, hp);
      const dps = (dmg * w.rpm) / 60;
      return { w, dmg, shots, ttk, dps };
    });
  }, [w1, w2, zone, helmet, vest, distance, hp]);

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('ttk.title')} subtitle={t('ttk.lead')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <WeaponPicker label={t('ttk.weapon1')} value={w1Id} onChange={setW1Id} />
          <WeaponPicker label={t('ttk.weapon2')} value={w2Id} onChange={setW2Id} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-text-soft">{t('common.zone')}</div>
            <div className="flex gap-1.5">
              {(['head', 'body', 'limb'] as HitZone[]).map((z) => (
                <Pill key={z} active={zone === z} onClick={() => setZone(z)}>
                  {t(`common.${z}`)}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-text-soft">{t('common.helmet')}</div>
            <div className="flex gap-1.5">
              {(Object.keys(ARMOR_REDUCTION) as ArmorLevel[]).map((a) => (
                <Pill key={a} active={helmet === a} onClick={() => setHelmet(a)}>
                  {a === 'none' ? t('common.none') : a}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-text-soft">{t('common.vest')}</div>
            <div className="flex gap-1.5">
              {(Object.keys(ARMOR_REDUCTION) as ArmorLevel[]).map((a) => (
                <Pill key={a} active={vest === a} onClick={() => setVest(a)}>
                  {a === 'none' ? t('common.none') : a}
                </Pill>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Slider
            label={t('common.distance')}
            min={5}
            max={400}
            value={distance}
            onChange={setDistance}
            unit="m"
          />
          <Slider
            label="HP"
            min={10}
            max={200}
            value={hp}
            onChange={setHp}
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-text-dim">
              <tr>
                <th className="px-2 py-2 text-left">{t('common.weapon')}</th>
                <th className="px-2 py-2 text-left">{t('common.category')}</th>
                <th className="px-2 py-2 text-right">{t('ttk.headers.dmg')}</th>
                <th className="px-2 py-2 text-right">{t('ttk.headers.shots')}</th>
                <th className="px-2 py-2 text-right">{t('ttk.headers.ttk')}</th>
                <th className="px-2 py-2 text-right">{t('ttk.headers.dps')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.w.id} className="border-t border-line/60">
                  <td className="px-2 py-2">
                    <div className="font-medium">{r.w.name}</div>
                    <div className="text-xs text-text-dim">{r.w.ammo}</div>
                  </td>
                  <td className="px-2 py-2">
                    <Badge tone={r.w.crateOnly ? 'accent' : 'default'}>
                      {r.w.category}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {r.dmg.toFixed(1)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {Number.isFinite(r.shots) ? r.shots : '∞'}
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {Number.isFinite(r.ttk) ? Math.round(r.ttk) : '∞'}
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {r.dps.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label={`${w1.name} TTK`}
            value={Number.isFinite(rows[0].ttk) ? `${Math.round(rows[0].ttk)}ms` : '∞'}
            tone={rows[0].ttk < rows[1].ttk ? 'good' : 'default'}
          />
          <Stat
            label={`${w2.name} TTK`}
            value={Number.isFinite(rows[1].ttk) ? `${Math.round(rows[1].ttk)}ms` : '∞'}
            tone={rows[1].ttk < rows[0].ttk ? 'good' : 'default'}
          />
          <Stat
            label="ΔTTK"
            value={
              Number.isFinite(rows[0].ttk) && Number.isFinite(rows[1].ttk)
                ? `${Math.round(Math.abs(rows[0].ttk - rows[1].ttk))}ms`
                : '∞'
            }
          />
          <Stat
            label="Better"
            value={
              rows[0].ttk === rows[1].ttk
                ? '='
                : rows[0].ttk < rows[1].ttk
                  ? w1.name
                  : w2.name
            }
            tone="warn"
          />
        </div>
        <p className="mt-3 text-xs text-text-dim">
          {t('common.warning.dataDisclaimer')}
        </p>
      </Card>
    </div>
  );
}

function WeaponPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Weapon[]>();
    for (const w of WEAPONS_DEDUPED) {
      const g = map.get(w.category) ?? [];
      g.push(w);
      map.set(w.category, g);
    }
    return [...map.entries()];
  }, []);
  return (
    <label className="block">
      <div className="mb-1 text-xs text-text-soft">{label}</div>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {groups.map(([cat, ws]) => (
          <optgroup key={cat} label={cat}>
            {ws.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.damage}d · {w.rpm}rpm)
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </label>
  );
}
