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

export const CHANNELS: { key: Channel; label: string; description: string }[] = [
  { key: 'camera', label: 'Camera (Free Look)', description: 'How fast the camera turns when you swipe with no scope open.' },
  { key: 'ads', label: 'ADS (Aim Down Sights)', description: 'How fast you turn while holding any scope.' },
  { key: 'gyro', label: 'Gyroscope', description: 'How much the camera moves when you tilt your phone (only if gyro is on).' },
];

export type Sensitivity = Record<Channel, Record<ScopeKey, number>>;

export interface SensitivityPreset {
  id: string;
  name: string;
  /** RU description for context. */
  description: string;
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
    description:
      'Сбалансированный пресет для игры без гироскопа: уверенный close-range и читаемый long-range.',
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
    description:
      'Полный гироскоп, минимум ADS — стрельба контролируется наклонами телефона.',
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
    description:
      'Гироскоп оптимизирован под 4x/6x/8x — стабильный «потяг» отдачи на дистанции.',
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
    description:
      'Игра двумя большими пальцами, упор на close/mid bo за счёт ADS.',
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
    description:
      'Гиро для long range, ADS для close range — компромисс между двумя школами.',
    tags: ['gyro', 'thumb', 'claw'],
    values: {
      camera: { ...z, tppNoScope: 150, fppNoScope: 130, redDot: 50, x2: 40, x3: 28, x4: 22, x6: 16, x8: 12 },
      ads:    { ...z, tppNoScope: 0,   fppNoScope: 0,  redDot: 50, x2: 40, x3: 28, x4: 0,  x6: 0,  x8: 0 },
      gyro:   { ...z, tppNoScope: 200, fppNoScope: 200, redDot: 200, x2: 220, x3: 240, x4: 220, x6: 180, x8: 130 },
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
