import { beforeEach, describe, expect, it } from 'vitest';
import {
  makeShareUrl,
  packToHash,
  parseShareHash,
  unpackFromHash,
} from './share';
import { DEFAULT_ANSWERS } from '../setup/wizardConfig';
import type { WizardAnswers } from '../setup/generator';

function stubWindow(hash = '') {
  (globalThis as unknown as { window: unknown }).window = {
    btoa: (s: string) => globalThis.btoa(s),
    atob: (s: string) => globalThis.atob(s),
    location: {
      origin: 'https://pubgm-toolkit.local',
      pathname: '/',
      hash,
    },
  };
}

beforeEach(() => stubWindow());

describe('packToHash / unpackFromHash', () => {
  it('round-trips payloads including unicode', () => {
    const payload = { note: 'Привет, setup!', sens: 300, nested: { a: [1, 2] } };
    expect(unpackFromHash(packToHash(payload))).toEqual(payload);
  });

  it('emits URL-safe base64 with no + / or padding', () => {
    const payloads = [
      DEFAULT_ANSWERS,
      { ...DEFAULT_ANSWERS, weapons: ['m416', 'kar98', 'awm'] },
      { text: 'aaa???bbb' },
    ];
    for (const p of payloads) {
      expect(packToHash(p)).toMatch(/^[A-Za-z0-9\-_]*$/);
    }
  });

  it('returns null for empty or corrupt input instead of throwing', () => {
    expect(unpackFromHash('')).toBeNull();
    expect(unpackFromHash('!!!not-base64!!!')).toBeNull();
    expect(unpackFromHash('e30')).toEqual({});
  });
});

describe('makeShareUrl / parseShareHash', () => {
  it('round-trips a payload through the location hash', () => {
    const payload = { ...DEFAULT_ANSWERS, fingers: 4 as const };
    const url = makeShareUrl('sens', payload);
    expect(url).toContain('#sens/');
    stubWindow(`#sens/${url.split('#sens/')[1]}`);
    expect(parseShareHash<typeof payload>('sens')).toEqual(payload);
  });

  it('rejects wrong prefix or missing payload', () => {
    stubWindow('#hud/abc123');
    expect(parseShareHash('sens')).toBeNull();
    stubWindow('#sens');
    expect(parseShareHash('sens')).toBeNull();
    stubWindow('');
    expect(parseShareHash('sens')).toBeNull();
  });
});

describe('?setup= share-link codec (App bootstrap <-> SetupResult)', () => {
  // Mirrors the exact btoa(encodeURIComponent()) / decodeURIComponent(atob())
  // pair used by App.tsx and SetupResult.tsx.
  const encodeSetup = (v: unknown) =>
    btoa(encodeURIComponent(JSON.stringify(v)));
  const decodeSetup = (s: string): WizardAnswers =>
    JSON.parse(decodeURIComponent(atob(s))) as WizardAnswers;

  it('survives URL query serialisation for representative answers', () => {
    const variants: WizardAnswers[] = [
      DEFAULT_ANSWERS,
      { ...DEFAULT_ANSWERS, playstyle: 'sniper', weapons: [] },
      {
        ...DEFAULT_ANSWERS,
        playstyle: 'rusher',
        weapons: ['groza', 'm762'],
        problems: [
          'overflick',
          'underflick',
          'recoil_rises',
          'recoil_horizontal',
          'gyro_shakes',
          'gyro_dead_in_ads',
          'cant_tap_fire_scope',
          'finger_drift',
          'low_fps',
          'cant_close_range',
          'cant_long_range',
          'audio_unclear',
        ],
      },
    ];
    for (const v of variants) {
      const raw = encodeSetup(v);
      // App.tsx reads via URLSearchParams.get: '+' would decode to space
      // and break atob, so payloads must avoid raw '+'/'/'.
      expect(raw).not.toMatch(/[+/]/);
      const throughUrl = new URLSearchParams({ setup: raw }).get('setup');
      expect(decodeSetup(throughUrl!)).toEqual(v);
    }
  });

  it('handles unicode payloads via the encodeURIComponent layer', () => {
    const v = { ...DEFAULT_ANSWERS, device: 'тест-устройство' };
    const raw = encodeSetup(v);
    const throughUrl = new URLSearchParams({ setup: raw }).get('setup');
    expect(decodeSetup(throughUrl!)).toEqual(v);
  });
});
