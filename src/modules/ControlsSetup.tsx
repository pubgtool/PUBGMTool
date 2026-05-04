import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { Badge, Card, Pill } from '../components/UI';

type IssueId =
  | 'gyro_off_in_ads'
  | 'fire_button_drag'
  | 'ads_doesnt_hold'
  | 'screen_jumps_on_shoot';

interface DiagnosisStep {
  question: string;
  fix: string;
}

interface SettingPath {
  pathKey: string; // i18n key for the breadcrumb
  optionKey: string; // i18n key for the recommended option
  reasonKey: string;
  badKey?: string;
}

export default function ControlsSetup() {
  const { t } = useI18n();
  const [openIssue, setOpenIssue] = useState<IssueId | null>(
    'gyro_off_in_ads',
  );

  const issues: { id: IssueId; titleKey: string; steps: DiagnosisStep[] }[] =
    useMemo(
      () => [
        {
          id: 'gyro_off_in_ads',
          titleKey: 'controls.issue.gyro_off_in_ads.title',
          steps: [
            {
              question: t('controls.issue.gyro_off_in_ads.q1'),
              fix: t('controls.issue.gyro_off_in_ads.f1'),
            },
            {
              question: t('controls.issue.gyro_off_in_ads.q2'),
              fix: t('controls.issue.gyro_off_in_ads.f2'),
            },
            {
              question: t('controls.issue.gyro_off_in_ads.q3'),
              fix: t('controls.issue.gyro_off_in_ads.f3'),
            },
          ],
        },
        {
          id: 'fire_button_drag',
          titleKey: 'controls.issue.fire_button_drag.title',
          steps: [
            {
              question: t('controls.issue.fire_button_drag.q1'),
              fix: t('controls.issue.fire_button_drag.f1'),
            },
            {
              question: t('controls.issue.fire_button_drag.q2'),
              fix: t('controls.issue.fire_button_drag.f2'),
            },
          ],
        },
        {
          id: 'ads_doesnt_hold',
          titleKey: 'controls.issue.ads_doesnt_hold.title',
          steps: [
            {
              question: t('controls.issue.ads_doesnt_hold.q1'),
              fix: t('controls.issue.ads_doesnt_hold.f1'),
            },
          ],
        },
        {
          id: 'screen_jumps_on_shoot',
          titleKey: 'controls.issue.screen_jumps_on_shoot.title',
          steps: [
            {
              question: t('controls.issue.screen_jumps_on_shoot.q1'),
              fix: t('controls.issue.screen_jumps_on_shoot.f1'),
            },
            {
              question: t('controls.issue.screen_jumps_on_shoot.q2'),
              fix: t('controls.issue.screen_jumps_on_shoot.f2'),
            },
          ],
        },
      ],
      [t],
    );

  const recommended: SettingPath[] = useMemo(
    () => [
      {
        pathKey: 'controls.path.gyro_mode',
        optionKey: 'controls.option.always_on',
        reasonKey: 'controls.reason.always_on',
        badKey: 'controls.bad.scope_on',
      },
      {
        pathKey: 'controls.path.fire_button_mode',
        optionKey: 'controls.option.tap_fire',
        reasonKey: 'controls.reason.tap_fire',
        badKey: 'controls.bad.drag_fire',
      },
      {
        pathKey: 'controls.path.peek_and_fire',
        optionKey: 'controls.option.peek_and_fire',
        reasonKey: 'controls.reason.peek_and_fire',
      },
      {
        pathKey: 'controls.path.ads_mode',
        optionKey: 'controls.option.ads_hold',
        reasonKey: 'controls.reason.ads_hold',
      },
      {
        pathKey: 'controls.path.smart_aim_assist',
        optionKey: 'controls.option.aim_assist_on',
        reasonKey: 'controls.reason.aim_assist_on',
      },
      {
        pathKey: 'controls.path.scope_3d_touch',
        optionKey: 'controls.option.scope_3d_touch_off',
        reasonKey: 'controls.reason.scope_3d_touch_off',
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('controls.title')} subtitle={t('controls.lead')}>
        <p className="text-sm leading-relaxed text-text-soft">
          {t('controls.intro')}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(['gyro', 'fire', 'ads'] as const).map((tag) => (
            <div
              key={tag}
              className="rounded-xl border border-line bg-panel-soft p-3"
            >
              <div className="text-xs uppercase tracking-wider text-text-dim">
                {t(`controls.tag.${tag}`)}
              </div>
              <p className="mt-1 text-sm text-text-soft">
                {t(`controls.tag.${tag}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title={t('controls.recommended.title')}
        subtitle={t('controls.recommended.lead')}
      >
        <ol className="flex flex-col gap-3">
          {recommended.map((s, idx) => (
            <li
              key={s.pathKey}
              className="rounded-xl border border-line bg-panel-soft p-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-xs text-accent">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-text-dim">
                    {t(s.pathKey)}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-text">
                    {t(s.optionKey)}{' '}
                    <Badge tone="good">{t('controls.recommended.tag')}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-text-soft">
                    {t(s.reasonKey)}
                  </p>
                  {s.badKey && (
                    <p className="mt-2 rounded-lg border border-bad/30 bg-bad/5 px-2 py-1 text-xs text-bad">
                      {t(s.badKey)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card
        title={t('controls.troubleshoot.title')}
        subtitle={t('controls.troubleshoot.lead')}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {issues.map((iss) => (
            <Pill
              key={iss.id}
              active={openIssue === iss.id}
              onClick={() =>
                setOpenIssue((cur) => (cur === iss.id ? null : iss.id))
              }
            >
              {t(iss.titleKey)}
            </Pill>
          ))}
        </div>
        {openIssue && (
          <ol className="flex flex-col gap-2">
            {issues
              .find((i) => i.id === openIssue)
              ?.steps.map((st, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-line bg-panel-soft p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-warn/15 font-mono text-xs text-warn">
                      ?
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text">
                        {st.question}
                      </div>
                      <div className="mt-1 flex items-start gap-2 text-sm text-text-soft">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-good/20 font-mono text-[10px] text-good">
                          ✓
                        </span>
                        <span>{st.fix}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ol>
        )}
      </Card>

      <Card title={t('controls.gyroAds.title')}>
        <p className="text-sm leading-relaxed text-text-soft">
          {t('controls.gyroAds.body1')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-soft">
          {t('controls.gyroAds.body2')}
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-good/30 bg-good/5 p-3">
            <div className="text-xs uppercase tracking-wider text-good">
              {t('controls.gyroAds.do')}
            </div>
            <ul className="mt-1 space-y-1 text-sm text-text-soft">
              <li>• {t('controls.gyroAds.do.1')}</li>
              <li>• {t('controls.gyroAds.do.2')}</li>
              <li>• {t('controls.gyroAds.do.3')}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-bad/30 bg-bad/5 p-3">
            <div className="text-xs uppercase tracking-wider text-bad">
              {t('controls.gyroAds.dont')}
            </div>
            <ul className="mt-1 space-y-1 text-sm text-text-soft">
              <li>• {t('controls.gyroAds.dont.1')}</li>
              <li>• {t('controls.gyroAds.dont.2')}</li>
              <li>• {t('controls.gyroAds.dont.3')}</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
