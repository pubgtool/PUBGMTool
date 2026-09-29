export type CategoryId = 'visibility' | 'audio' | 'hud' | 'aim' | 'qol';

export interface ProTweak {
  id: string;
  category: CategoryId;
  pathKey: string;
  optionKey: string;
  reasonKey: string;
  warnKey?: string;
}

export const PRO_TWEAK_CATEGORIES: { id: CategoryId; titleKey: string; descKey: string }[] = [
  { id: 'visibility', titleKey: 'pro.cat.visibility', descKey: 'pro.cat.visibility.desc' },
  { id: 'audio', titleKey: 'pro.cat.audio', descKey: 'pro.cat.audio.desc' },
  { id: 'hud', titleKey: 'pro.cat.hud', descKey: 'pro.cat.hud.desc' },
  { id: 'aim', titleKey: 'pro.cat.aim', descKey: 'pro.cat.aim.desc' },
  { id: 'qol', titleKey: 'pro.cat.qol', descKey: 'pro.cat.qol.desc' },
];

export const PRO_TWEAKS: ProTweak[] = [
  // --- Visibility ---
  {
    id: 'graphics_smooth_ultra',
    category: 'visibility',
    pathKey: 'pro.tweak.graphics_smooth_ultra.path',
    optionKey: 'pro.tweak.graphics_smooth_ultra.option',
    reasonKey: 'pro.tweak.graphics_smooth_ultra.reason',
    warnKey: 'pro.tweak.graphics_smooth_ultra.warn',
  },
  {
    id: 'style_colorful',
    category: 'visibility',
    pathKey: 'pro.tweak.style_colorful.path',
    optionKey: 'pro.tweak.style_colorful.option',
    reasonKey: 'pro.tweak.style_colorful.reason',
  },
  {
    id: 'brightness_max',
    category: 'visibility',
    pathKey: 'pro.tweak.brightness_max.path',
    optionKey: 'pro.tweak.brightness_max.option',
    reasonKey: 'pro.tweak.brightness_max.reason',
  },
  {
    id: 'colorblind_mode',
    category: 'visibility',
    pathKey: 'pro.tweak.colorblind_mode.path',
    optionKey: 'pro.tweak.colorblind_mode.option',
    reasonKey: 'pro.tweak.colorblind_mode.reason',
  },
  {
    id: 'shadows_off',
    category: 'visibility',
    pathKey: 'pro.tweak.shadows_off.path',
    optionKey: 'pro.tweak.shadows_off.option',
    reasonKey: 'pro.tweak.shadows_off.reason',
  },

  // --- Audio ---
  {
    id: 'spatial_sound',
    category: 'audio',
    pathKey: 'pro.tweak.spatial_sound.path',
    optionKey: 'pro.tweak.spatial_sound.option',
    reasonKey: 'pro.tweak.spatial_sound.reason',
  },
  {
    id: 'sound_visualizer',
    category: 'audio',
    pathKey: 'pro.tweak.sound_visualizer.path',
    optionKey: 'pro.tweak.sound_visualizer.option',
    reasonKey: 'pro.tweak.sound_visualizer.reason',
  },
  {
    id: 'music_off',
    category: 'audio',
    pathKey: 'pro.tweak.music_off.path',
    optionKey: 'pro.tweak.music_off.option',
    reasonKey: 'pro.tweak.music_off.reason',
  },
  {
    id: 'voice_room_solo',
    category: 'audio',
    pathKey: 'pro.tweak.voice_room_solo.path',
    optionKey: 'pro.tweak.voice_room_solo.option',
    reasonKey: 'pro.tweak.voice_room_solo.reason',
  },

  // --- HUD / Pickup speed ---
  {
    id: 'auto_open_scope',
    category: 'hud',
    pathKey: 'pro.tweak.auto_open_scope.path',
    optionKey: 'pro.tweak.auto_open_scope.option',
    reasonKey: 'pro.tweak.auto_open_scope.reason',
  },
  {
    id: 'wear_when_picked_up',
    category: 'hud',
    pathKey: 'pro.tweak.wear_when_picked_up.path',
    optionKey: 'pro.tweak.wear_when_picked_up.option',
    reasonKey: 'pro.tweak.wear_when_picked_up.reason',
  },
  {
    id: 'mark_items_deathbox',
    category: 'hud',
    pathKey: 'pro.tweak.mark_items_deathbox.path',
    optionKey: 'pro.tweak.mark_items_deathbox.option',
    reasonKey: 'pro.tweak.mark_items_deathbox.reason',
  },
  {
    id: 'quick_marker',
    category: 'hud',
    pathKey: 'pro.tweak.quick_marker.path',
    optionKey: 'pro.tweak.quick_marker.option',
    reasonKey: 'pro.tweak.quick_marker.reason',
  },
  {
    id: 'eject_empty_mags',
    category: 'hud',
    pathKey: 'pro.tweak.eject_empty_mags.path',
    optionKey: 'pro.tweak.eject_empty_mags.option',
    reasonKey: 'pro.tweak.eject_empty_mags.reason',
  },

  // --- Aim & Combat ---
  {
    id: 'fixed_crosshair_ads',
    category: 'aim',
    pathKey: 'pro.tweak.fixed_crosshair_ads.path',
    optionKey: 'pro.tweak.fixed_crosshair_ads.option',
    reasonKey: 'pro.tweak.fixed_crosshair_ads.reason',
  },
  {
    id: 'scope_blur_off',
    category: 'aim',
    pathKey: 'pro.tweak.scope_blur_off.path',
    optionKey: 'pro.tweak.scope_blur_off.option',
    reasonKey: 'pro.tweak.scope_blur_off.reason',
  },
  {
    id: 'ads_during_reload',
    category: 'aim',
    pathKey: 'pro.tweak.ads_during_reload.path',
    optionKey: 'pro.tweak.ads_during_reload.option',
    reasonKey: 'pro.tweak.ads_during_reload.reason',
  },
  {
    id: 'aim_assist_on',
    category: 'aim',
    pathKey: 'pro.tweak.aim_assist_on.path',
    optionKey: 'pro.tweak.aim_assist_on.option',
    reasonKey: 'pro.tweak.aim_assist_on.reason',
    warnKey: 'pro.tweak.aim_assist_on.warn',
  },
  {
    id: 'fire_button_top_corner',
    category: 'aim',
    pathKey: 'pro.tweak.fire_button_top_corner.path',
    optionKey: 'pro.tweak.fire_button_top_corner.option',
    reasonKey: 'pro.tweak.fire_button_top_corner.reason',
  },

  // --- Quality of life ---
  {
    id: 'auto_pickup_priority',
    category: 'qol',
    pathKey: 'pro.tweak.auto_pickup_priority.path',
    optionKey: 'pro.tweak.auto_pickup_priority.option',
    reasonKey: 'pro.tweak.auto_pickup_priority.reason',
  },
  {
    id: 'quick_chat_off',
    category: 'qol',
    pathKey: 'pro.tweak.quick_chat_off.path',
    optionKey: 'pro.tweak.quick_chat_off.option',
    reasonKey: 'pro.tweak.quick_chat_off.reason',
  },
  {
    id: 'vehicle_camera_lock',
    category: 'qol',
    pathKey: 'pro.tweak.vehicle_camera_lock.path',
    optionKey: 'pro.tweak.vehicle_camera_lock.option',
    reasonKey: 'pro.tweak.vehicle_camera_lock.reason',
  },
  {
    id: 'haptic_off',
    category: 'qol',
    pathKey: 'pro.tweak.haptic_off.path',
    optionKey: 'pro.tweak.haptic_off.option',
    reasonKey: 'pro.tweak.haptic_off.reason',
  },
  {
    id: 'background_apps_off',
    category: 'qol',
    pathKey: 'pro.tweak.background_apps_off.path',
    optionKey: 'pro.tweak.background_apps_off.option',
    reasonKey: 'pro.tweak.background_apps_off.reason',
  },
];
