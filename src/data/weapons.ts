// PUBG Mobile weapon data — community-aggregated values, approximate to the
// current global meta. Tweak here when a new patch lands.
//
// Sources: pubg.gamepedia / fandom wiki, training-ground tests.
// Patch reference: 3.x global build.

export type WeaponCategory =
  | 'AR'
  | 'DMR'
  | 'SR'
  | 'SMG'
  | 'LMG'
  | 'PISTOL'
  | 'SHOTGUN';

export type AmmoType =
  | '5.56mm'
  | '7.62mm'
  | '.45 ACP'
  | '9mm'
  | '12 Gauge'
  | '.300 Magnum'
  | 'flare';

export interface Weapon {
  id: string;
  name: string;
  category: WeaponCategory;
  ammo: AmmoType;
  /** Base body damage per bullet (head/limb derived via multipliers). */
  damage: number;
  /** Pellet count for shotguns; 1 for everything else. */
  pellets?: number;
  /** Rounds per minute. */
  rpm: number;
  /** Magazine size with extended mag. */
  magExt: number;
  /** Default magazine size (no extension). */
  magBase: number;
  /** Muzzle velocity in m/s. */
  velocity: number;
  /** Fire mode capability. */
  modes: ('single' | 'burst' | 'auto')[];
  /** Whether the weapon spawns only in care packages. */
  crateOnly?: boolean;
  /** Head shot multiplier. */
  headMul: number;
  /** Limb shot multiplier. */
  limbMul: number;
}

