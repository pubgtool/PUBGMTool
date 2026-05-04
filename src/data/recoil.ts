// Approximate recoil patterns. Each entry is the offset (in pattern-space units,
// not pixels) for that bullet relative to the previous bullet. Positive y means
// the muzzle climbs upward (so the player must compensate downward); positive x
// is rightward drift.
//
// These are simplified representations for visualization and trainer overlays.

export interface RecoilPattern {
  weaponId: string;
  /** No-grip / no-compensator baseline pattern, 1 unit ≈ 1% of vertical climb per shot. */
  pattern: { x: number; y: number }[];
  /** Recommended attachments to flatten the pattern (in priority order). */
  attachments: string[];
}

const make = (
  weaponId: string,
  shots: number,
  vBase: number,
  hAmplitude: number,
  hDrift = 0,
): RecoilPattern => {
  const pattern: { x: number; y: number }[] = [];
  let lastX = 0;
  for (let i = 0; i < shots; i++) {
    const t = i / Math.max(1, shots - 1);
    // Vertical recoil ramps up sharply for first 5–6 bullets, then plateaus.
    const verticalCurve = vBase * (0.55 + 0.7 * Math.min(1, i / 6));
    // Horizontal recoil oscillates pseudo-randomly using a deterministic seed.
    const seed = (Math.sin(i * 1.7 + weaponId.length) + Math.sin(i * 0.7)) / 2;
    const x = seed * hAmplitude + hDrift * t;
    pattern.push({ x: x - lastX, y: verticalCurve });
    lastX = x;
  }
  return { weaponId, pattern, attachments: [] };
};

export const RECOIL_PATTERNS: RecoilPattern[] = [
  { ...make('m416', 30, 1.4, 0.8, 0.6), attachments: ['Compensator', 'Vertical Grip', 'Tactical Stock'] },
  { ...make('akm', 30, 2.6, 1.6, 1.0), attachments: ['Compensator', 'Half Grip', 'Cheek Pad'] },
  { ...make('beryl', 30, 2.8, 1.8, 1.2), attachments: ['Compensator', 'Half Grip', 'Tactical Stock'] },
  { ...make('scarl', 30, 1.6, 0.9, 0.4), attachments: ['Compensator', 'Vertical Grip'] },
  { ...make('m16a4', 30, 1.5, 0.7, 0.3), attachments: ['Compensator', 'Vertical Grip'] },
  { ...make('qbz', 30, 1.7, 1.0, 0.5), attachments: ['Compensator', 'Vertical Grip'] },
  { ...make('g36c', 30, 1.6, 0.9, 0.4), attachments: ['Compensator', 'Vertical Grip'] },
  { ...make('aug', 30, 1.5, 0.9, 0.3), attachments: ['Compensator', 'Vertical Grip'] },
  { ...make('groza', 30, 2.4, 1.5, 0.8), attachments: ['Compensator', 'Half Grip'] },
  { ...make('mk47', 20, 2.6, 1.7, 1.0), attachments: ['Compensator', 'Half Grip'] },
  { ...make('ace32', 30, 2.2, 1.4, 0.7), attachments: ['Compensator', 'Half Grip'] },

  { ...make('mini14', 20, 1.4, 0.6, 0.2), attachments: ['Compensator', 'Cheek Pad'] },
  { ...make('sks', 10, 2.1, 1.0, 0.4), attachments: ['Compensator', 'Cheek Pad'] },
  { ...make('slr', 10, 2.6, 1.4, 0.6), attachments: ['Compensator', 'Cheek Pad'] },
  { ...make('qbu', 10, 1.8, 0.9, 0.3), attachments: ['Compensator', 'Cheek Pad'] },
  { ...make('mk14', 20, 2.6, 1.5, 0.8), attachments: ['Compensator', 'Half Grip'] },
  { ...make('vss', 20, 1.0, 0.6, 0.2), attachments: ['Vertical Grip'] },

  { ...make('ump45', 30, 1.0, 0.6, 0.3), attachments: ['Compensator', 'Vertical Grip', 'Tactical Stock'] },
  { ...make('vector', 33, 0.9, 0.5, 0.2), attachments: ['Compensator', 'Vertical Grip', 'Tactical Stock'] },
  { ...make('uzi', 30, 1.1, 0.8, 0.4), attachments: ['Compensator', 'Vertical Grip', 'Stock'] },
  { ...make('tommy', 30, 1.3, 1.0, 0.5), attachments: ['Compensator', 'Vertical Grip'] },
  { ...make('bizon', 30, 1.0, 0.7, 0.3), attachments: ['Compensator', 'Vertical Grip'] },
  { ...make('mp5k', 30, 1.0, 0.6, 0.2), attachments: ['Compensator', 'Vertical Grip', 'Tactical Stock'] },
  { ...make('p90', 30, 1.0, 0.6, 0.2), attachments: [] },

  { ...make('m249', 30, 1.4, 1.0, 0.6), attachments: ['Compensator'] },
  { ...make('dp28', 30, 2.0, 1.4, 0.8), attachments: ['Suppressor'] },
];

export function getRecoilPattern(weaponId: string): RecoilPattern | undefined {
  return RECOIL_PATTERNS.find((p) => p.weaponId === weaponId);
}
