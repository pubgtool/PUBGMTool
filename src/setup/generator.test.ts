import { describe, expect, it } from 'vitest';
import { generateSetup, type WizardAnswers } from './generator';
import { DEFAULT_ANSWERS, DEVICE_OPTIONS } from './wizardConfig';
import type { ScopeKey } from '../data/sensitivity';

const SCOPES: ScopeKey[] = [
  'tppNoScope',
  'fppNoScope',
  'redDot',
  'x2',
  'x3',
  'x4',
  'x6',
  'x8',
];

function answers(patch: Partial<WizardAnswers> = {}): WizardAnswers {
  return { ...DEFAULT_ANSWERS, ...patch };
}

function allChannels(r: ReturnType<typeof generateSetup>) {
  return [r.sensitivity.camera, r.sensitivity.ads, r.sensitivity.gyro];
}

describe('pickArchetype', () => {
  it('routes low-end hardware to low_end regardless of style', () => {
    expect(generateSetup(answers({ tier: 'low' })).archetype).toBe('low_end');
    expect(generateSetup(answers({ fps: 'smooth' })).archetype).toBe('low_end');
    expect(generateSetup(answers({ fps: 'balanced' })).archetype).toBe('low_end');
  });

  it('routes iPhone Pro 120Hz to iphone_120', () => {
    const r = generateSetup(
      answers({ device: 'iphone_13_pro', refresh: 120, tier: 'flagship' }),
    );
    expect(r.archetype).toBe('iphone_120');
  });

  it('routes gyro-off players to no_gyro', () => {
    const r = generateSetup(
      answers({ device: 'poco_x6', tier: 'mid', refresh: 120, gyroMode: 'off' }),
    );
    expect(r.archetype).toBe('no_gyro');
  });

  it('keeps the device preset for gyro-off iPhone Pro but still zeroes gyro output', () => {
    // Device presets take precedence over gyro preference; applyRules
    // zeroes the gyro column so no dead numbers ship to the game.
    const r = generateSetup(answers({ gyroMode: 'off' }));
    expect(r.archetype).toBe('iphone_120');
    expect(Object.values(r.sensitivity.gyro).every((v) => v === 0)).toBe(true);
    expect(Object.values(r.sensitivity.camera).some((v) => v > 0)).toBe(true);
  });

  it('routes esports full-gyro grip to full_gyro', () => {
    const r = generateSetup(
      answers({
        device: 'rog_phone',
        gyroMode: 'always_on',
        fingers: 6,
        adsMode: 'toggle',
      }),
    );
    expect(r.archetype).toBe('full_gyro');
  });

  it('defaults to hybrid so all three columns show real numbers', () => {
    const r = generateSetup(
      answers({ device: 'galaxy_s24_ultra', tier: 'flagship', refresh: 120 }),
    );
    expect(r.archetype).toBe('hybrid');
    for (const row of allChannels(r)) {
      expect(Object.values(row).some((v) => v > 0)).toBe(true);
    }
  });
});

describe('sensitivity rules', () => {
  it('keeps every value an integer in game range 0-300', () => {
    const combos: Partial<WizardAnswers>[] = [
      {},
      { playstyle: 'rusher', problems: ['recoil_rises', 'overflick'] },
      { playstyle: 'sniper', problems: ['underflick', 'cant_long_range'] },
      { fingers: 2, gyroMode: 'scope_on' },
      { fingers: 6, adsMode: 'toggle', gyroMode: 'always_on' },
      { tier: 'low', gyroMode: 'off' },
    ];
    for (const c of combos) {
      const r = generateSetup(answers(c));
      for (const row of allChannels(r)) {
        for (const k of SCOPES) {
          expect(Number.isInteger(row[k])).toBe(true);
          expect(row[k]).toBeGreaterThanOrEqual(0);
          expect(row[k]).toBeLessThanOrEqual(300);
        }
      }
    }
  });

  it('zeroes gyro when gyro is off', () => {
    const r = generateSetup(answers({ gyroMode: 'off' }));
    expect(Object.values(r.sensitivity.gyro).every((v) => v === 0)).toBe(true);
    expect(Object.values(r.sensitivity.camera).some((v) => v > 0)).toBe(true);
  });

  it('zeroes hipfire gyro for scope-only mode but keeps scoped gyro', () => {
    const r = generateSetup(answers({ gyroMode: 'scope_on' }));
    expect(r.sensitivity.gyro.tppNoScope).toBe(0);
    expect(r.sensitivity.gyro.fppNoScope).toBe(0);
    expect(r.sensitivity.gyro.redDot).toBeGreaterThan(0);
  });

  it('moves overflick down and underflick up relative to baseline', () => {
    const plain = generateSetup(answers()).sensitivity.camera.redDot;
    const over = generateSetup(answers({ problems: ['overflick'] })).sensitivity
      .camera.redDot;
    const under = generateSetup(answers({ problems: ['underflick'] }))
      .sensitivity.camera.redDot;
    expect(over).toBeLessThan(plain);
    expect(under).toBeGreaterThan(plain);
  });

  it('raises gyro and lowers ADS for vertical recoil problems', () => {
    // Hybrid base (gyro redDot 240) leaves headroom for the +20 delta;
    // the default iPhone preset already sits at the 300 ceiling.
    const base = {
      device: 'poco_x6',
      tier: 'mid' as const,
      refresh: 120 as const,
    };
    const plain = generateSetup(answers(base));
    const fixed = generateSetup(answers({ ...base, problems: ['recoil_rises'] }));
    expect(fixed.sensitivity.gyro.redDot).toBeGreaterThan(
      plain.sensitivity.gyro.redDot,
    );
    expect(fixed.sensitivity.ads.redDot).toBeLessThan(
      plain.sensitivity.ads.redDot,
    );
  });

  it('lowers 8x for snipers vs baseline', () => {
    const plain = generateSetup(answers()).sensitivity.camera.x8;
    const sniper = generateSetup(answers({ playstyle: 'sniper' })).sensitivity
      .camera.x8;
    expect(sniper).toBeLessThan(plain);
  });

  it('calms hipfire for 2-finger players', () => {
    const plain = generateSetup(answers()).sensitivity.camera.tppNoScope;
    const calm = generateSetup(answers({ fingers: 2 })).sensitivity.camera
      .tppNoScope;
    expect(calm).toBeLessThan(plain);
  });
});

