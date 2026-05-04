// PUBGM Setup Generator
//
// Given the user's wizard answers, produce a complete starting setup:
// - Sensitivity (camera / ADS / gyro per scope)
// - Graphics
// - HUD layout suggestion
// - Controls checklist
// - Problem-fix hints
// - Recommended weapons
// - 10-minute training drill
// - Setup score
//
// The numbers below are starting points for muscle memory and copy-paste
// into PUBG Mobile. The user always retunes ±5 after a week.

import type { ScopeKey, Sensitivity } from '../data/sensitivity';

// ── Wizard answer types ────────────────────────────────────────────────

export type DeviceTier = 'low' | 'mid' | 'high' | 'flagship';

export type FpsLevel =
  | 'smooth' // 30 fps
  | 'balanced' // 40 fps
  | 'hd' // 60 fps
  | 'hdr' // 60 fps (better visuals)
  | 'ultra' // 90 fps
  | 'extreme' // 120 fps
  | 'ultra_extreme'; // 120 fps Pro+

export type RefreshRate = 60 | 90 | 120 | 144;

export type Playstyle =
  | 'rusher' // close range, fast tempo
  | 'tdm_aggressive' // tdm/payload meta
  | 'balanced' // mid-range all-rounder
  | 'sniper' // long range
  | 'camper' // late-game/zone control
  | 'igl'; // squad caller, supportive

export type Fingers = 2 | 3 | 4 | 5 | 6;

export type Hand = 'right' | 'left' | 'claw';

export type GyroMode = 'always_on' | 'scope_on' | 'off';

export type AdsMode = 'hold' | 'toggle';

export type WeaponId =
  | 'akm'
  | 'm416'
  | 'm762'
  | 'aug'
  | 'groza'
  | 'ump45'
  | 'uzi'
  | 'vector'
  | 'mp5k'
  | 'sks'
  | 'mini14'
  | 'slr'
  | 'mk14'
  | 'kar98'
  | 'm24'
  | 'awm'
  | 'dbs'
  | 's1897';

export type ProblemId =
  | 'overflick' // I overshoot the target on flicks
  | 'underflick' // I undershoot the target on flicks
  | 'recoil_rises' // can't control vertical recoil
  | 'recoil_horizontal' // gun pulls left/right
  | 'gyro_shakes' // gyro is too jittery
  | 'gyro_dead_in_ads' // gyro doesn't fire while ADS
  | 'cant_tap_fire_scope' // taps to scope but it doesn't open fast enough
  | 'finger_drift' // fire button drifts under finger
  | 'low_fps' // fps drops in fights
  | 'cant_close_range' // hip-fire is bad
  | 'cant_long_range' // 6x/8x feels off
  | 'audio_unclear'; // can't tell footstep direction

export interface WizardAnswers {
  device: string;
  tier: DeviceTier;
  fps: FpsLevel;
  refresh: RefreshRate;
  playstyle: Playstyle;
  fingers: Fingers;
  hand: Hand;
  gyroMode: GyroMode;
  adsMode: AdsMode;
  weapons: WeaponId[];
  problems: ProblemId[];
}

// ── Result types ───────────────────────────────────────────────────────

export interface GraphicsSettings {
  quality: 'Smooth' | 'Balanced' | 'HD' | 'HDR' | 'Ultra HDR';
  frameRate:
    | 'High'
    | 'Ultra'
    | 'Extreme'
    | 'Ultra Extreme'
    | '90 FPS'
    | '120 FPS';
  style: 'Classic' | 'Colorful' | 'Realistic' | 'Soft';
  brightness: number; // 0-100
  shadows: 'On' | 'Off';
  antiAliasing: 'On' | 'Off';
  colorblind: 'Off' | 'Deuteranopia' | 'Protanopia' | 'Tritanopia';
}

export interface ControlChecklistItem {
  pathKey: string; // i18n key for "Settings → Basic → ..."
  setting: string; // human label
  recommendedKey: string; // i18n key for the recommended value
  rationaleKey: string;
}

export interface ProblemFix {
  problem: ProblemId;
  fixesKey: string; // i18n key for fix list
}

