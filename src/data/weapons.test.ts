import { describe, expect, it } from 'vitest';
import {
  ARMOR_REDUCTION,
  WEAPONS,
  WEAPONS_DEDUPED,
  damagePerShot,
  shotsToKill,
  ttkMs,
  type Weapon,
} from './weapons';

const M416 = WEAPONS_DEDUPED.find((w) => w.id === 'm416')!;
const AWM = WEAPONS_DEDUPED.find((w) => w.id === 'awm')!;
const S686 = WEAPONS_DEDUPED.find((w) => w.id === 's686')!;
const M24 = WEAPONS_DEDUPED.find((w) => w.id === 'm24')!;
const VECTOR = WEAPONS_DEDUPED.find((w) => w.id === 'vector')!;

describe('weapon dataset', () => {
  it('dedupes repeat entries so ids are unique', () => {
    const ids = WEAPONS_DEDUPED.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(WEAPONS_DEDUPED.length).toBeLessThan(WEAPONS.length);
    expect(ids.filter((id) => id === 'mini14')).toHaveLength(1);
  });

  it('orders armor reduction none < L1 < L2 < L3', () => {
    expect(ARMOR_REDUCTION.none).toBe(0);
    expect(ARMOR_REDUCTION.L1).toBeLessThan(ARMOR_REDUCTION.L2);
    expect(ARMOR_REDUCTION.L2).toBeLessThan(ARMOR_REDUCTION.L3);
  });
});

describe('damagePerShot', () => {
  it('returns base damage on unarmored body at point blank', () => {
    expect(
      damagePerShot(M416, { zone: 'body', helmet: 'none', vest: 'none' }),
    ).toBe(41);
  });

  it('applies head multiplier with helmet, limb multiplier without armor', () => {
    expect(
      damagePerShot(M416, { zone: 'head', helmet: 'none', vest: 'none' }),
    ).toBeCloseTo(41 * 2.3, 6);
    // Limb shots ignore armor entirely.
    expect(
      damagePerShot(M416, { zone: 'limb', helmet: 'L3', vest: 'L3' }),
    ).toBeCloseTo(41 * 0.9, 6);
  });

  it('reduces body damage through vests', () => {
    const dmg = damagePerShot(M416, { zone: 'body', helmet: 'none', vest: 'L3' });
    expect(dmg).toBeCloseTo(41 * (1 - ARMOR_REDUCTION.L3), 6);
    expect(dmg).toBeLessThan(41);
  });

  it('multiplies shotgun damage by pellet count', () => {
    expect(
      damagePerShot(S686, { zone: 'body', helmet: 'none', vest: 'none' }),
    ).toBe(24 * 9);
  });

  it('floors long-range falloff instead of dropping to zero', () => {
    // Shotgun at 400m would fall 60% -> clamped to the 0.4 floor.
    expect(
      damagePerShot(S686, {
        zone: 'body',
        helmet: 'none',
        vest: 'none',
        distance: 400,
      }),
    ).toBeCloseTo(24 * 9 * 0.4, 6);
  });

  it('decays SMGs faster than snipers with distance', () => {
    const opts = { zone: 'body' as const, helmet: 'none' as const, vest: 'none' as const, distance: 200 };
    const smgRatio =
      damagePerShot(VECTOR, opts) /
      damagePerShot(VECTOR, { ...opts, distance: 0 });
    const srRatio =
      damagePerShot(M24, opts) /
      damagePerShot(M24, { ...opts, distance: 0 });
    expect(smgRatio).toBeLessThan(srRatio);
  });
});

describe('ttkMs / shotsToKill', () => {
  it('computes M416 body TTK from fire interval', () => {
    // 41 dmg -> 3 shots; 750rpm -> 80ms between shots -> 160ms.
    const opts = { zone: 'body' as const, helmet: 'none' as const, vest: 'none' as const };
    expect(shotsToKill(M416, opts, 100)).toBe(3);
    expect(ttkMs(M416, opts, 100)).toBe(160);
  });

  it('returns 0 TTK for a one-shot kill', () => {
    const opts = { zone: 'head' as const, helmet: 'none' as const, vest: 'none' as const };
    expect(shotsToKill(AWM, opts, 100)).toBe(1);
    expect(ttkMs(AWM, opts, 100)).toBe(0);
  });

  it('returns Infinity instead of NaN for zero-damage weapons', () => {
    const blank: Weapon = {
      id: 'blank',
      name: 'Blank',
      category: 'AR',
      ammo: '5.56mm',
      damage: 0,
      rpm: 600,
      magBase: 30,
      magExt: 40,
      velocity: 800,
      modes: ['auto'],
      headMul: 2.3,
      limbMul: 0.9,
    };
    const opts = { zone: 'body' as const, helmet: 'none' as const, vest: 'none' as const };
    expect(ttkMs(blank, opts, 100)).toBe(Infinity);
    expect(shotsToKill(blank, opts, 100)).toBe(Infinity);
  });

  it('keeps shots consistent with per-shot damage', () => {
    const opts = { zone: 'body' as const, helmet: 'L2' as const, vest: 'L2' as const, distance: 50 };
    for (const w of WEAPONS_DEDUPED.slice(0, 8)) {
      const dmg = damagePerShot(w, opts);
      expect(shotsToKill(w, opts, 100)).toBe(Math.ceil(100 / dmg));
    }
  });
});
