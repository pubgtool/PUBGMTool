import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button, Card, Stat } from '../components/UI';

type Phase = 'idle' | 'waiting' | 'go' | 'tooEarly' | 'result';

export default function ReactionTimeTester() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('idle');
  const [reaction, setReaction] = useState<number | null>(null);
  const [history, setHistory] = useLocalStorage<number[]>(
    'pubgm.reactionHistory',
    [],
  );
  const goAt = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const arm = () => {
    setPhase('waiting');
    setReaction(null);
    const delay = 900 + Math.random() * 2400;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      goAt.current = performance.now();
      setPhase('go');
    }, delay);
  };

  const handleClick = () => {
    if (phase === 'idle' || phase === 'tooEarly' || phase === 'result') {
      arm();
      return;
    }
    if (phase === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase('tooEarly');
      return;
    }
    if (phase === 'go') {
      const r = Math.round(performance.now() - goAt.current);
      setReaction(r);
      setHistory((h) => [r, ...h].slice(0, 30));
      setPhase('result');
    }
  };

  const avg = history.length
    ? Math.round(history.reduce((a, b) => a + b, 0) / history.length)
    : 0;
  const best = history.length ? Math.min(...history) : 0;

  const bg = (() => {
    switch (phase) {
      case 'go':
        return 'bg-good';
      case 'tooEarly':
        return 'bg-bad';
      case 'waiting':
        return 'bg-accent-2';
      default:
        return 'bg-panel-soft';
    }
  })();
  const label = (() => {
    switch (phase) {
      case 'idle':
        return t('common.start');
      case 'waiting':
        return t('reaction.wait');
      case 'go':
        return t('reaction.now');
      case 'tooEarly':
        return t('reaction.tooEarly');
      case 'result':
        return `${reaction}ms — ${t('common.restart')}`;
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('reaction.title')} subtitle={t('reaction.lead')}>
        <button
          onPointerDown={handleClick}
          className={`flex h-72 w-full items-center justify-center rounded-2xl text-2xl font-bold tracking-wide transition-colors ${bg} text-bg`}
        >
          {label}
        </button>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('reaction.result')} value={reaction != null ? `${reaction}ms` : '—'} tone="good" />
        <Stat label={t('reaction.average')} value={avg ? `${avg}ms` : '—'} />
        <Stat label={t('reaction.best')} value={best ? `${best}ms` : '—'} tone="warn" />
      </div>

      {history.length > 0 && (
        <Card title={t('drill.history')}>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <span
                key={i}
                className="rounded-md border border-line bg-panel-soft px-2 py-1 font-mono text-xs"
              >
                {h}ms
              </span>
            ))}
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