export interface SetupResult {
  answers: WizardAnswers;
  archetype: 'no_gyro' | 'hybrid' | 'full_gyro' | 'low_end' | 'iphone_120';
  score: number; // 0-100
  scoreBreakdown: { label: string; value: number; max: number }[];
  graphics: GraphicsSettings;
  sensitivity: Sensitivity;
  hudLayout: string; // hud preset id
  controls: ControlChecklistItem[];
  fixes: ProblemFix[];
  weapons: { primary: WeaponId; secondary: WeaponId; rationale: string };
  drill: { step: number; durationMin: number; titleKey: string; bodyKey: string }[];
}

// ── Base presets ───────────────────────────────────────────────────────

const SCOPE_KEYS: ScopeKey[] = [
  'tppNoScope',
  'fppNoScope',
  'redDot',
  'x2',
  'x3',
  'x4',
  'x6',
  'x8',
];

const make = (
  values: Partial<Record<ScopeKey, number>>,
): Record<ScopeKey, number> => {
  const out = {} as Record<ScopeKey, number>;
  for (const k of SCOPE_KEYS) out[k] = values[k] ?? 0;
  return out;
};

const BASE_PRESETS: Record<SetupResult['archetype'], Sensitivity> = {
  no_gyro: {
    camera: make({
      tppNoScope: 120,
      fppNoScope: 105,
      redDot: 70,
      x2: 55,
      x3: 40,
      x4: 30,
      x6: 22,
      x8: 16,
    }),
    ads: make({
      tppNoScope: 100,
      fppNoScope: 90,
      redDot: 65,
      x2: 50,
      x3: 38,
      x4: 28,
      x6: 18,
      x8: 14,
    }),
    gyro: make({}),
  },
  hybrid: {
    camera: make({
      tppNoScope: 175,
      fppNoScope: 150,
      redDot: 60,
      x2: 50,
      x3: 35,
      x4: 28,
      x6: 20,
      x8: 15,
    }),
    ads: make({
      tppNoScope: 95,
      fppNoScope: 85,
      redDot: 55,
      x2: 45,
      x3: 35,
      x4: 25,
      x6: 16,
      x8: 12,
    }),
    gyro: make({
      tppNoScope: 240,
      fppNoScope: 240,
      redDot: 240,
      x2: 250,
      x3: 250,
      x4: 230,
      x6: 180,
      x8: 130,
    }),
  },
  full_gyro: {
    camera: make({
      tppNoScope: 220,
      fppNoScope: 180,
      redDot: 35,
      x2: 28,
      x3: 22,
      x4: 18,
      x6: 12,
      x8: 9,
    }),
    ads: make({
      tppNoScope: 0,
      fppNoScope: 0,
      redDot: 0,
      x2: 0,
      x3: 0,
      x4: 0,
      x6: 0,
      x8: 0,
    }),
    gyro: make({
      tppNoScope: 300,
      fppNoScope: 300,
      redDot: 300,
      x2: 300,
      x3: 300,
      x4: 300,
      x6: 250,
      x8: 200,
    }),
  },
  low_end: {
    camera: make({
      tppNoScope: 110,
      fppNoScope: 95,
      redDot: 55,
      x2: 45,
      x3: 32,
      x4: 25,
      x6: 18,
      x8: 14,
    }),
    ads: make({
      tppNoScope: 85,
      fppNoScope: 75,
      redDot: 50,
      x2: 40,
      x3: 30,
      x4: 22,
      x6: 14,
      x8: 10,
    }),
    gyro: make({}),
  },
  iphone_120: {
    camera: make({
      tppNoScope: 200,
      fppNoScope: 175,
      redDot: 75,
      x2: 60,
      x3: 38,
      x4: 30,
      x6: 22,
      x8: 18,
    }),
    ads: make({
      tppNoScope: 110,
      fppNoScope: 100,
      redDot: 60,
      x2: 50,
      x3: 40,
      x4: 30,
      x6: 20,
      x8: 15,
    }),
    gyro: make({
      tppNoScope: 300,
      fppNoScope: 300,
      redDot: 300,
      x2: 300,
      x3: 300,
      x4: 300,
      x6: 250,
      x8: 200,
    }),
  },
};

