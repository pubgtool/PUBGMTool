import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { Badge, Card, Pill } from '../components/UI';
import {
  TIPS,
  tipsFiltered,
  type SkillLevel,
  type TipTopic,
} from '../data/tips';

const LEVELS: (SkillLevel | 'all')[] = ['all', 'newbie', 'intermediate', 'pro'];
const TOPICS: (TipTopic | 'all')[] = [
  'all',
  'gunplay',
  'sensitivity',
  'gyro',
  'claw',
  'hud',
  'movement',
  'sound',
  'rotation',
  'loot',
  'mental',
];

export default function TipsCoach() {
  const { t, lang } = useI18n();
  const [level, setLevel] = useState<SkillLevel | 'all'>('newbie');
  const [topic, setTopic] = useState<TipTopic | 'all'>('all');

  const filtered = useMemo(() => tipsFiltered(level, topic), [level, topic]);

  const levelLabel = (l: SkillLevel | 'all') =>
    l === 'all' ? t('tips.level.all') : t(`tips.level.${l}`);
  const topicLabel = (tp: TipTopic | 'all') =>
    tp === 'all' ? t('tips.topic.all') : t(`tips.topic.${tp}`);

  const tone: Record<SkillLevel, 'good' | 'warn' | 'bad'> = {
    newbie: 'good',
    intermediate: 'warn',
    pro: 'bad',
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('tips.title')} subtitle={t('tips.lead')}>
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-text-dim">
              {t('tips.level')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LEVELS.map((l) => (
                <Pill key={l} active={level === l} onClick={() => setLevel(l)}>
                  {levelLabel(l)}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-text-dim">
              {t('tips.topic')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((tp) => (
                <Pill key={tp} active={topic === tp} onClick={() => setTopic(tp)}>
                  {topicLabel(tp)}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-text-soft">{t('tips.empty')}</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tip) => (
            <article
              key={tip.id}
              className="rounded-2xl border border-line bg-panel p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={tone[tip.level]}>{t(`tips.level.${tip.level}`)}</Badge>
                <Badge>{t(`tips.topic.${tip.topic}`)}</Badge>
              </div>
              <p className="text-sm leading-relaxed text-text">
                {lang === 'ru' ? tip.ru : tip.en}
              </p>
            </article>
          ))}
        </div>
      )}

      <Card title={t('tips.summary')}>
        <div className="grid grid-cols-3 gap-3 text-center">
          {(['newbie', 'intermediate', 'pro'] as SkillLevel[]).map((l) => (
            <div
              key={l}
              className="rounded-xl border border-line bg-panel-soft p-3"
            >
              <div className="text-xs uppercase tracking-wider text-text-dim">
                {t(`tips.level.${l}`)}
              </div>
              <div className="mt-1 font-mono text-2xl">
                {TIPS.filter((tp) => tp.level === l).length}
              </div>
              <div className="text-[11px] text-text-soft">{t('tips.count')}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
