// Device tier hints used by the Device Profile module to suggest a
// reasonable starting point for graphics + sensitivity baseline.

export type DeviceTier = 'low' | 'mid' | 'high' | 'flagship';
export type RefreshRate = 60 | 90 | 120 | 144;

export interface DeviceProfile {
  tier: DeviceTier;
  refreshRate: RefreshRate;
  graphicsPreset: 'Smooth' | 'Balanced' | 'HD' | 'HDR' | 'UHD';
  graphicsFps: 'Low' | 'Medium' | 'High' | 'Ultra' | 'Extreme' | 'Ultra Extreme' | '90 FPS' | '120 FPS';
  styleAdvice: string;
  recommendedPresetId: string;
}

export interface DeviceModel {
  id: string;
  name: string;
  tier: DeviceTier;
  maxRefreshRate: RefreshRate;
}

export const DEVICE_MODELS: DeviceModel[] = [
  // Flagships
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro / 16 Pro', tier: 'flagship', maxRefreshRate: 120 },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro / 13 Pro', tier: 'flagship', maxRefreshRate: 120 },
  { id: 'rog-phone-8', name: 'ASUS ROG Phone 7 / 8', tier: 'flagship', maxRefreshRate: 144 },
  { id: 'red-magic', name: 'RedMagic 8 / 9', tier: 'flagship', maxRefreshRate: 144 },
  { id: 's24-ultra', name: 'Samsung Galaxy S23 / S24 Ultra', tier: 'flagship', maxRefreshRate: 120 },
  { id: 'pixel-9-pro', name: 'Google Pixel 8 / 9 Pro', tier: 'flagship', maxRefreshRate: 120 },

  // High
  { id: 'iphone-13', name: 'iPhone 13 / 14 / 15', tier: 'high', maxRefreshRate: 60 },
  { id: 's23', name: 'Samsung Galaxy S22 / S23', tier: 'high', maxRefreshRate: 120 },
  { id: 'oneplus-12', name: 'OnePlus 11 / 12', tier: 'high', maxRefreshRate: 120 },
  { id: 'xiaomi-13', name: 'Xiaomi 13 / 14', tier: 'high', maxRefreshRate: 120 },

  // Mid
  { id: 'iphone-11', name: 'iPhone 11 / XR', tier: 'mid', maxRefreshRate: 60 },
  { id: 'a54', name: 'Samsung Galaxy A54 / A55', tier: 'mid', maxRefreshRate: 120 },
  { id: 'redmi-note-13', name: 'Xiaomi Redmi Note 12 / 13', tier: 'mid', maxRefreshRate: 120 },
  { id: 'poco-x6', name: 'POCO X5 / X6', tier: 'mid', maxRefreshRate: 120 },
  { id: 'nothing-phone-2', name: 'Nothing Phone 1 / 2', tier: 'mid', maxRefreshRate: 120 },

  // Low
  { id: 'iphone-se', name: 'iPhone SE 2nd / 3rd gen', tier: 'low', maxRefreshRate: 60 },
  { id: 'a15', name: 'Samsung Galaxy A12 / A14 / A15', tier: 'low', maxRefreshRate: 90 },
  { id: 'redmi-9', name: 'Xiaomi Redmi 9 / 10', tier: 'low', maxRefreshRate: 60 },
];

// Per-device override map. Lets us recommend a tuned preset that has every
// scope filled in (camera + ADS + gyro), so users on flagship iPhones don't
// land on a "Full Gyro" preset where every ADS field is 0 and the UI looks
// broken to a non-gyro player.
const DEVICE_PRESET_OVERRIDES: Record<string, string> = {
  'iphone-15-pro': 'iphone_pro_120',
  'iphone-14-pro': 'iphone_pro_120',
  'iphone-13': 'iphone_60_stable',
  's24-ultra': 'samsung_ultra_claw',
  's23': 'samsung_ultra_claw',
  'oneplus-12': 'oneplus_xiaomi_pro',
  'xiaomi-13': 'oneplus_xiaomi_pro',
  'pixel-9-pro': 'iphone_pro_120',
  'rog-phone-8': 'rog_redmagic_tournament',
  'red-magic': 'rog_redmagic_tournament',
  'a54': 'mid_range_stable',
  'redmi-note-13': 'mid_range_stable',
  'poco-x6': 'mid_range_stable',
  'nothing-phone-2': 'mid_range_stable',
  'iphone-11': 'iphone_60_stable',
};

export function recommendForDevice(
  d: DeviceModel,
  refreshRate: RefreshRate = d.maxRefreshRate,
): DeviceProfile {
  const r = (Math.min(refreshRate, d.maxRefreshRate) || 60) as RefreshRate;
  const overridePreset = DEVICE_PRESET_OVERRIDES[d.id];
  switch (d.tier) {
    case 'flagship':
      return {
        tier: d.tier,
        refreshRate: r,
        graphicsPreset: 'HDR',
        graphicsFps: r >= 120 ? '120 FPS' : r >= 90 ? '90 FPS' : 'Extreme',
        styleAdvice:
          'Можно играть в любом стиле. Включай 120/90 FPS. Гироскоп — без потерь.',
        recommendedPresetId: overridePreset ?? 'iphone_pro_120',
      };
    case 'high':
      return {
        tier: d.tier,
        refreshRate: r,
        graphicsPreset: 'HD',
        graphicsFps: r >= 90 ? '90 FPS' : 'Extreme',
        styleAdvice:
          'Можно claw / 4-finger. 90+ FPS включай — снизит touch latency.',
        recommendedPresetId: overridePreset ?? 'mixed_hybrid',
      };
    case 'mid':
      return {
        tier: d.tier,
        refreshRate: r,
        graphicsPreset: 'Smooth',
        graphicsFps: r >= 90 ? '90 FPS' : 'Ultra',
        styleAdvice:
          'Smooth + Ultra/90 FPS. Если есть троттлинг, ставь Smooth + High и охлаждай корпус.',
        recommendedPresetId: overridePreset ?? 'mid_range_stable',
      };
    case 'low':
      return {
        tier: d.tier,
        refreshRate: r,
        graphicsPreset: 'Smooth',
        graphicsFps: 'High',
        styleAdvice:
          'Только Smooth + High. Гироскоп может фризить — пробуй no-gyro пресет.',
        recommendedPresetId: overridePreset ?? 'no_gyro_balanced',
      };
  }
}
