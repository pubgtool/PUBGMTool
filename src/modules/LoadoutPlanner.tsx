import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Card, Pill, Select, Stat } from '../components/UI';
import { WEAPONS_DEDUPED } from '../data/weapons';

interface LoadoutItem {
  id: string;
  label: string;
  /** Slot weight (1 = small, 5 = large). */
  weight: number;
  ammo?: string;
}

const THROWABLES: LoadoutItem[] = [
  { id: 'frag', label: 'Frag Grenade', weight: 1 },
  { id: 'smoke', label: 'Smoke Grenade', weight: 1 },
  { id: 'molotov', label: 'Molotov', weight: 1 },
  { id: 'stun', label: 'Stun Grenade', weight: 1 },
];

const HEALS: LoadoutItem[] = [
  { id: 'bandage', label: 'Bandage', weight: 0.5 },
  { id: 'medkit', label: 'Medkit', weight: 4 },
  { id: 'firstaid', label: 'First Aid', weight: 1 },
  { id: 'paink', label: 'Painkillers', weight: 1 },
  { id: 'energy', label: 'Energy Drink', weight: 1 },
  { id: 'adrenaline', label: 'Adrenaline', weight: 2 },
];

const BACKPACKS = {
  none: { label: 'None', slots: 30 },
  L1: { label: 'Level 1', slots: 150 },
  L2: { label: 'Level 2', slots: 200 },
  L3: { label: 'Level 3', slots: 250 },
} as const;
type BackpackLevel = keyof typeof BACKPACKS;

export default function LoadoutPlanner() {
  const { t } = useI18n();
  const [primaryId, setPrimaryId] = useLocalStorage<string>(
    'pubgm.loadout.primary',
    'm416',
  );
  const [secondaryId, setSecondaryId] = useLocalStorage<string>(
    'pubgm.loadout.secondary',
    'kar98k',
  );
  const [backpack, setBackpack] = useLocalStorage<BackpackLevel>(
    'pubgm.loadout.backpack',
    'L2',
  );
  const [throwables, setThrowables] = useLocalStorage<Record<string, number>>(
    'pubgm.loadout.throwables',
    { frag: 2, smoke: 1 },
  );
  const [heals, setHeals] = useLocalStorage<Record<string, number>>(
    'pubgm.loadout.heals',
    { bandage: 8, energy: 2, paink: 2 },
  );
  const [primaryAmmo, setPrimaryAmmo] = useState(150);
  const [secondaryAmmo, setSecondaryAmmo] = useState(20);

  const primary = WEAPONS_DEDUPED.find((w) => w.id === primaryId);
  const secondary = WEAPONS_DEDUPED.find((w) => w.id === secondaryId);

  const used = useMemo(() => {
    let total = 0;
    // Ammo: weight per round depends on caliber
    const ammoWeight = (cal: string | undefined) => {
      switch (cal) {
        case '5.56mm':
          return 0.04;
        case '7.62mm':
          return 0.05;
        case '.45 ACP':
          return 0.06;
        case '9mm':
          return 0.04;
        case '12 Gauge':
          return 0.15;
        case '.300 Magnum':
          return 0.2;
        default:
          return 0.05;
      }
    };
    if (primary) total += primaryAmmo * ammoWeight(primary.ammo);
    if (secondary) total += secondaryAmmo * ammoWeight(secondary.ammo);
    for (const id in throwables) {
      const t = THROWABLES.find((x) => x.id === id);
      if (!t) continue;
      total += (throwables[id] ?? 0) * t.weight;
    }
    for (const id in heals) {
      const h = HEALS.find((x) => x.id === id);
      if (!h) continue;
      total += (heals[id] ?? 0) * h.weight;
    }
    return Math.round(total * 10) / 10;
  }, [primary, secondary, primaryAmmo, secondaryAmmo, throwables, heals]);

  const cap = BACKPACKS[backpack].slots;
  const overweight = used > cap;

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('loadout.title')} subtitle={t('loadout.lead')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-text-soft">{t('loadout.primary')}</div>
            <Select
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
            >
              {WEAPONS_DEDUPED.filter((w) =>
                ['AR', 'DMR', 'LMG', 'SR', 'SHOTGUN'].includes(w.category),
              ).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.ammo}
                </option>
              ))}
            </Select>
            <input
              type="number"
              min={0}
              max={500}
              value={primaryAmmo}
              onChange={(e) =>
                setPrimaryAmmo(
                  Math.max(0, Math.min(500, Number(e.target.value) || 0)),
                )
              }
              className="mt-2 w-full rounded-xl border border-line bg-panel-soft px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-text-soft">{t('loadout.secondary')}</div>
            <Select
              value={secondaryId}
              onChange={(e) => setSecondaryId(e.target.value)}
            >
              {WEAPONS_DEDUPED.filter((w) =>
                ['AR', 'SMG', 'PISTOL', 'SR', 'DMR'].includes(w.category),
              ).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.ammo}
                </option>
              ))}
            </Select>
            <input
              type="number"
              min={0}
              max={500}
              value={secondaryAmmo}
              onChange={(e) =>
                setSecondaryAmmo(
                  Math.max(0, Math.min(500, Number(e.target.value) || 0)),
                )
              }
              className="mt-2 w-full rounded-xl border border-line bg-panel-soft px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      <Card title={t('loadout.throwables')}>
        <ItemRow items={THROWABLES} value={throwables} onChange={setThrowables} />
      </Card>

      <Card title={t('loadout.heals')}>
        <ItemRow items={HEALS} value={heals} onChange={setHeals} />
      </Card>

      <Card title={t('loadout.backpack')}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BACKPACKS) as BackpackLevel[]).map((b) => (
            <Pill key={b} active={backpack === b} onClick={() => setBackpack(b)}>
              {BACKPACKS[b].label} ({BACKPACKS[b].slots})
            </Pill>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label={t('loadout.usedSlots')}
          value={used.toFixed(1)}
          tone={overweight ? 'bad' : used > cap * 0.8 ? 'warn' : 'good'}
        />
        <Stat label={t('loadout.totalSlots')} value={cap} />
        <Stat
          label={overweight ? 'Over!' : 'Free'}
          value={(cap - used).toFixed(1)}
          tone={overweight ? 'bad' : 'default'}
        />
      </div>
    </div>
  );
}

function ItemRow({
  items,
  value,
  onChange,
}: {
  items: LoadoutItem[];
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((it) => {
        const n = value[it.id] ?? 0;
        return (
          <div
            key={it.id}
            className="flex items-center justify-between rounded-xl border border-line bg-panel-soft p-2"
          >
            <div>
              <div className="text-sm font-medium">{it.label}</div>
              <div className="text-[11px] text-text-dim">{it.weight} slots/ea</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onChange({ ...value, [it.id]: Math.max(0, n - 1) })
                }
                className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-panel"
              >
                −
              </button>
              <span className="w-6 text-center font-mono text-sm">{n}</span>
              <button
                onClick={() => onChange({ ...value, [it.id]: n + 1 })}
                className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-panel"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
