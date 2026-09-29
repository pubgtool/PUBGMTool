// HUD layout helpers. Buttons are positioned in normalized coordinates
// (0..1 of the visible play area) so layouts scale across devices.

export type ButtonId =
  | 'fire1'
  | 'fire2'
  | 'aim'
  | 'scope'
  | 'jump'
  | 'crouch'
  | 'prone'
  | 'reload'
  | 'sprint'
  | 'peekLeft'
  | 'peekRight'
  | 'lean'
  | 'inventory'
  | 'map'
  | 'medic'
  | 'grenade';

export interface HudButton {
  id: ButtonId;
  /** Normalized x (0 = left edge, 1 = right edge of play area). */
  x: number;
  /** Normalized y (0 = top, 1 = bottom). */
  y: number;
  /** Normalized size (relative to play area height). */
  size: number;
  label: string;
  color: string;
}

export interface HudLayout {
  id: string;
  name: string;
  /** i18n key for the layout description. */
  descriptionKey: string;
  /** Recommended hand-style. */
  style: 'thumb' | 'claw' | 'fourFinger' | 'sixFinger';
  buttons: HudButton[];
}

const c = (id: ButtonId, x: number, y: number, size: number, label: string, color: string): HudButton => ({ id, x, y, size, label, color });

export const HUD_LAYOUTS: HudLayout[] = [
  {
    id: 'thumb_default',
    name: 'Thumbs · Default',
    descriptionKey: 'hud.layout.thumb_default.desc',
    style: 'thumb',
    buttons: [
      c('fire1', 0.86, 0.62, 0.18, 'FIRE', '#ef4444'),
      c('fire2', 0.10, 0.62, 0.13, 'FIRE 2', '#ef4444'),
      c('aim', 0.78, 0.40, 0.10, 'ADS', '#f5a524'),
      c('scope', 0.78, 0.20, 0.07, 'SCOPE', '#f5a524'),
      c('jump', 0.94, 0.78, 0.08, 'JUMP', '#22c55e'),
      c('crouch', 0.86, 0.86, 0.07, 'CR', '#22c55e'),
      c('prone', 0.94, 0.92, 0.06, 'PR', '#22c55e'),
      c('reload', 0.50, 0.92, 0.07, 'RL', '#3b82f6'),
      c('sprint', 0.10, 0.90, 0.07, 'RUN', '#3b82f6'),
      c('peekLeft', 0.04, 0.42, 0.05, 'L', '#9ca3af'),
      c('peekRight', 0.96, 0.42, 0.05, 'R', '#9ca3af'),
      c('inventory', 0.96, 0.04, 0.06, 'INV', '#9ca3af'),
      c('map', 0.04, 0.04, 0.05, 'M', '#9ca3af'),
      c('medic', 0.40, 0.04, 0.05, 'MED', '#22c55e'),
      c('grenade', 0.32, 0.04, 0.05, 'GRN', '#eab308'),
    ],
  },
  {
    id: 'claw_three',
    name: 'Claw · 3-Finger',
    descriptionKey: 'hud.layout.claw_three.desc',
    style: 'claw',
    buttons: [
      c('fire1', 0.92, 0.10, 0.10, 'FIRE', '#ef4444'),
      c('fire2', 0.86, 0.62, 0.13, 'FIRE 2', '#ef4444'),
      c('aim', 0.10, 0.62, 0.13, 'ADS', '#f5a524'),
      c('scope', 0.78, 0.40, 0.08, 'SCOPE', '#f5a524'),
      c('jump', 0.50, 0.62, 0.08, 'JUMP', '#22c55e'),
      c('crouch', 0.40, 0.78, 0.07, 'CR', '#22c55e'),
      c('prone', 0.40, 0.90, 0.06, 'PR', '#22c55e'),
      c('reload', 0.60, 0.92, 0.07, 'RL', '#3b82f6'),
      c('sprint', 0.10, 0.90, 0.07, 'RUN', '#3b82f6'),
      c('peekLeft', 0.04, 0.40, 0.06, 'L', '#9ca3af'),
      c('peekRight', 0.96, 0.40, 0.06, 'R', '#9ca3af'),
      c('inventory', 0.96, 0.04, 0.06, 'INV', '#9ca3af'),
      c('map', 0.04, 0.04, 0.05, 'M', '#9ca3af'),
      c('medic', 0.40, 0.04, 0.05, 'MED', '#22c55e'),
      c('grenade', 0.32, 0.04, 0.05, 'GRN', '#eab308'),
    ],
  },
  {
    id: 'four_finger',
    name: '4-Finger Claw',
    descriptionKey: 'hud.layout.four_finger.desc',
    style: 'fourFinger',
    buttons: [
      c('fire1', 0.92, 0.10, 0.10, 'FIRE R', '#ef4444'),
      c('fire2', 0.08, 0.10, 0.10, 'FIRE L', '#ef4444'),
      c('aim', 0.86, 0.62, 0.13, 'ADS R', '#f5a524'),
      c('scope', 0.10, 0.62, 0.13, 'ADS L', '#f5a524'),
      c('jump', 0.78, 0.30, 0.07, 'JMP', '#22c55e'),
      c('crouch', 0.18, 0.30, 0.06, 'CR', '#22c55e'),
      c('prone', 0.18, 0.42, 0.06, 'PR', '#22c55e'),
      c('reload', 0.65, 0.92, 0.07, 'RL', '#3b82f6'),
      c('sprint', 0.35, 0.92, 0.07, 'RUN', '#3b82f6'),
      c('peekLeft', 0.04, 0.42, 0.06, 'L', '#9ca3af'),
      c('peekRight', 0.96, 0.42, 0.06, 'R', '#9ca3af'),
      c('inventory', 0.96, 0.04, 0.06, 'INV', '#9ca3af'),
      c('map', 0.04, 0.04, 0.05, 'M', '#9ca3af'),
      c('medic', 0.45, 0.04, 0.05, 'MED', '#22c55e'),
      c('grenade', 0.36, 0.04, 0.05, 'GRN', '#eab308'),
    ],
  },
  {
    id: 'six_finger_pro',
    name: '6-Finger Pro',
    descriptionKey: 'hud.layout.six_finger_pro.desc',
    style: 'sixFinger',
    buttons: [
      c('fire1', 0.92, 0.10, 0.10, 'FIRE R', '#ef4444'),
      c('fire2', 0.08, 0.10, 0.10, 'FIRE L', '#ef4444'),
      c('aim', 0.86, 0.62, 0.13, 'ADS R', '#f5a524'),
      c('scope', 0.10, 0.62, 0.13, 'ADS L', '#f5a524'),
      c('jump', 0.78, 0.06, 0.07, 'JMP', '#22c55e'),
      c('crouch', 0.20, 0.06, 0.07, 'CR', '#22c55e'),
      c('prone', 0.20, 0.16, 0.06, 'PR', '#22c55e'),
      c('reload', 0.65, 0.92, 0.07, 'RL', '#3b82f6'),
      c('sprint', 0.35, 0.92, 0.07, 'RUN', '#3b82f6'),
      c('peekLeft', 0.04, 0.42, 0.06, 'L', '#9ca3af'),
      c('peekRight', 0.96, 0.42, 0.06, 'R', '#9ca3af'),
      c('inventory', 0.96, 0.04, 0.06, 'INV', '#9ca3af'),
      c('map', 0.04, 0.04, 0.05, 'M', '#9ca3af'),
      c('medic', 0.50, 0.30, 0.06, 'MED', '#22c55e'),
      c('grenade', 0.50, 0.42, 0.06, 'GRN', '#eab308'),
      c('lean', 0.50, 0.06, 0.06, 'LEAN', '#9ca3af'),
    ],
  },
];

export function getLayout(id: string): HudLayout | undefined {
  return HUD_LAYOUTS.find((l) => l.id === id);
}

export function cloneLayout(l: HudLayout): HudLayout {
  return { ...l, buttons: l.buttons.map((b) => ({ ...b })) };
}
