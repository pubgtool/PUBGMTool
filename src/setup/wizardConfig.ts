import type {
  WizardAnswers,
  Playstyle,
  GyroMode,
  AdsMode,
  WeaponId,
  ProblemId,
  Hand,
  FpsLevel,
  DeviceTier,
} from './generator';

export type StepId =
  | 'device'
  | 'refresh'
  | 'fps'
  | 'performance'
  | 'playstyle'
  | 'fingers'
  | 'hand'
  | 'gyro'
  | 'ads'
  | 'weapons'
  | 'problems';

export const STEP_ORDER: StepId[] = [
  'device',
  'refresh',
  'fps',
  'performance',
  'playstyle',
  'fingers',
  'hand',
  'gyro',
  'ads',
  'weapons',
  'problems',
];

export interface DeviceOption {
  id: string;
  label: string;
  tier: DeviceTier;
  refresh: 60 | 90 | 120 | 144;
}

// Curated list — covers the bulk of the PUBG Mobile player base.
export const DEVICE_OPTIONS: DeviceOption[] = [
  // iPhone
  { id: 'iphone_15_pro', label: 'iPhone 15 Pro / Pro Max', tier: 'flagship', refresh: 120 },
  { id: 'iphone_14_pro', label: 'iPhone 14 Pro / Pro Max', tier: 'flagship', refresh: 120 },
  { id: 'iphone_13_pro', label: 'iPhone 13 Pro / Pro Max', tier: 'flagship', refresh: 120 },
  { id: 'iphone_15', label: 'iPhone 15 / 15 Plus', tier: 'high', refresh: 60 },
  { id: 'iphone_14', label: 'iPhone 14 / 14 Plus', tier: 'high', refresh: 60 },
  { id: 'iphone_13', label: 'iPhone 13 / 13 Mini', tier: 'high', refresh: 60 },
  { id: 'iphone_12', label: 'iPhone 12 / 12 Mini', tier: 'high', refresh: 60 },
  { id: 'iphone_11', label: 'iPhone 11', tier: 'mid', refresh: 60 },
  { id: 'iphone_xr', label: 'iPhone XR / XS', tier: 'mid', refresh: 60 },
  // Samsung
  { id: 'galaxy_s24_ultra', label: 'Galaxy S24 Ultra', tier: 'flagship', refresh: 120 },
  { id: 'galaxy_s23_ultra', label: 'Galaxy S23 Ultra', tier: 'flagship', refresh: 120 },
  { id: 'galaxy_s22_ultra', label: 'Galaxy S22 Ultra', tier: 'flagship', refresh: 120 },
  { id: 'galaxy_s24', label: 'Galaxy S24 / S23', tier: 'flagship', refresh: 120 },
  { id: 'galaxy_a54', label: 'Galaxy A54 / A53', tier: 'mid', refresh: 120 },
  { id: 'galaxy_a14', label: 'Galaxy A14 / A13', tier: 'low', refresh: 60 },
  // OnePlus
  { id: 'oneplus_12', label: 'OnePlus 12 / 11', tier: 'flagship', refresh: 120 },
  { id: 'oneplus_nord', label: 'OnePlus Nord 3 / 2', tier: 'mid', refresh: 90 },
  // Xiaomi / POCO
  { id: 'xiaomi_14', label: 'Xiaomi 14 / 13 Pro', tier: 'flagship', refresh: 120 },
  { id: 'poco_x6', label: 'POCO X6 / X5 Pro', tier: 'mid', refresh: 120 },
  { id: 'redmi_note', label: 'Redmi Note 13 / 12', tier: 'mid', refresh: 90 },
  { id: 'redmi_a', label: 'Redmi A2 / A1', tier: 'low', refresh: 60 },
  // Gaming phones
  { id: 'rog_phone', label: 'ROG Phone 8 / 7', tier: 'flagship', refresh: 144 },
  { id: 'redmagic', label: 'RedMagic 9 / 8 Pro', tier: 'flagship', refresh: 144 },
  // Catch-alls
  { id: 'pixel_8', label: 'Pixel 8 / 7a', tier: 'high', refresh: 120 },
  { id: 'other_flagship', label: 'Other flagship (Snapdragon 8 Gen 1+)', tier: 'flagship', refresh: 120 },
  { id: 'other_mid', label: 'Other mid-range (Snapdragon 7-series)', tier: 'mid', refresh: 90 },
  { id: 'other_low', label: 'Other entry-level / older device', tier: 'low', refresh: 60 },
];