export const WEAPONS: Weapon[] = [
  // Assault Rifles
  { id: 'm416', name: 'M416', category: 'AR', ammo: '5.56mm', damage: 41, rpm: 750, magBase: 30, magExt: 40, velocity: 880, modes: ['single', 'auto'], headMul: 2.3, limbMul: 0.9 },
  { id: 'akm', name: 'AKM', category: 'AR', ammo: '7.62mm', damage: 47, rpm: 600, magBase: 30, magExt: 40, velocity: 715, modes: ['single', 'auto'], headMul: 2.3, limbMul: 0.9 },
  { id: 'beryl', name: 'Beryl M762', category: 'AR', ammo: '7.62mm', damage: 47, rpm: 700, magBase: 30, magExt: 40, velocity: 715, modes: ['single', 'burst', 'auto'], headMul: 2.3, limbMul: 0.9 },
  { id: 'scarl', name: 'SCAR-L', category: 'AR', ammo: '5.56mm', damage: 41, rpm: 600, magBase: 30, magExt: 40, velocity: 870, modes: ['single', 'auto'], headMul: 2.3, limbMul: 0.9 },
  { id: 'm16a4', name: 'M16A4', category: 'AR', ammo: '5.56mm', damage: 43, rpm: 770, magBase: 30, magExt: 40, velocity: 900, modes: ['single', 'burst'], headMul: 2.3, limbMul: 0.9 },
  { id: 'qbz', name: 'QBZ', category: 'AR', ammo: '5.56mm', damage: 43, rpm: 650, magBase: 30, magExt: 40, velocity: 870, modes: ['single', 'auto'], headMul: 2.3, limbMul: 0.9 },
  { id: 'g36c', name: 'G36C', category: 'AR', ammo: '5.56mm', damage: 43, rpm: 650, magBase: 30, magExt: 40, velocity: 870, modes: ['single', 'auto'], headMul: 2.3, limbMul: 0.9 },
  { id: 'aug', name: 'AUG A3', category: 'AR', ammo: '5.56mm', damage: 41, rpm: 700, magBase: 30, magExt: 40, velocity: 900, modes: ['single', 'auto'], crateOnly: true, headMul: 2.3, limbMul: 0.9 },
  { id: 'groza', name: 'Groza', category: 'AR', ammo: '7.62mm', damage: 49, rpm: 700, magBase: 30, magExt: 40, velocity: 715, modes: ['single', 'auto'], crateOnly: true, headMul: 2.3, limbMul: 0.9 },
  { id: 'mk47', name: 'Mk47 Mutant', category: 'AR', ammo: '7.62mm', damage: 49, rpm: 600, magBase: 20, magExt: 30, velocity: 715, modes: ['single', 'burst'], headMul: 2.3, limbMul: 0.9 },
  { id: 'ace32', name: 'ACE32', category: 'AR', ammo: '7.62mm', damage: 47, rpm: 632, magBase: 40, magExt: 50, velocity: 740, modes: ['single', 'auto'], headMul: 2.3, limbMul: 0.9 },

  // DMRs
  { id: 'mini14', name: 'Mini14', category: 'DMR', ammo: '5.56mm', damage: 46, rpm: 360, magBase: 20, magExt: 30, velocity: 990, modes: ['single'], headMul: 2.3, limbMul: 0.9 },
  { id: 'sks', name: 'SKS', category: 'DMR', ammo: '7.62mm', damage: 53, rpm: 250, magBase: 10, magExt: 20, velocity: 800, modes: ['single'], headMul: 2.3, limbMul: 0.9 },
  { id: 'slr', name: 'SLR', category: 'DMR', ammo: '7.62mm', damage: 58, rpm: 280, magBase: 10, magExt: 20, velocity: 840, modes: ['single'], headMul: 2.3, limbMul: 0.9 },
  { id: 'qbu', name: 'QBU', category: 'DMR', ammo: '5.56mm', damage: 48, rpm: 360, magBase: 10, magExt: 20, velocity: 990, modes: ['single'], headMul: 2.3, limbMul: 0.9 },
  { id: 'mk14', name: 'Mk14 EBR', category: 'DMR', ammo: '7.62mm', damage: 61, rpm: 480, magBase: 10, magExt: 20, velocity: 853, modes: ['single', 'auto'], crateOnly: true, headMul: 2.3, limbMul: 0.9 },
  { id: 'vss', name: 'VSS', category: 'DMR', ammo: '9mm', damage: 41, rpm: 700, magBase: 10, magExt: 20, velocity: 330, modes: ['single', 'auto'], headMul: 2.3, limbMul: 0.9 },
  { id: 'mini14', name: 'Mini14', category: 'DMR', ammo: '5.56mm', damage: 46, rpm: 360, magBase: 20, magExt: 30, velocity: 990, modes: ['single'], headMul: 2.3, limbMul: 0.9 },

  // Sniper Rifles
  { id: 'kar98k', name: 'Kar98k', category: 'SR', ammo: '7.62mm', damage: 75, rpm: 41, magBase: 5, magExt: 5, velocity: 760, modes: ['single'], headMul: 2.5, limbMul: 0.9 },
  { id: 'm24', name: 'M24', category: 'SR', ammo: '7.62mm', damage: 79, rpm: 41, magBase: 5, magExt: 7, velocity: 790, modes: ['single'], headMul: 2.5, limbMul: 0.9 },
  { id: 'awm', name: 'AWM', category: 'SR', ammo: '.300 Magnum', damage: 105, rpm: 41, magBase: 5, magExt: 7, velocity: 945, modes: ['single'], crateOnly: true, headMul: 2.5, limbMul: 0.9 },
  { id: 'win94', name: 'Win94', category: 'SR', ammo: '.45 ACP', damage: 66, rpm: 60, magBase: 8, magExt: 8, velocity: 760, modes: ['single'], headMul: 2.5, limbMul: 0.9 },

  // SMGs
  { id: 'ump45', name: 'UMP45', category: 'SMG', ammo: '.45 ACP', damage: 39, rpm: 540, magBase: 25, magExt: 35, velocity: 400, modes: ['single', 'burst', 'auto'], headMul: 2.1, limbMul: 0.9 },
  { id: 'vector', name: 'Vector', category: 'SMG', ammo: '9mm', damage: 31, rpm: 1100, magBase: 13, magExt: 33, velocity: 380, modes: ['single', 'burst', 'auto'], headMul: 2.1, limbMul: 0.9 },
  { id: 'uzi', name: 'Micro UZI', category: 'SMG', ammo: '9mm', damage: 26, rpm: 1000, magBase: 25, magExt: 35, velocity: 350, modes: ['single', 'auto'], headMul: 2.1, limbMul: 0.9 },
  { id: 'tommy', name: 'Tommy Gun', category: 'SMG', ammo: '.45 ACP', damage: 38, rpm: 700, magBase: 30, magExt: 50, velocity: 280, modes: ['single', 'auto'], headMul: 2.1, limbMul: 0.9 },
  { id: 'bizon', name: 'PP-19 Bizon', category: 'SMG', ammo: '9mm', damage: 35, rpm: 700, magBase: 53, magExt: 53, velocity: 408, modes: ['single', 'auto'], headMul: 2.1, limbMul: 0.9 },
  { id: 'mp5k', name: 'MP5K', category: 'SMG', ammo: '9mm', damage: 33, rpm: 900, magBase: 30, magExt: 40, velocity: 400, modes: ['single', 'burst', 'auto'], headMul: 2.1, limbMul: 0.9 },
  { id: 'p90', name: 'P90', category: 'SMG', ammo: '5.7mm' as AmmoType, damage: 34, rpm: 750, magBase: 50, magExt: 50, velocity: 715, modes: ['auto'], crateOnly: true, headMul: 2.1, limbMul: 0.9 },

  // LMGs
  { id: 'm249', name: 'M249', category: 'LMG', ammo: '5.56mm', damage: 45, rpm: 700, magBase: 100, magExt: 100, velocity: 915, modes: ['auto'], crateOnly: true, headMul: 2.3, limbMul: 0.9 },
  { id: 'dp28', name: 'DP-28', category: 'LMG', ammo: '7.62mm', damage: 51, rpm: 540, magBase: 47, magExt: 47, velocity: 715, modes: ['auto'], headMul: 2.3, limbMul: 0.9 },
  { id: 'mg3', name: 'MG3', category: 'LMG', ammo: '7.62mm', damage: 41, rpm: 660, magBase: 75, magExt: 75, velocity: 820, modes: ['auto'], crateOnly: true, headMul: 2.3, limbMul: 0.9 },

  // Pistols
  { id: 'p1911', name: 'P1911', category: 'PISTOL', ammo: '.45 ACP', damage: 41, rpm: 450, magBase: 7, magExt: 12, velocity: 250, modes: ['single'], headMul: 2.1, limbMul: 0.9 },
  { id: 'p92', name: 'P92', category: 'PISTOL', ammo: '9mm', damage: 35, rpm: 500, magBase: 15, magExt: 20, velocity: 380, modes: ['single'], headMul: 2.1, limbMul: 0.9 },
  { id: 'p18c', name: 'P18C', category: 'PISTOL', ammo: '9mm', damage: 23, rpm: 450, magBase: 17, magExt: 25, velocity: 375, modes: ['single', 'burst'], headMul: 2.1, limbMul: 0.9 },
  { id: 'r45', name: 'R45', category: 'PISTOL', ammo: '.45 ACP', damage: 55, rpm: 360, magBase: 6, magExt: 6, velocity: 330, modes: ['single'], headMul: 2.1, limbMul: 0.9 },
  { id: 'r1895', name: 'R1895', category: 'PISTOL', ammo: '7.62mm', damage: 55, rpm: 420, magBase: 7, magExt: 7, velocity: 330, modes: ['single'], headMul: 2.1, limbMul: 0.9 },
  { id: 'sawedoff', name: 'Sawed-Off', category: 'PISTOL', ammo: '12 Gauge', damage: 22, pellets: 9, rpm: 90, magBase: 2, magExt: 2, velocity: 360, modes: ['single'], headMul: 1.5, limbMul: 0.9 },

  // Shotguns
  { id: 's686', name: 'S686', category: 'SHOTGUN', ammo: '12 Gauge', damage: 24, pellets: 9, rpm: 90, magBase: 2, magExt: 2, velocity: 370, modes: ['single'], headMul: 1.5, limbMul: 0.9 },
  { id: 's1897', name: 'S1897', category: 'SHOTGUN', ammo: '12 Gauge', damage: 24, pellets: 9, rpm: 70, magBase: 5, magExt: 5, velocity: 370, modes: ['single'], headMul: 1.5, limbMul: 0.9 },
  { id: 's12k', name: 'S12K', category: 'SHOTGUN', ammo: '12 Gauge', damage: 22, pellets: 9, rpm: 320, magBase: 5, magExt: 8, velocity: 350, modes: ['single'], headMul: 1.5, limbMul: 0.9 },
  { id: 'dbs', name: 'DBS', category: 'SHOTGUN', ammo: '12 Gauge', damage: 26, pellets: 9, rpm: 225, magBase: 14, magExt: 14, velocity: 380, modes: ['single'], crateOnly: true, headMul: 1.5, limbMul: 0.9 },
];