// ── Archetype picker ───────────────────────────────────────────────────

function pickArchetype(a: WizardAnswers): SetupResult['archetype'] {
  // Low-end devices need the conservative preset regardless of style.
  if (a.tier === 'low' || a.fps === 'smooth' || a.fps === 'balanced') {
    return 'low_end';
  }
  // iPhone Pro 120Hz gets a dedicated preset that already includes ADS.
  // Device IDs are like `iphone_13_pro`, `iphone_15_pro` — match those.
  if (a.refresh >= 120 && /iphone[_\s]*1[3-9][_\s]*pro/i.test(a.device)) {
    return 'iphone_120';
  }
  if (a.gyroMode === 'off') return 'no_gyro';
  // Pure full-gyro: only when the user has explicitly opted out of ADS
  // by selecting toggle + 6+ fingers (esports style).
  if (a.gyroMode === 'always_on' && a.fingers >= 6 && a.adsMode === 'toggle') {
    return 'full_gyro';
  }
  // Default: hybrid (camera + ADS + gyro) — covers most players who play
  // gyro + ADS together. Result page shows real numbers for all 3 columns.
  return 'hybrid';
}

// ── Modifier rules ─────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 300) {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function applyMultiplier(
  values: Record<ScopeKey, number>,
  mult: Partial<Record<ScopeKey, number>>,
): Record<ScopeKey, number> {
  const out = { ...values };
  for (const k of SCOPE_KEYS) {
    const m = mult[k];
    if (m !== undefined) out[k] = clamp(out[k] * m);
  }
  return out;
}

function applyDelta(
  values: Record<ScopeKey, number>,
  delta: Partial<Record<ScopeKey, number>>,
): Record<ScopeKey, number> {
  const out = { ...values };
  for (const k of SCOPE_KEYS) {
    const d = delta[k];
    if (d !== undefined && out[k] > 0) out[k] = clamp(out[k] + d);
  }
  return out;
}