export const REFRESH_OPTIONS: { value: 60 | 90 | 120 | 144; labelKey: string }[] = [
  { value: 60, labelKey: 'wizard.refresh.60' },
  { value: 90, labelKey: 'wizard.refresh.90' },
  { value: 120, labelKey: 'wizard.refresh.120' },
  { value: 144, labelKey: 'wizard.refresh.144' },
];

export const FPS_OPTIONS: { value: FpsLevel; labelKey: string; descKey: string }[] = [
  { value: 'smooth', labelKey: 'wizard.fps.smooth.label', descKey: 'wizard.fps.smooth.desc' },
  { value: 'balanced', labelKey: 'wizard.fps.balanced.label', descKey: 'wizard.fps.balanced.desc' },
  { value: 'hd', labelKey: 'wizard.fps.hd.label', descKey: 'wizard.fps.hd.desc' },
  { value: 'hdr', labelKey: 'wizard.fps.hdr.label', descKey: 'wizard.fps.hdr.desc' },
  { value: 'ultra', labelKey: 'wizard.fps.ultra.label', descKey: 'wizard.fps.ultra.desc' },
  { value: 'extreme', labelKey: 'wizard.fps.extreme.label', descKey: 'wizard.fps.extreme.desc' },
  { value: 'ultra_extreme', labelKey: 'wizard.fps.ultra_extreme.label', descKey: 'wizard.fps.ultra_extreme.desc' },
];

export const PERF_OPTIONS: { value: DeviceTier; labelKey: string; descKey: string }[] = [
  { value: 'low', labelKey: 'wizard.perf.low.label', descKey: 'wizard.perf.low.desc' },
  { value: 'mid', labelKey: 'wizard.perf.mid.label', descKey: 'wizard.perf.mid.desc' },
  { value: 'high', labelKey: 'wizard.perf.high.label', descKey: 'wizard.perf.high.desc' },
  { value: 'flagship', labelKey: 'wizard.perf.flagship.label', descKey: 'wizard.perf.flagship.desc' },
];

export const PLAYSTYLE_OPTIONS: { value: Playstyle; labelKey: string; descKey: string }[] = [
  { value: 'rusher', labelKey: 'wizard.style.rusher.label', descKey: 'wizard.style.rusher.desc' },
  { value: 'tdm_aggressive', labelKey: 'wizard.style.tdm.label', descKey: 'wizard.style.tdm.desc' },
  { value: 'balanced', labelKey: 'wizard.style.balanced.label', descKey: 'wizard.style.balanced.desc' },
  { value: 'sniper', labelKey: 'wizard.style.sniper.label', descKey: 'wizard.style.sniper.desc' },
  { value: 'camper', labelKey: 'wizard.style.camper.label', descKey: 'wizard.style.camper.desc' },
  { value: 'igl', labelKey: 'wizard.style.igl.label', descKey: 'wizard.style.igl.desc' },
];

export const FINGERS_OPTIONS: { value: 2 | 3 | 4 | 5 | 6; labelKey: string; descKey: string }[] = [
  { value: 2, labelKey: 'wizard.fingers.2.label', descKey: 'wizard.fingers.2.desc' },
  { value: 3, labelKey: 'wizard.fingers.3.label', descKey: 'wizard.fingers.3.desc' },
  { value: 4, labelKey: 'wizard.fingers.4.label', descKey: 'wizard.fingers.4.desc' },
  { value: 5, labelKey: 'wizard.fingers.5.label', descKey: 'wizard.fingers.5.desc' },
  { value: 6, labelKey: 'wizard.fingers.6.label', descKey: 'wizard.fingers.6.desc' },
];

export const HAND_OPTIONS: { value: Hand; labelKey: string }[] = [
  { value: 'right', labelKey: 'wizard.hand.right' },
  { value: 'left', labelKey: 'wizard.hand.left' },
  { value: 'claw', labelKey: 'wizard.hand.claw' },
];

