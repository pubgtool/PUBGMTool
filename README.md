# PUBG Mobile Performance Toolkit

A bilingual (RU / EN), mobile-first PWA with **13 working modules** that help
PUBG Mobile players tune sensitivity, design HUD layouts, calibrate gyro,
practice recoil control, train aim and reaction, plan loadouts, and learn
practical advice scaled to skill level.

> ⚠️ **Disclaimer.** Tencent / Krafton do not publish official weapon stats,
> recoil patterns, or sensitivity formulas for PUBG Mobile. The numbers in
> this toolkit are **community-aggregated approximations** of patch 3.x meta
> and are intended as a *starting point*, not absolute truth. Every patch
> changes balance — re-tune your settings periodically.

## Modules

### Core
| # | Module | What it does |
|---|---|---|
| 1 | **Sensitivity Builder** | Per-scope sliders (TPP / FPP / Red Dot / 2x / 3x / 4x / 6x / 8x) for camera, ADS, and gyro channels. 5 presets, JSON export, and shareable URL. |
| 2 | **HUD Layout Generator** | Drag-and-drop button positioning on a 16:9 canvas with normalized coordinates (works on any screen). 4 presets: thumb, claw, 4-finger, 6-finger. |
| 3 | **Gyro Calibration** | Sensor-driven wizard (180° yaw + 90° pitch) using `DeviceOrientationEvent` with iOS permission flow. Falls back to a calculator when sensors are unavailable. |
| 4 | **Recoil Pattern Lab** | SVG visualization of bullet spread per weapon + interactive trainer that fires at the weapon's real RPM and scores how well you compensate. |
| 5 | **Headshot Drill Trainer** | Aim-clicker game with body / head zones, difficulty levels, configurable durations, and history tracking (accuracy, headshots, average reaction time). |
| 6 | **Weapon TTK Calculator** | Compare two weapons side-by-side with armor (helmet / vest L1–L3), zone, and distance modifiers. Shows damage / shot, shots-to-kill, TTK, and DPS. |

### Extra
| # | Module | What it does |
|---|---|---|
| 7 | **Reaction Time Tester** | Classic green-screen test with average / best history. |
| 8 | **Damage Falloff Calculator** | SVG curve of weapon damage vs. distance with armor. |
| 9 | **Loadout Planner** | Primary + secondary + throwables + heals with backpack slot accounting per ammo caliber. |
| 10 | **Crosshair Placement Trainer** | Static peek-the-corner scenarios; click where the crosshair should sit before exposing. |
| 11 | **Device Profile** | Phone model + refresh-rate selector → recommended graphics, FPS target, and starting sensitivity preset. |
| 12 | **Drop Spots** | Curated drop locations for Erangel / Miramar / Sanhok / Livik with loot tier and risk metadata. |
| 13 | **Tips & Coach** | 27+ practical tips filtered by skill level (Newbie / Intermediate / Pro) and topic (gunplay, gyro, claw, sound, rotation, mental, etc.). |

## Tech stack

- **React 19 + TypeScript** with strict typing.
- **Vite 8** for dev / production build.
- **Tailwind CSS v4** (`@tailwindcss/vite`) with custom dark gaming theme.
- **PWA** via `vite-plugin-pwa` — installable on iOS and Android home screens.
- **Code splitting** — every module lazy-loaded via `React.lazy` + `Suspense`.
  Initial bundle: ~60 KB gzipped, modules ~1–5 KB gzipped each.
- **State** — `useLocalStorage` hook persists every preset, drill history, and
  language choice. No backend, no tracking.
- **Sharing** — presets pack into a URL-safe Base64 hash for direct sharing.

## Performance

- Game loops use `requestAnimationFrame` synced to the device refresh rate (60 / 90 / 120 Hz).
- Drag-and-drop uses pointer events + GPU-composited transforms (no layout thrash).
- All heavy computations memoized with `useMemo` and proper dependency arrays.
- Production build is gzipped + brotli-compressed by the host (devinapps.com).

## Development

```bash
npm install
npm run dev       # Vite dev server
npm run build     # type-check + production build
npm run lint      # ESLint with react-hooks rules
npm run preview   # serve dist/
```

Requires Node 22.13+ (or 20.19+ / 24+).

## Deployment

The `dist/` output is a static SPA + service worker. Deploy on any static
host (devinapps.com, Vercel, Netlify, Cloudflare Pages, S3 + CloudFront).

## Roadmap

- Native iOS shell wrapping the same web view (TestFlight beta).
- Per-module patch-version tags so historical balance can be compared.
- More tips (target: 100+ across all skill levels).
- Gyro trainer with target-tracking accuracy scoring.

## License

MIT.