function applyRules(base: Sensitivity, a: WizardAnswers): Sensitivity {
  let { camera, ads, gyro } = base;
  // Convert to mutable copies
  camera = { ...camera };
  ads = { ...ads };
  gyro = { ...gyro };

  // Rule: Rusher / TDM → faster close-range, slower far-range
  if (a.playstyle === 'rusher' || a.playstyle === 'tdm_aggressive') {
    camera = applyMultiplier(camera, {
      tppNoScope: 1.1,
      fppNoScope: 1.1,
      redDot: 1.15,
      x2: 1.1,
      x6: 0.9,
      x8: 0.85,
    });
    ads = applyMultiplier(ads, {
      redDot: 1.1,
      x2: 1.05,
      x6: 0.85,
      x8: 0.8,
    });
  }

  // Rule: Sniper → lower 6x/8x, higher 4x for tracking
  if (a.playstyle === 'sniper') {
    camera = applyMultiplier(camera, {
      x4: 1.1,
      x6: 0.85,
      x8: 0.75,
    });
    ads = applyMultiplier(ads, { x4: 1.1, x6: 0.8, x8: 0.7 });
    gyro = applyMultiplier(gyro, { x6: 0.9, x8: 0.8 });
  }

  // Rule: Camper / IGL → more stable, slightly lower everywhere
  if (a.playstyle === 'camper' || a.playstyle === 'igl') {
    camera = applyMultiplier(camera, {
      tppNoScope: 0.92,
      fppNoScope: 0.92,
      redDot: 0.95,
    });
  }

  // Rule: vertical recoil problem → higher gyro, lower ADS for control
  if (a.problems.includes('recoil_rises')) {
    gyro = applyDelta(gyro, {
      redDot: +20,
      x2: +20,
      x3: +20,
      x4: +20,
    });
    ads = applyDelta(ads, {
      redDot: -8,
      x2: -8,
      x3: -8,
    });
  }

  // Rule: horizontal recoil problem → lower ads on close range, more
  // gyro stability on long range
  if (a.problems.includes('recoil_horizontal')) {
    ads = applyDelta(ads, { redDot: -10, x2: -8 });
    gyro = applyDelta(gyro, { x4: +10, x6: +10 });
  }

  // Rule: overflick (overshoots) → reduce ALL sens by 8%
  if (a.problems.includes('overflick')) {
    camera = applyMultiplier(camera, {
      tppNoScope: 0.92,
      fppNoScope: 0.92,
      redDot: 0.9,
      x2: 0.9,
      x3: 0.92,
      x4: 0.92,
      x6: 0.92,
      x8: 0.92,
    });
    ads = applyMultiplier(ads, {
      redDot: 0.92,
      x2: 0.92,
      x3: 0.92,
      x4: 0.92,
      x6: 0.92,
      x8: 0.92,
    });
  }

  // Rule: underflick (undershoots) → increase ALL sens by 8%
  if (a.problems.includes('underflick')) {
    camera = applyMultiplier(camera, {
      tppNoScope: 1.08,
      fppNoScope: 1.08,
      redDot: 1.1,
      x2: 1.1,
      x3: 1.08,
      x4: 1.08,
      x6: 1.08,
      x8: 1.08,
    });
    ads = applyMultiplier(ads, {
      redDot: 1.08,
      x2: 1.08,
      x3: 1.08,
      x4: 1.08,
      x6: 1.08,
      x8: 1.08,
    });
  }

  // Rule: gyro shakes → reduce gyro on long range scopes
  if (a.problems.includes('gyro_shakes')) {
    gyro = applyMultiplier(gyro, {
      x4: 0.9,
      x6: 0.85,
      x8: 0.75,
    });
  }

  // Rule: can't long range → boost 6x/8x ADS and gyro
  if (a.problems.includes('cant_long_range')) {
    ads = applyMultiplier(ads, { x6: 1.1, x8: 1.1 });
    gyro = applyMultiplier(gyro, { x6: 1.05, x8: 1.05 });
  }

  // Rule: can't close range → boost hipfire camera + red-dot ADS
  if (a.problems.includes('cant_close_range')) {
    camera = applyMultiplier(camera, {
      tppNoScope: 1.1,
      fppNoScope: 1.1,
      redDot: 1.15,
    });
    ads = applyMultiplier(ads, { redDot: 1.1, x2: 1.05 });
  }

  // Rule: 6 fingers → can be more aggressive on camera (extra digits handle it)
  if (a.fingers >= 6) {
    camera = applyMultiplier(camera, {
      tppNoScope: 1.05,
      fppNoScope: 1.05,
    });
  }
  // Rule: 2 fingers / thumb → calmer
  if (a.fingers <= 2) {
    camera = applyMultiplier(camera, {
      tppNoScope: 0.92,
      fppNoScope: 0.92,
    });
    gyro = applyMultiplier(gyro, {
      tppNoScope: 0.85,
      fppNoScope: 0.85,
      redDot: 0.85,
    });
  }

  // Rule: gyro mode = scope_on → zero out hipfire gyro because it
  // physically won't run there
  if (a.gyroMode === 'scope_on') {
    gyro = { ...gyro, tppNoScope: 0, fppNoScope: 0 };
  }
  if (a.gyroMode === 'off') {
    gyro = make({});
  }

  return { camera, ads, gyro };
}

// ── Graphics ───────────────────────────────────────────────────────────

function pickGraphics(a: WizardAnswers): GraphicsSettings {
  // Frame rate priority over visual quality (visibility wins).
  let quality: GraphicsSettings['quality'] = 'Smooth';
  let frameRate: GraphicsSettings['frameRate'] = 'High';

  if (a.tier === 'low') {
    quality = 'Smooth';
    frameRate = 'Ultra';
  } else if (a.tier === 'mid') {
    quality = 'Balanced';
    frameRate = a.refresh >= 90 ? '90 FPS' : 'Ultra';
  } else if (a.tier === 'high') {
    quality = 'HD';
    frameRate = a.refresh >= 90 ? '90 FPS' : 'Ultra';
  } else if (a.tier === 'flagship') {
    quality = a.fps === 'hdr' || a.fps === 'ultra_extreme' ? 'HDR' : 'HD';
    frameRate = a.refresh >= 120 ? '120 FPS' : '90 FPS';
  }

  return {
    quality,
    frameRate,
    style: 'Colorful',
    brightness: 100,
    shadows: 'Off',
    antiAliasing: 'Off',
    colorblind: 'Deuteranopia',
  };
}

