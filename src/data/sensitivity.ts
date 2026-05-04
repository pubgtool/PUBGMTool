// Sensitivity baseline data for PUBG Mobile. Values are 0–300 (game scale).
// These are starting points only; final settings should be tuned individually.

export type ScopeKey =
  | 'tppNoScope'
  | 'fppNoScope'
  | 'redDot'
  | 'x2'
  | 'x3'
  | 'x4'
  | 'x6'
  | 'x8';

export const SCOPES: { key: ScopeKey; label: string }[] = [
  { key: 'tppNoScope', label: 'TPP No Scope' },
  { key: 'fppNoScope', label: 'FPP No Scope' },
  { key: 'redDot', label: 'Red Dot / Holo / Aim Assist' },
  { key: 'x2', label: '2x Scope' },
  { key: 'x3', label: '3x Scope' },
  { key: 'x4', label: '4x Scope, VSS' },
  { key: 'x6', label: '6x Scope' },
  { key: 'x8', label: '8x Scope' },
];

export type Channel = 'camera' | 'ads' | 'gyro';

export const CHANNELS: { key: Channel; descriptionKey: string }[] = [
  { key: 'camera', descriptionKey: 'sensitivity.channel.camera.desc' },
  { key: 'ads', descriptionKey: 'sensitivity.channel.ads.desc' },
  { key: 'gyro', descriptionKey: 'sensitivity.channel.gyro.desc' },
];

export type Sensitivity = Record<Channel, Record<ScopeKey, number>>;

export interface SensitivityPreset {
  id: string;
  name: string;
  /** Translation key for the description shown in UI. */
  descriptionKey: string;
  values: Sensitivity;
  /** Recommended for these play styles. */
  tags: ('thumb' | 'claw' | 'fourFinger' | 'sixFinger' | 'gyro' | 'noGyro')[];
}

const z: Record<ScopeKey, number> = {
  tppNoScope: 0,
  fppNoScope: 0,
  redDot: 0,
  x2: 0,
  x3: 0,
  x4: 0,
  x6: 0,
  x8: 0,
};