export const GYRO_OPTIONS: { value: GyroMode; labelKey: string; descKey: string }[] = [
  { value: 'always_on', labelKey: 'wizard.gyro.always.label', descKey: 'wizard.gyro.always.desc' },
  { value: 'scope_on', labelKey: 'wizard.gyro.scope.label', descKey: 'wizard.gyro.scope.desc' },
  { value: 'off', labelKey: 'wizard.gyro.off.label', descKey: 'wizard.gyro.off.desc' },
];

export const ADS_OPTIONS: { value: AdsMode; labelKey: string; descKey: string }[] = [
  { value: 'hold', labelKey: 'wizard.ads.hold.label', descKey: 'wizard.ads.hold.desc' },
  { value: 'toggle', labelKey: 'wizard.ads.toggle.label', descKey: 'wizard.ads.toggle.desc' },
];

export const WEAPON_OPTIONS: { value: WeaponId; label: string; cat: 'AR' | 'DMR' | 'Sniper' | 'SMG' | 'Shotgun' }[] = [
  { value: 'akm', label: 'AKM', cat: 'AR' },
  { value: 'm416', label: 'M416', cat: 'AR' },
  { value: 'm762', label: 'M762 Beryl', cat: 'AR' },
  { value: 'aug', label: 'AUG A3', cat: 'AR' },
  { value: 'groza', label: 'Groza', cat: 'AR' },
  { value: 'sks', label: 'SKS', cat: 'DMR' },
  { value: 'mini14', label: 'Mini14', cat: 'DMR' },
  { value: 'slr', label: 'SLR', cat: 'DMR' },
  { value: 'mk14', label: 'Mk14 EBR', cat: 'DMR' },
  { value: 'kar98', label: 'Kar98K', cat: 'Sniper' },
  { value: 'm24', label: 'M24', cat: 'Sniper' },
  { value: 'awm', label: 'AWM', cat: 'Sniper' },
  { value: 'ump45', label: 'UMP45', cat: 'SMG' },
  { value: 'uzi', label: 'Micro UZI', cat: 'SMG' },
  { value: 'vector', label: 'Vector', cat: 'SMG' },
  { value: 'mp5k', label: 'MP5K', cat: 'SMG' },
  { value: 'dbs', label: 'DBS', cat: 'Shotgun' },
  { value: 's1897', label: 'S1897', cat: 'Shotgun' },
];

export const PROBLEM_OPTIONS: { value: ProblemId; labelKey: string }[] = [
  { value: 'overflick', labelKey: 'wizard.problems.overflick' },
  { value: 'underflick', labelKey: 'wizard.problems.underflick' },
  { value: 'recoil_rises', labelKey: 'wizard.problems.recoil_rises' },
  { value: 'recoil_horizontal', labelKey: 'wizard.problems.recoil_horizontal' },
  { value: 'gyro_shakes', labelKey: 'wizard.problems.gyro_shakes' },
  { value: 'gyro_dead_in_ads', labelKey: 'wizard.problems.gyro_dead_in_ads' },
  { value: 'cant_tap_fire_scope', labelKey: 'wizard.problems.cant_tap_fire_scope' },
  { value: 'finger_drift', labelKey: 'wizard.problems.finger_drift' },
  { value: 'low_fps', labelKey: 'wizard.problems.low_fps' },
  { value: 'cant_close_range', labelKey: 'wizard.problems.cant_close_range' },
  { value: 'cant_long_range', labelKey: 'wizard.problems.cant_long_range' },
  { value: 'audio_unclear', labelKey: 'wizard.problems.audio_unclear' },
];

// Default starting answers used by Wizard before user makes choices.
export const DEFAULT_ANSWERS: WizardAnswers = {
  device: 'iphone_13_pro',
  tier: 'flagship',
  fps: 'extreme',
  refresh: 120,
  playstyle: 'balanced',
  fingers: 4,
  hand: 'claw',
  gyroMode: 'always_on',
  adsMode: 'hold',
  weapons: ['m416'],
  problems: [],
};
