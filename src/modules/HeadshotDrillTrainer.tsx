import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button, Card, Pill, Stat } from '../components/UI';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Target {
  id: number;
  x: number; // 0..1
  y: number; // 0..1
  size: number; // 0..1 of arena height
  spawnedAt: number;
}

interface RunResult {
  ts: number;
  difficulty: Difficulty;
  duration: number;
  score: number;
  hits: number;
  shots: number;
  headshots: number;
  avgReaction: number;
}

const SETTINGS: Record<Difficulty, { lifeMs: number; size: number; spawnMs: number }> = {
  easy: { lifeMs: 1700, size: 0.18, spawnMs: 750 },
  medium: { lifeMs: 1100, size: 0.13, spawnMs: 550 },
  hard: { lifeMs: 800, size: 0.09, spawnMs: 380 },
};

export default function HeadshotDrillTrainer() {
  const { t } = useI18n();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [duration, setDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [hits, setHits] = useState(0);
  const [headshots, setHeadshots] = useState(0);
  const [reactionSum, setReactionSum] = useState(0);
  const [reactionCount, setReactionCount] = useState(0);
  const [history, setHistory] = useLocalStorage<RunResult[]>(
    'pubgm.drillHistory',
    [],
  );
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(0);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<number | null>(null);
  const finishRef = useRef<() => void>(() => {});

  // Game loop (frame-based for time tracking and target expiry)
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const now = performance.now();
      setNow(now);
      setTargets((prev) =>
        prev.filter((tg) => now - tg.spawnedAt < SETTINGS[difficulty].lifeMs),
      );
      if (now >= endsAt) {
        finishRef.current();
      } else {
        tickRef.current = requestAnimationFrame(tick);
      }
    };
    tickRef.current = requestAnimationFrame(tick);
    return () => {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
    };
  }, [running, endsAt, difficulty]);

  // Spawn loop
  useEffect(() => {
    if (!running) return;
    const cfg = SETTINGS[difficulty];
    const spawn = () => {
      idRef.current += 1;
      setTargets((prev) =>
        prev.concat({
          id: idRef.current,
          x: 0.05 + Math.random() * 0.9,
          y: 0.1 + Math.random() * 0.7,
          size: cfg.size,
          spawnedAt: performance.now(),
        }),
      );
    };
    spawn();
    spawnRef.current = setInterval(spawn, cfg.spawnMs);
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, [running, difficulty]);

  const start = () => {
    setScore(0);
    setShots(0);
    setHits(0);
    setHeadshots(0);
    setReactionSum(0);
    setReactionCount(0);
    setTargets([]);
    setEndsAt(performance.now() + duration * 1000);
    setRunning(true);
  };

  const finish = () => {
    setRunning(false);
    setTargets([]);
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    const avg = reactionCount ? Math.round(reactionSum / reactionCount) : 0;
    const result: RunResult = {
      ts: Date.now(),
      difficulty,
      duration,
      score,
      hits,
      shots,
      headshots,
      avgReaction: avg,
    };
    setHistory((h) => [result, ...h].slice(0, 20));
  };

  // Always reflect the latest finish() in the ref so the rAF loop calls fresh state.
  useEffect(() => {
    finishRef.current = finish;
  });

  const onArenaShot = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!running) return;
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setShots((s) => s + 1);
    // Find topmost target intersecting click
    let hitTarget: Target | null = null;
    let zoneIsHead = false;
    for (let i = targets.length - 1; i >= 0; i--) {
      const tg = targets[i];
      const sz = tg.size;
      const halfW = (sz * 9) / 16 / 2; // approx aspect
      const halfH = sz / 2;
      if (
        x >= tg.x - halfW &&
        x <= tg.x + halfW &&
        y >= tg.y - halfH &&
        y <= tg.y + halfH
      ) {
        hitTarget = tg;
        // Head zone is the top 28% of the body silhouette.
        zoneIsHead = y < tg.y - halfH * 0.3;
        break;
      }
    }
    if (hitTarget) {
      setHits((h) => h + 1);
      const reaction = performance.now() - hitTarget.spawnedAt;
      setReactionSum((s) => s + reaction);
      setReactionCount((c) => c + 1);
      const base = zoneIsHead ? 100 : 35;
      const speedBonus = Math.max(0, 80 - Math.round(reaction / 8));
      setScore((s) => s + base + speedBonus);
      if (zoneIsHead) setHeadshots((h) => h + 1);
      setTargets((prev) => prev.filter((tg) => tg.id !== hitTarget.id));
    } else {
      setScore((s) => Math.max(0, s - 10));
    }
  };

  const accuracy = shots ? ((hits / shots) * 100).toFixed(1) : '0.0';
  const avgReaction = reactionCount
    ? Math.round(reactionSum / reactionCount)
    : 0;
  const remaining = running ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('drill.title')} subtitle={t('drill.lead')}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-soft">{t('drill.difficulty')}</span>
            <div className="flex gap-1.5">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <Pill
                  key={d}
                  active={difficulty === d}
                  onClick={() => setDifficulty(d)}
                >
                  {t(`drill.difficulty.${d}`)}
                </Pill>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-soft">{t('drill.duration')}</span>
            <div className="flex gap-1.5">
              {[15, 30, 60].map((d) => (
                <Pill
                  key={d}
                  active={duration === d}
                  onClick={() => setDuration(d)}
                >
                  {d}s
                </Pill>
              ))}
            </div>
          </div>
          <div className="ml-auto">
            {!running ? (
              <Button variant="primary" onClick={start}>
                {t('drill.start')}
              </Button>
            ) : (
              <Button variant="danger" onClick={finish}>
                {t('common.stop')} ({remaining}s)
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div
          ref={arenaRef}
          onPointerDown={onArenaShot}
          className="relative w-full overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#1a1f2c] to-[#0f1218] cursor-crosshair touch-none"
          style={{ aspectRatio: '16 / 9', minHeight: 280 }}
        >
          {targets.map((tg) => (
            <DummyTarget key={tg.id} target={tg} difficulty={difficulty} />
          ))}
          {!running && (
            <div className="absolute inset-0 grid place-items-center text-center">
              <div className="rounded-2xl bg-panel/80 px-4 py-3 text-sm text-text-soft backdrop-blur">
                {t('drill.start')}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label={t('drill.score')} value={score} tone="good" />
        <Stat label={t('drill.accuracy')} value={`${accuracy}%`} />
        <Stat label={t('drill.headshots')} value={headshots} tone="warn" />
        <Stat label={t('common.shots')} value={shots} />
        <Stat label={t('drill.avgReaction')} value={`${avgReaction}ms`} />
      </div>

      {history.length > 0 && (
        <Card title={t('drill.history')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-text-dim">
                <tr>
                  <th className="px-2 py-1 text-left">date</th>
                  <th className="px-2 py-1 text-left">{t('drill.difficulty')}</th>
                  <th className="px-2 py-1 text-right">{t('drill.score')}</th>
                  <th className="px-2 py-1 text-right">{t('drill.accuracy')}</th>
                  <th className="px-2 py-1 text-right">{t('drill.headshots')}</th>
                  <th className="px-2 py-1 text-right">{t('drill.avgReaction')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.ts} className="border-t border-line/60">
                    <td className="px-2 py-1 text-text-soft">
                      {new Date(h.ts).toLocaleString()}
                    </td>
                    <td className="px-2 py-1 capitalize">{h.difficulty}</td>
                    <td className="px-2 py-1 text-right font-mono">{h.score}</td>
                    <td className="px-2 py-1 text-right font-mono">
                      {h.shots ? ((h.hits / h.shots) * 100).toFixed(1) : '0'}%
                    </td>
                    <td className="px-2 py-1 text-right font-mono">{h.headshots}</td>
                    <td className="px-2 py-1 text-right font-mono">{h.avgReaction}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <Button variant="ghost" onClick={() => setHistory([])}>
              {t('common.reset')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function DummyTarget({
  target,
  difficulty,
}: {
  target: Target;
  difficulty: Difficulty;
}) {
  // Visual silhouette: head + torso. The hit detection (in parent) treats
  // the bounding box, but the head is highlighted so the player knows where to aim.
  const cfg = SETTINGS[difficulty];
  const size = target.size;
  const aspect = 9 / 16;
  const widthPct = size * aspect * 100;
  const heightPct = size * 100;
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{
        left: `${target.x * 100}%`,
        top: `${target.y * 100}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
      }}
    >
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-bad/90 ring-2 ring-bad"
        style={{ width: '38%', height: '28%' }}
      />
      <div
        className="absolute left-1/2 top-[28%] -translate-x-1/2 rounded-md bg-text/80"
        style={{ width: '85%', height: '70%' }}
      />
      <div
        className="absolute -inset-1 rounded-md border border-bad/40 animate-[fadeOut_linear]"
        style={{ animationDuration: `${cfg.lifeMs}ms` }}
      />
    </div>
  );
}