export const SENSITIVITY_PRESETS: SensitivityPreset[] = [
  {
    id: 'no_gyro_balanced',
    name: 'No Gyro · Balanced',
    descriptionKey: 'sensitivity.preset.no_gyro_balanced.desc',
    tags: ['noGyro', 'thumb', 'claw'],
    values: {
      camera: { ...z, tppNoScope: 110, fppNoScope: 95, redDot: 60, x2: 45, x3: 30, x4: 26, x6: 18, x8: 14 },
      ads:    { ...z, tppNoScope: 0,   fppNoScope: 0,  redDot: 50, x2: 35, x3: 28, x4: 22, x6: 14, x8: 10 },
      gyro:   { ...z },
    },
  },
  {
    id: 'full_gyro_aggressive',
    name: 'Full Gyro · Aggressive',
    descriptionKey: 'sensitivity.preset.full_gyro_aggressive.desc',
    tags: ['gyro', 'fourFinger', 'sixFinger', 'claw'],
    values: {
      camera: { ...z, tppNoScope: 200, fppNoScope: 160, redDot: 30, x2: 25, x3: 18, x4: 14, x6: 10, x8: 8 },
      ads:    { ...z, tppNoScope: 0,   fppNoScope: 0,  redDot: 0,  x2: 0,  x3: 0,  x4: 0,  x6: 0,  x8: 0 },
      gyro:   { ...z, tppNoScope: 300, fppNoScope: 300, redDot: 300, x2: 300, x3: 300, x4: 250, x6: 200, x8: 150 },
    },
  },
  {
    id: 'full_gyro_long',
    name: 'Full Gyro · Long Range',
    descriptionKey: 'sensitivity.preset.full_gyro_long.desc',
    tags: ['gyro', 'fourFinger', 'sixFinger', 'claw'],
    values: {
      camera: { ...z, tppNoScope: 180, fppNoScope: 150, redDot: 35, x2: 25, x3: 20, x4: 14, x6: 10, x8: 8 },
      ads:    { ...z, tppNoScope: 0,   fppNoScope: 0,  redDot: 0,  x2: 0,  x3: 0,  x4: 0,  x6: 0,  x8: 0 },
      gyro:   { ...z, tppNoScope: 300, fppNoScope: 300, redDot: 300, x2: 280, x3: 250, x4: 220, x6: 180, x8: 130 },
    },
  },
  {
    id: 'thumb_close',
    name: 'Thumb · Close Range',
    descriptionKey: 'sensitivity.preset.thumb_close.desc',
    tags: ['thumb', 'noGyro'],
    values: {
      camera: { ...z, tppNoScope: 120, fppNoScope: 105, redDot: 70, x2: 55, x3: 40, x4: 30, x6: 22, x8: 16 },
      ads:    { ...z, tppNoScope: 0,   fppNoScope: 0,  redDot: 70, x2: 55, x3: 40, x4: 28, x6: 18, x8: 12 },
      gyro:   { ...z },
    },
  },
  {
    id: 'mixed_hybrid',
    name: 'Hybrid · Gyro + ADS',
    descriptionKey: 'sensitivity.preset.mixed_hybrid.desc',
    tags: ['gyro', 'thumb', 'claw'],
    values: {
      camera: { ...z, tppNoScope: 150, fppNoScope: 130, redDot: 50, x2: 40, x3: 28, x4: 22, x6: 16, x8: 12 },
      ads:    { ...z, tppNoScope: 0,   fppNoScope: 0,  redDot: 50, x2: 40, x3: 28, x4: 0,  x6: 0,  x8: 0 },
      gyro:   { ...z, tppNoScope: 200, fppNoScope: 200, redDot: 200, x2: 220, x3: 240, x4: 220, x6: 180, x8: 130 },
    },
  },
  // ─── Device-tuned presets ────────────────────────────────────────────────
  // Below presets keep ALL three channels populated so users on any device
  // see usable numbers at a glance instead of empty (0) ADS or gyro fields.
  {
    id: 'iphone_pro_120',
    name: 'iPhone 13/14/15 Pro · 120Hz',
    descriptionKey: 'sensitivity.preset.iphone_pro_120.desc',
    tags: ['gyro', 'claw', 'thumb'],
    values: {
      camera: { ...z, tppNoScope: 200, fppNoScope: 175, redDot: 75, x2: 60, x3: 38, x4: 30, x6: 22, x8: 18 },
      ads:    { ...z, tppNoScope: 110, fppNoScope: 100, redDot: 60, x2: 50, x3: 40, x4: 30, x6: 20, x8: 15 },
      gyro:   { ...z, tppNoScope: 300, fppNoScope: 300, redDot: 300, x2: 300, x3: 300, x4: 300, x6: 250, x8: 200 },
    },
  },
  {
    id: 'iphone_60_stable',
    name: 'iPhone 13/14/15 · 60Hz Stable',
    descriptionKey: 'sensitivity.preset.iphone_60_stable.desc',
    tags: ['thumb', 'noGyro'],
    values: {
      camera: { ...z, tppNoScope: 165, fppNoScope: 145, redDot: 65, x2: 50, x3: 32, x4: 25, x6: 20, x8: 15 },
      ads:    { ...z, tppNoScope: 95,  fppNoScope: 85,  redDot: 60, x2: 50, x3: 38, x4: 28, x6: 18, x8: 14 },
      gyro:   { ...z, tppNoScope: 260, fppNoScope: 260, redDot: 260, x2: 260, x3: 240, x4: 220, x6: 180, x8: 130 },
    },
  },
  {
    id: 'samsung_ultra_claw',
    name: 'Samsung Galaxy S Ultra · Claw',
    descriptionKey: 'sensitivity.preset.samsung_ultra_claw.desc',
    tags: ['claw', 'fourFinger', 'gyro'],
    values: {
      camera: { ...z, tppNoScope: 195, fppNoScope: 170, redDot: 60, x2: 50, x3: 35, x4: 28, x6: 20, x8: 15 },
      ads:    { ...z, tppNoScope: 100, fppNoScope: 90,  redDot: 55, x2: 45, x3: 35, x4: 25, x6: 16, x8: 12 },
      gyro:   { ...z, tppNoScope: 300, fppNoScope: 300, redDot: 300, x2: 300, x3: 300, x4: 280, x6: 220, x8: 170 },
    },
  },
  {
    id: 'oneplus_xiaomi_pro',
    name: 'OnePlus / Xiaomi · Full Gyro Pro',
    descriptionKey: 'sensitivity.preset.oneplus_xiaomi_pro.desc',
    tags: ['gyro', 'fourFinger', 'sixFinger'],
    values: {
      camera: { ...z, tppNoScope: 220, fppNoScope: 180, redDot: 50, x2: 40, x3: 28, x4: 22, x6: 16, x8: 12 },
      ads:    { ...z, tppNoScope: 0,   fppNoScope: 0,   redDot: 30, x2: 25, x3: 20, x4: 15, x6: 10, x8: 8 },
      gyro:   { ...z, tppNoScope: 300, fppNoScope: 300, redDot: 300, x2: 300, x3: 300, x4: 300, x6: 280, x8: 200 },
    },
  },
  {
    id: 'rog_redmagic_tournament',
    name: 'ROG / RedMagic · 144Hz Tournament',
    descriptionKey: 'sensitivity.preset.rog_redmagic_tournament.desc',
    tags: ['gyro', 'sixFinger', 'fourFinger', 'claw'],
    values: {
      camera: { ...z, tppNoScope: 230, fppNoScope: 200, redDot: 50, x2: 40, x3: 28, x4: 22, x6: 16, x8: 12 },
      ads:    { ...z, tppNoScope: 100, fppNoScope: 90,  redDot: 60, x2: 50, x3: 40, x4: 30, x6: 22, x8: 16 },
      gyro:   { ...z, tppNoScope: 300, fppNoScope: 300, redDot: 300, x2: 300, x3: 300, x4: 300, x6: 300, x8: 250 },
    },
  },
  {
    id: 'mid_range_stable',
    name: 'Mid-range · Stable Hybrid',
    descriptionKey: 'sensitivity.preset.mid_range_stable.desc',
    tags: ['thumb', 'claw', 'gyro'],
    values: {
      camera: { ...z, tppNoScope: 140, fppNoScope: 120, redDot: 55, x2: 40, x3: 28, x4: 22, x6: 16, x8: 12 },
      ads:    { ...z, tppNoScope: 80,  fppNoScope: 75,  redDot: 50, x2: 40, x3: 30, x4: 22, x6: 14, x8: 10 },
      gyro:   { ...z, tppNoScope: 200, fppNoScope: 200, redDot: 200, x2: 220, x3: 220, x4: 200, x6: 160, x8: 120 },
    },
  },
];

export function emptySensitivity(): Sensitivity {
  return { camera: { ...z }, ads: { ...z }, gyro: { ...z } };
}

export function clonePreset(p: SensitivityPreset): Sensitivity {
  return {
    camera: { ...p.values.camera },
    ads: { ...p.values.ads },
    gyro: { ...p.values.gyro },
  };
}