describe('score', () => {
  it('sums breakdown to total within 0-100 and maxes to 100', () => {
    const r = generateSetup(answers());
    const sum = r.scoreBreakdown.reduce((s, b) => s + b.value, 0);
    const max = r.scoreBreakdown.reduce((s, b) => s + b.max, 0);
    expect(r.score).toBe(sum);
    expect(max).toBe(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('penalises reported problems', () => {
    const clean = generateSetup(answers({ problems: [] })).score;
    const buggy = generateSetup(
      answers({ problems: ['recoil_rises', 'overflick', 'low_fps'] }),
    ).score;
    expect(buggy).toBeLessThan(clean);
  });
});

describe('graphics / hud / controls', () => {
  it('prioritises frame rate on low tier', () => {
    const g = generateSetup(answers({ tier: 'low' })).graphics;
    expect(g.quality).toBe('Smooth');
    expect(g.frameRate).toBe('Ultra');
  });

  it('unlocks 120 FPS on flagship high-refresh', () => {
    const g = generateSetup(
      answers({ tier: 'flagship', refresh: 144, fps: 'ultra_extreme' }),
    ).graphics;
    expect(g.frameRate).toBe('120 FPS');
    expect(g.quality).toBe('HDR');
  });

  it('maps finger count to HUD preset', () => {
    expect(generateSetup(answers({ fingers: 2 })).hudLayout).toBe(
      'two_finger_thumb',
    );
    expect(generateSetup(answers({ fingers: 3 })).hudLayout).toBe(
      'three_finger',
    );
    expect(generateSetup(answers({ fingers: 4 })).hudLayout).toBe(
      'four_finger_claw',
    );
    expect(generateSetup(answers({ fingers: 6 })).hudLayout).toBe(
      'six_finger_pro',
    );
  });

  it('omits gyro row when gyro is off and reflects ADS mode', () => {
    const r = generateSetup(answers({ gyroMode: 'off', adsMode: 'toggle' }));
    expect(r.controls.some((c) => c.pathKey === 'controls.path.gyro')).toBe(
      false,
    );
    const ads = r.controls.find((c) => c.pathKey === 'controls.path.ads');
    expect(ads?.recommendedKey).toBe('controls.value.ads_toggle');
  });

  it('adds 3D-touch row only for iPhones and skips peek on low tier', () => {
    const iphone = generateSetup(answers({ device: 'iphone_13_pro' }));
    expect(
      iphone.controls.some((c) => c.pathKey === 'controls.path.touch3d'),
    ).toBe(true);
    const low = generateSetup(
      answers({ device: 'redmi_a', tier: 'low', gyroMode: 'off' }),
    );
    expect(
      low.controls.some((c) => c.pathKey === 'controls.path.touch3d'),
    ).toBe(false);
    expect(low.controls.some((c) => c.pathKey === 'controls.path.peek')).toBe(
      false,
    );
  });
});

describe('weapons / fixes / drill', () => {
  it('honours the user primary and pairs a complementary secondary', () => {
    const r = generateSetup(answers({ weapons: ['m416'] }));
    expect(r.weapons.primary).toBe('m416');
    expect(r.weapons.secondary).toBe('kar98');
  });

  it('falls back per playstyle when no weapons picked', () => {
    expect(generateSetup(answers({ weapons: [], playstyle: 'sniper' })).weapons.primary).toBe('kar98');
    expect(generateSetup(answers({ weapons: [], playstyle: 'rusher' })).weapons.primary).toBe('m416');
  });

  it('pairs sniper primaries with an AR', () => {
    const r = generateSetup(answers({ weapons: ['awm'] }));
    expect(r.weapons.secondary).toBe('m416');
  });

  it('maps each problem to its fix key', () => {
    const r = generateSetup(
      answers({ problems: ['recoil_rises', 'low_fps'] }),
    );
    expect(r.fixes).toEqual([
      { problem: 'recoil_rises', fixesKey: 'fixes.recoil_rises' },
      { problem: 'low_fps', fixesKey: 'fixes.low_fps' },
    ]);
  });

  it('builds a 5x2-minute drill', () => {
    const r = generateSetup(answers());
    expect(r.drill).toHaveLength(5);
    r.drill.forEach((d, i) => {
      expect(d.step).toBe(i + 1);
      expect(d.durationMin).toBe(2);
    });
  });
});

describe('device matrix smoke', () => {
  it('generates a valid setup for every curated device', () => {
    for (const d of DEVICE_OPTIONS) {
      const r = generateSetup({
        ...DEFAULT_ANSWERS,
        device: d.id,
        tier: d.tier,
        refresh: d.refresh,
      });
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      for (const row of allChannels(r)) {
        for (const k of SCOPES) {
          expect(row[k]).toBeGreaterThanOrEqual(0);
          expect(row[k]).toBeLessThanOrEqual(300);
        }
      }
    }
  });
});
