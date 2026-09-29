import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { Badge, Card, Pill } from '../components/UI';
import {
  PRO_TWEAKS,
  PRO_TWEAK_CATEGORIES,
  type CategoryId,
} from '../data/proTweaks';

type FilterId = 'all' | CategoryId;

export default function ProTweaks() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? PRO_TWEAKS
        : PRO_TWEAKS.filter((tw) => tw.category === filter),
    [filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<CategoryId, typeof PRO_TWEAKS>();
    for (const tw of filtered) {
      const arr = map.get(tw.category) ?? [];
      arr.push(tw);
      map.set(tw.category, arr);
    }
    return PRO_TWEAK_CATEGORIES.filter((c) => map.has(c.id)).map((c) => ({
      cat: c,
      items: map.get(c.id) ?? [],
    }));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('pro.title')} subtitle={t('pro.lead')}>
        <p className="text-sm leading-relaxed text-text-soft">
          {t('pro.intro')}
        </p>
        <div className="mt-3 rounded-xl border border-warn/30 bg-warn/5 p-3">
          <div className="text-xs uppercase tracking-wider text-warn">
            {t('pro.disclaimer.title')}
          </div>
          <p className="mt-1 text-sm text-text-soft">
            {t('pro.disclaimer.body')}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
            {t('pro.filter.all')} · {PRO_TWEAKS.length}
          </Pill>
          {PRO_TWEAK_CATEGORIES.map((c) => {
            const count = PRO_TWEAKS.filter((tw) => tw.category === c.id).length;
            return (
              <Pill
                key={c.id}
                active={filter === c.id}
                onClick={() => setFilter(c.id)}
              >
                {t(c.titleKey)} · {count}
              </Pill>
            );
          })}
        </div>
      </Card>

      {grouped.map(({ cat, items }) => (
        <Card key={cat.id} title={t(cat.titleKey)} subtitle={t(cat.descKey)}>
          <ol className="flex flex-col gap-3">
            {items.map((tw, idx) => (
              <li
                key={tw.id}
                className="rounded-xl border border-line bg-panel-soft p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-xs text-accent">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-text-dim">
                      {t(tw.pathKey)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
                      {t(tw.optionKey)}
                      <Badge tone="good">{t('pro.tag.recommended')}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-text-soft">
                      {t(tw.reasonKey)}
                    </p>
                    {tw.warnKey && (
                      <p className="mt-2 rounded-lg border border-warn/30 bg-warn/5 px-2 py-1 text-xs text-warn">
                        {t(tw.warnKey)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ))}

      <Card title={t('pro.checklist.title')}>
        <p className="mb-3 text-sm leading-relaxed text-text-soft">
          {t('pro.checklist.lead')}
        </p>
        <ol className="flex flex-col gap-2 text-sm leading-relaxed text-text-soft">
          {[1, 2, 3, 4, 5].map((n) => (
            <li
              key={n}
              className="rounded-xl border border-line bg-panel-soft px-3 py-2"
            >
              <span className="font-mono text-xs text-accent">{n}.</span>{' '}
              {t(`pro.checklist.step${n}`)}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
