import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button, Card, Pill, Stat } from '../components/UI';

interface Scenario {
  id: string;
  name: string;
  /** Where the enemy will pop (normalized 0..1). */
  targetX: number;
  targetY: number;
  description: string;
}

const SCENARIOS: Scenario[] = [
  { id: 's1', name: 'Door · close', targetX: 0.46, targetY: 0.58, description: 'Дверь напротив, ближний бой. Прицел на уровне головы.' },
  { id: 's2', name: 'Window · medium', targetX: 0.62, targetY: 0.5, description: 'Окно второго этажа. Целься в верх рамки.' },
  { id: 's3', name: 'Compound peek', targetX: 0.34, targetY: 0.55, description: 'Угол стенки. Прицел чуть выше предполагаемой головы.' },
  { id: 's4', name: 'Hilltop ridge', targetX: 0.70, targetY: 0.45, description: 'Вершина холма — head-glitch позиция.' },
  { id: 's5', name: 'Stairs', targetX: 0.50, targetY: 0.62, description: 'Лестница вверх — голова появится сверху-сбоку.' },
];

export default function CrosshairTrainer() {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const sc = SCENARIOS[idx];
  const [picked, setPicked] = useState<{ x: number; y: number } | null>(null);
  const [score, setScore] = useLocalStorage<number>('pubgm.crosshairScore', 0);
  const [revealAt, setRevealAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setNow(performance.now());
      tickRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = requestAnimationFrame(tick);
    return () => {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
    };
  }, []);

  const click = (e: React.PointerEvent) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPicked({ x, y });
    setRevealAt(performance.now() + 600);
    const dist = Math.hypot(x - sc.targetX, y - sc.targetY);
    const points = Math.max(0, Math.round(100 - dist * 280));
    setScore((s) => s + points);
  };

  const next = () => {
    setPicked(null);
    setIdx((i) => (i + 1) % SCENARIOS.length);
  };

  const showTarget = picked && now >= revealAt;
  const distance = picked
    ? Math.hypot(picked.x - sc.targetX, picked.y - sc.targetY)
    : 0;
  const points = picked ? Math.max(0, Math.round(100 - distance * 280)) : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('crosshair.title')} subtitle={t('crosshair.lead')}>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s, i) => (
            <Pill
              key={s.id}
              active={idx === i}
              onClick={() => {
                setIdx(i);
                setPicked(null);
              }}
            >
              {s.name}
            </Pill>
          ))}
        </div>
        <p className="mt-2 text-sm text-text-soft">{sc.description}</p>
      </Card>

      <Card>
        <div
          ref={arenaRef}
          onPointerDown={click}
          className="relative w-full overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#1d2230] to-[#0d1018] cursor-crosshair touch-none"
          style={{ aspectRatio: '16 / 9' }}
        >
          <Cover />

          {/* Picked crosshair */}
          {picked && (
            <Crosshair x={picked.x} y={picked.y} color="#f5a524" />
          )}

          {/* Target reveal */}
          {showTarget && (
            <>
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-bad/60 ring-2 ring-bad shadow-[0_0_24px_rgba(239,68,68,0.6)]"
                style={{
                  left: `${sc.targetX * 100}%`,
                  top: `${sc.targetY * 100}%`,
                  width: '3.6%',
                  height: '6.4%',
                }}
              />
              <Crosshair x={sc.targetX} y={sc.targetY} color="#ef4444" thin />
            </>
          )}

          {!picked && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-text-soft">
              Кликни в точку, где должен быть твой прицел перед выходом из угла.
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t('crosshair.score')}
          value={score}
          tone="good"
        />
        <Stat label="Last hit" value={picked ? `${points}` : '—'} />
        <Stat
          label={t('crosshair.distance')}
          value={picked ? `${(distance * 100).toFixed(1)}%` : '—'}
        />
        <Stat label={t('crosshair.scenario')} value={`${idx + 1}/${SCENARIOS.length}`} />
      </div>

      <div className="flex gap-2">
        <Button variant="primary" onClick={next}>
          {t('common.next')}
        </Button>
        <Button variant="ghost" onClick={() => setScore(0)}>
          {t('common.reset')}
        </Button>
      </div>
    </div>
  );
}

function Crosshair({
  x,
  y,
  color,
  thin,
}: {
  x: number;
  y: number;
  color: string;
  thin?: boolean;
}) {
  const w = thin ? 1 : 1.5;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <line x1={x * 100 - 4} x2={x * 100 - 1} y1={y * 100} y2={y * 100} stroke={color} strokeWidth={w} />
      <line x1={x * 100 + 1} x2={x * 100 + 4} y1={y * 100} y2={y * 100} stroke={color} strokeWidth={w} />
      <line x1={x * 100} x2={x * 100} y1={y * 100 - 4} y2={y * 100 - 1} stroke={color} strokeWidth={w} />
      <line x1={x * 100} x2={x * 100} y1={y * 100 + 1} y2={y * 100 + 4} stroke={color} strokeWidth={w} />
      <circle cx={x * 100} cy={y * 100} r={0.4} fill={color} />
    </svg>
  );
}

function Cover() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 320 180"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1d2230" />
          <stop offset="1" stopColor="#11141b" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#bg)" />
      <rect x="20" y="80" width="80" height="100" fill="#262b39" />
      <rect x="40" y="60" width="40" height="20" fill="#1d2230" />
      <rect x="220" y="60" width="80" height="120" fill="#1a1f2c" />
      <rect x="240" y="80" width="40" height="40" fill="#0b0d12" />
      <rect x="120" y="100" width="80" height="80" fill="#262b39" />
      <rect x="140" y="120" width="40" height="40" fill="#1d2230" />
    </svg>
  );
}