// ── HUD layout pick ────────────────────────────────────────────────────

function pickHud(a: WizardAnswers): string {
  if (a.fingers >= 5) return 'six_finger_pro';
  if (a.fingers === 4) return 'four_finger_claw';
  if (a.fingers === 3) return 'three_finger';
  return 'two_finger_thumb';
}

// ── Controls checklist ─────────────────────────────────────────────────

function buildControls(a: WizardAnswers): ControlChecklistItem[] {
  const list: ControlChecklistItem[] = [];

  if (a.gyroMode !== 'off') {
    list.push({
      pathKey: 'controls.path.gyro',
      setting: 'Gyroscope',
      recommendedKey:
        a.gyroMode === 'always_on'
          ? 'controls.value.gyro_always'
          : 'controls.value.gyro_scope',
      rationaleKey: 'controls.why.gyro',
    });
  }

  list.push({
    pathKey: 'controls.path.fire',
    setting: 'Fire button',
    recommendedKey: 'controls.value.fire_tap',
    rationaleKey: 'controls.why.fire',
  });

  list.push({
    pathKey: 'controls.path.ads',
    setting: 'ADS / Aim Down Sights',
    recommendedKey:
      a.adsMode === 'hold' ? 'controls.value.ads_hold' : 'controls.value.ads_toggle',
    rationaleKey: 'controls.why.ads',
  });

  if (a.tier !== 'low') {
    list.push({
      pathKey: 'controls.path.peek',
      setting: 'Peek & Fire',
      recommendedKey:
        a.gyroMode !== 'off'
          ? 'controls.value.peek_off'
          : 'controls.value.peek_on',
      rationaleKey: 'controls.why.peek',
    });
  }

  list.push({
    pathKey: 'controls.path.aimAssist',
    setting: 'Aim Assist',
    recommendedKey:
      a.playstyle === 'sniper' || a.fingers >= 5
        ? 'controls.value.aim_assist_off'
        : 'controls.value.aim_assist_on',
    rationaleKey: 'controls.why.aimAssist',
  });

  if (/iphone/i.test(a.device)) {
    list.push({
      pathKey: 'controls.path.touch3d',
      setting: '3D Touch',
      recommendedKey: 'controls.value.touch3d_off',
      rationaleKey: 'controls.why.touch3d',
    });
  }

  list.push({
    pathKey: 'controls.path.haptic',
    setting: 'Haptic Feedback',
    recommendedKey: 'controls.value.haptic_off',
    rationaleKey: 'controls.why.haptic',
  });

  return list;
}

// ── Problem fixes ──────────────────────────────────────────────────────

function buildFixes(a: WizardAnswers): ProblemFix[] {
  return a.problems.map((p) => ({
    problem: p,
    fixesKey: `fixes.${p}`,
  }));
}

// ── Recommended weapons ────────────────────────────────────────────────

function pickWeapons(a: WizardAnswers): SetupResult['weapons'] {
  // Honor user's main weapons; pick first as primary.
  const primary: WeaponId =
    a.weapons[0] ??
    (a.playstyle === 'sniper'
      ? 'kar98'
      : a.playstyle === 'rusher'
        ? 'm416'
        : 'akm');

  // Secondary picked to complement the primary.
  let secondary: WeaponId;
  if (primary === 'kar98' || primary === 'awm' || primary === 'm24') {
    secondary = 'm416'; // sniper + AR
  } else if (primary === 'akm' || primary === 'm762' || primary === 'groza') {
    secondary = 'mini14'; // hard AR + DMR
  } else if (primary === 'm416' || primary === 'aug') {
    secondary = 'kar98'; // utility AR + sniper
  } else if (primary === 'ump45' || primary === 'mp5k') {
    secondary = 'sks'; // SMG + DMR
  } else {
    secondary = 'kar98';
  }

  return {
    primary,
    secondary,
    rationale: `Primary ${primary.toUpperCase()} pairs with ${secondary.toUpperCase()} for ${a.playstyle.replace(
      '_',
      ' ',
    )} play across short and long range.`,
  };
}

