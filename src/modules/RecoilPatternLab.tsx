import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { Button, Card, Pill, Select, Slider, Stat } from '../components/UI';
import { WEAPONS_DEDUPED } from '../data/weapons';
import { RECOIL_PATTERNS, getRecoilPattern } from '../data/recoil';

const PATTERN_WEAPONS = WEAPONS_DEDUPED.filter((w) =>
  RECOIL_PATTERNS.some((p) => p.weaponId === w.id),
);

export default function RecoilPatternLab() {
  const { t } = useI18n();
  const [weaponId, setWeaponId] = useState<string>('m416');
  const [mode, setMode] = useState<'view' | 'train'>('view');
  const pattern = getRecoilPattern(weaponId);
  const weapon = PATTERN_WEAPONS.find((w) => w.id === weaponId);

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('recoil.title')} subtitle={t('recoil.lead')}>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={weaponId}
            onChange={(e) => setWeaponId(e.target.value)}
            className="max-w-xs"
          >
            {PATTERN_WEAPONS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-1.5">
            <Pill active={mode === 'view'} onClick={() => setMode('view')}>
              {t('recoil.simulate')}
            </Pill>
            <Pill active={mode === 'train'} onClick={() => setMode('train')}>
              {t('recoil.train')}
            </Pill>
          </div>
        </div>
        {weapon && pattern && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="RPM" value={weapon.rpm} />
            <Stat label="Bullets" value={pattern.pattern.length} />
            <Stat label="Ammo" value={weapon.ammo} />
            <Stat
              label="Compensation"
              value={pattern.attachments[0] ?? '—'}
              tone="accent"
            />
          </div>
        )}
      </Card>

      {pattern && weapon && (
        <Card title={mode === 'view' ? t('recoil.simulate') : t('recoil.train')}>
          {mode === 'view' ? (
            <PatternViewer pattern={pattern.pattern} />
          ) : (
            <RecoilTrainer pattern={pattern.pattern} rpm={weapon.rpm} />
          )}
        </Card>
      )}

      {pattern && pattern.attachments.length > 0 && (
        <Card title={t('common.attachments')}>
          <div className="flex flex-wrap gap-2">
            {pattern.attachments.map((a) => (
              <span
                key={a}
                className="rounded-full border border-line bg-panel-soft px-3 py-1 text-xs text-text-soft"
              >
                {a}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-dim">
            Атачменты накладываются мультипликативно: компенсатор снижает вертикаль ~25%, грипы — горизонталь.
            Числа в этом тренажёре — без обвесов, как baseline.
          </p>
        </Card>
      )}
    </div>
  );
}

function PatternViewer({ pattern }: { pattern: { x: number; y: number }[] }) {
  // Convert relative offsets to absolute path.
  const points = useMemo(() => cumulative(pattern), [pattern]);

  const { minX, maxX, totalY } = useMemo(() => {
    let minX = 0;
    let maxX = 0;
    let totalY = 0;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y > totalY) totalY = p.y;
    }
    return { minX, maxX, totalY };
  }, [points]);

  const width = 360;
  const height = 460;
  const padX = 30;
  const padY = 40;
  const xRange = Math.max(8, maxX - minX);
  const yRange = Math.max(8, totalY);
  const sx = (x: number) =>
    padX + ((x - minX) / xRange) * (width - 2 * padX);
  const sy = (y: number) => padY + (y / yRange) * (height - 2 * padY);

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(' ');

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[420px]">
        <rect width={width} height={height} fill="#11141b" rx="14" />
        {/* grid */}
        {Array.from({ length: 11 }).map((_, i) => (
          <line
            key={`vg${i}`}
            x1={(i / 10) * width}
            x2={(i / 10) * width}
            y1={0}
            y2={height}
            stroke="#1d2230"
          />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line
            key={`hg${i}`}
            x1={0}
            x2={width}
            y1={(i / 10) * height}
            y2={(i / 10) * height}
            stroke="#1d2230"
          />
        ))}
        {/* center line */}
        <line
          x1={sx(0)}
          x2={sx(0)}
          y1={padY}
          y2={height - padY}
          stroke="#262b39"
          strokeDasharray="3,3"
        />
        <path d={pathD} stroke="#f5a524" strokeWidth="2" fill="none" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={i === 0 ? 5 : 3}
            fill={i === 0 ? '#22c55e' : '#ff5e3a'}
            opacity={0.85}
          />
        ))}
        <text x={padX} y={20} fill="#98a0b3" fontSize="11">
          start
        </text>
        <text x={width - padX - 30} y={height - 8} fill="#98a0b3" fontSize="11">
          end
        </text>
      </svg>

      <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
        <Stat label="Vertical climb" value={`${totalY.toFixed(1)}u`} />
        <Stat label="Horizontal spread" value={`${(maxX - minX).toFixed(1)}u`} />
        <Stat label="Bullets" value={points.length} />
        <Stat label="Drift L↔R" value={`${minX.toFixed(1)}/${maxX.toFixed(1)}`} />
      </div>
    </div>
  );
}