// Deduplicate Mini14 entry that snuck into the array twice if any.
export const WEAPONS_DEDUPED: Weapon[] = (() => {
  const seen = new Set<string>();
  const out: Weapon[] = [];
  for (const w of WEAPONS) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    out.push(w);
  }
  return out;
})();

export const ARMOR_REDUCTION = {
  none: 0,
  L1: 0.3,
  L2: 0.4,
  L3: 0.55,
} as const;
export type ArmorLevel = keyof typeof ARMOR_REDUCTION;

export const HELMET_HP = { none: 0, L1: 80, L2: 150, L3: 230 };
export const VEST_HP = { none: 0, L1: 200, L2: 220, L3: 250 };

export type HitZone = 'head' | 'body' | 'limb';

export interface DamageOptions {
  zone: HitZone;
  helmet: ArmorLevel;
  vest: ArmorLevel;
  /** Linear damage falloff: distance in meters. */
  distance?: number;
}

/** Approximate damage falloff: -3% per 100m for AR, -5% for SMG/Shotgun, -1% for SR. */
function falloffFactor(weapon: Weapon, distance: number): number {
  const per100 = (() => {
    switch (weapon.category) {
      case 'SR':
        return 0.01;
      case 'DMR':
        return 0.015;
      case 'AR':
        return 0.03;
      case 'LMG':
        return 0.03;
      case 'SMG':
        return 0.06;
      case 'SHOTGUN':
        return 0.15;
      case 'PISTOL':
        return 0.08;
    }
  })();
  return Math.max(0.4, 1 - (per100 * distance) / 100);
}