// ── Drill ──────────────────────────────────────────────────────────────

function buildDrill(): SetupResult['drill'] {
  return [
    {
      step: 1,
      durationMin: 2,
      titleKey: 'drill.1.title',
      bodyKey: 'drill.1.body',
    },
    {
      step: 2,
      durationMin: 2,
      titleKey: 'drill.2.title',
      bodyKey: 'drill.2.body',
    },
    {
      step: 3,
      durationMin: 2,
      titleKey: 'drill.3.title',
      bodyKey: 'drill.3.body',
    },
    {
      step: 4,
      durationMin: 2,
      titleKey: 'drill.4.title',
      bodyKey: 'drill.4.body',
    },
    {
      step: 5,
      durationMin: 2,
      titleKey: 'drill.5.title',
      bodyKey: 'drill.5.body',
    },
  ];
}

// ── Score ──────────────────────────────────────────────────────────────

function calcScore(
  a: WizardAnswers,
  archetype: SetupResult['archetype'],
): { total: number; breakdown: { label: string; value: number; max: number }[] } {
  const breakdown: { label: string; value: number; max: number }[] = [];

  // Device tier (0-25)
  const tierMap = { low: 12, mid: 18, high: 22, flagship: 25 };
  breakdown.push({
    label: 'score.device',
    value: tierMap[a.tier],
    max: 25,
  });

  // Refresh rate (0-15)
  const refreshScore =
    a.refresh >= 144 ? 15 : a.refresh >= 120 ? 13 : a.refresh >= 90 ? 10 : 6;
  breakdown.push({ label: 'score.refresh', value: refreshScore, max: 15 });

  // Fingers (0-15)
  const fingersScore =
    a.fingers >= 6 ? 15 : a.fingers >= 4 ? 12 : a.fingers >= 3 ? 9 : 5;
  breakdown.push({ label: 'score.fingers', value: fingersScore, max: 15 });

  // Gyro on (0-15)
  const gyroScore =
    a.gyroMode === 'always_on' ? 15 : a.gyroMode === 'scope_on' ? 8 : 4;
  breakdown.push({ label: 'score.gyro', value: gyroScore, max: 15 });

  // ADS hold (0-10)
  breakdown.push({
    label: 'score.ads',
    value: a.adsMode === 'hold' ? 10 : 5,
    max: 10,
  });

  // Setup synergy (0-10) — does archetype match preferences
  let synergy = 8;
  if (archetype === 'low_end' && a.playstyle === 'rusher') synergy = 5;
  if (archetype === 'no_gyro' && a.fingers >= 4) synergy = 6;
  if (archetype === 'full_gyro' && a.fingers <= 2) synergy = 4;
  breakdown.push({ label: 'score.synergy', value: synergy, max: 10 });

  // Problems penalty (0-10)
  const problemPenalty = Math.min(10, a.problems.length * 2);
  breakdown.push({
    label: 'score.problems',
    value: 10 - problemPenalty,
    max: 10,
  });

  const total = breakdown.reduce((s, b) => s + b.value, 0);
  return { total, breakdown };
}

// ── Main entry ─────────────────────────────────────────────────────────

export function generateSetup(answers: WizardAnswers): SetupResult {
  const archetype = pickArchetype(answers);
  const base = BASE_PRESETS[archetype];
  const sensitivity = applyRules(base, answers);
  const graphics = pickGraphics(answers);
  const hudLayout = pickHud(answers);
  const controls = buildControls(answers);
  const fixes = buildFixes(answers);
  const weapons = pickWeapons(answers);
  const drill = buildDrill();
  const { total, breakdown } = calcScore(answers, archetype);

  return {
    answers,
    archetype,
    score: total,
    scoreBreakdown: breakdown,
    graphics,
    sensitivity,
    hudLayout,
    controls,
    fixes,
    weapons,
    drill,
  };
}