function RecoilTrainer({
  pattern,
  rpm,
}: {
  pattern: { x: number; y: number }[];
  rpm: number;
}) {
  const { t } = useI18n();
  const [running, setRunning] = useState(false);
  const [shotIndex, setShotIndex] = useState(0);
  const [hits, setHits] = useState<{ x: number; y: number; ok: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [aimX, setAimX] = useState(0);
  const [aimY, setAimY] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastShotAt = useRef<number>(0);
  const [trackingError, setTrackingError] = useState(0);

  const intervalMs = 60000 / rpm;

  // Cumulative pattern target
  const targets = useMemo(() => cumulative(pattern), [pattern]);

  useEffect(() => {
    if (!running) return;
    const tick = (ts: number) => {
      if (lastShotAt.current === 0) lastShotAt.current = ts;
      while (shotIndex < targets.length && ts - lastShotAt.current >= intervalMs) {
        const target = targets[shotIndex];
        // Player aims down/left to "compensate" — so shot lands at (target.x - aimX, target.y - aimY).
        const landedX = target.x - aimX;
        const landedY = target.y - aimY;
        const dx = landedX;
        const dy = landedY;
        const err = Math.sqrt(dx * dx + dy * dy);
        const ok = err < 1.5;
        setHits((h) => [...h, { x: landedX, y: landedY, ok }]);
        setTrackingError((te) => te + err);
        setScore((s) => s + Math.max(0, Math.round(50 - err * 6)));
        setShotIndex((i) => i + 1);
        lastShotAt.current += intervalMs;
      }
      if (shotIndex < targets.length) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, shotIndex, aimX, aimY, intervalMs, targets]);

  const start = () => {
    setShotIndex(0);
    setHits([]);
    setScore(0);
    setAimX(0);
    setAimY(0);
    setTrackingError(0);
    lastShotAt.current = 0;
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  // Drag-down to compensate. We track pointer movement *delta* and translate it to (aimX, aimY).
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = (e.clientX - dragRef.current.lastX) * 0.04;
    const dy = (e.clientY - dragRef.current.lastY) * 0.04;
    setAimX((x) => x + dx);
    setAimY((y) => y + dy);
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const width = 360;
  const height = 460;

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-none select-none rounded-2xl border border-line bg-bg-soft"
        style={{ width, height }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full">
          {Array.from({ length: 11 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={(i / 10) * width}
              x2={(i / 10) * width}
              y1={0}
              y2={height}
              stroke="#1d2230"
            />
          ))}
          {/* target dot */}
          <circle cx={width / 2} cy={120} r={28} stroke="#262b39" strokeWidth="2" fill="none" />
          <circle cx={width / 2} cy={120} r={10} fill="#ef4444" opacity="0.9" />
          {/* aim crosshair */}
          <g transform={`translate(${width / 2 + aimX * 14},${120 + aimY * 14})`}>
            <circle r={3} fill="#f5a524" />
            <line x1={-12} x2={-4} y1={0} y2={0} stroke="#f5a524" strokeWidth="1.5" />
            <line x1={4} x2={12} y1={0} y2={0} stroke="#f5a524" strokeWidth="1.5" />
            <line x1={0} x2={0} y1={-12} y2={-4} stroke="#f5a524" strokeWidth="1.5" />
            <line x1={0} x2={0} y1={4} y2={12} stroke="#f5a524" strokeWidth="1.5" />
          </g>
          {/* hits */}
          {hits.map((h, i) => (
            <circle
              key={i}
              cx={width / 2 + h.x * 14}
              cy={120 + h.y * 14}
              r={3}
              fill={h.ok ? '#22c55e' : '#ef4444'}
              opacity={0.8}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 text-center text-[11px] text-text-soft">
          Drag down/sideways to compensate while firing
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat label={t('recoil.score')} value={score} tone="good" />
          <Stat label="Hits" value={`${hits.filter((h) => h.ok).length}/${hits.length}`} />
          <Stat label="Avg error" value={hits.length ? (trackingError / hits.length).toFixed(2) : '—'} />
          <Stat label="Bullets fired" value={shotIndex} />
        </div>

        <Slider label="Compensation X" min={-15} max={15} value={Math.round(aimX)} onChange={setAimX} step={1} />
        <Slider label="Compensation Y" min={-5} max={25} value={Math.round(aimY)} onChange={setAimY} step={1} />

        <div className="flex gap-2">
          {!running ? (
            <Button variant="primary" onClick={start}>
              {t('common.start')}
            </Button>
          ) : (
            <Button variant="danger" onClick={stop}>
              {t('common.stop')}
            </Button>
          )}
          <Button variant="ghost" onClick={start}>
            {t('common.restart')}
          </Button>
        </div>
        <p className="text-xs text-text-dim">
          Тренажёр имитирует автоматическую очередь с реальным RPM. «Стрельба» автоматически прибывает по времени;
          твоя задача — успевать тянуть прицел вниз/в сторону, чтобы пули собирались на красной точке.
        </p>
      </div>
    </div>
  );
}


/** Convert per-bullet recoil deltas into cumulative absolute positions. */
function cumulative(deltas: { x: number; y: number }[]) {
  const out: { x: number; y: number }[] = [];
  let ax = 0;
  let ay = 0;
  for (const d of deltas) {
    ax += d.x;
    ay += d.y;
    out.push({ x: ax, y: ay });
  }
  return out;
}