export function damagePerShot(weapon: Weapon, opts: DamageOptions): number {
  const zoneMul =
    opts.zone === 'head'
      ? weapon.headMul
      : opts.zone === 'limb'
        ? weapon.limbMul
        : 1;
  const armor =
    opts.zone === 'head'
      ? ARMOR_REDUCTION[opts.helmet]
      : opts.zone === 'body'
        ? ARMOR_REDUCTION[opts.vest]
        : 0;
  const pellets = weapon.pellets ?? 1;
  const falloff = falloffFactor(weapon, opts.distance ?? 0);
  const raw = weapon.damage * zoneMul * pellets * (1 - armor) * falloff;
  return Math.max(0, raw);
}

/** Time-to-kill in milliseconds (assumes target HP 100, no boosts). */
export function ttkMs(weapon: Weapon, opts: DamageOptions, hp = 100): number {
  const dps = damagePerShot(weapon, opts);
  if (dps <= 0) return Infinity;
  const shots = Math.ceil(hp / dps);
  if (shots <= 1) return 0;
  const intervalMs = 60000 / weapon.rpm;
  return (shots - 1) * intervalMs;
}

export function shotsToKill(
  weapon: Weapon,
  opts: DamageOptions,
  hp = 100,
): number {
  const dps = damagePerShot(weapon, opts);
  if (dps <= 0) return Infinity;
  return Math.ceil(hp / dps);
}
