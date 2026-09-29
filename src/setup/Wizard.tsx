import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  STEP_ORDER,
  DEVICE_OPTIONS,
  REFRESH_OPTIONS,
  FPS_OPTIONS,
  PERF_OPTIONS,
  PLAYSTYLE_OPTIONS,
  FINGERS_OPTIONS,
  HAND_OPTIONS,
  GYRO_OPTIONS,
  ADS_OPTIONS,
  WEAPON_OPTIONS,
  PROBLEM_OPTIONS,
  DEFAULT_ANSWERS,
  WIZARD_DRAFT_KEY,
  type StepId,
} from './wizardConfig';
import type { WizardAnswers, WeaponId, ProblemId } from './generator';

function readDraftAnswers(fallback: WizardAnswers): WizardAnswers {
  try {
    const raw = window.localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { answers?: unknown };
    if (!parsed || typeof parsed.answers !== 'object' || parsed.answers === null)
      return fallback;
    return { ...fallback, ...(parsed.answers as Partial<WizardAnswers>) };
  } catch {
    return fallback;
  }
}

function readDraftStep(): number {
  try {
    const raw = window.localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { stepIndex?: unknown };
    return typeof parsed.stepIndex === 'number' &&
      parsed.stepIndex >= 0 &&
      parsed.stepIndex < STEP_ORDER.length
      ? parsed.stepIndex
      : 0;
  } catch {
    return 0;
  }
}


export function Wizard({
  initial,
  onCancel,
  onFinish,
}: {
  initial?: WizardAnswers;
  onCancel: () => void;
  onFinish: (a: WizardAnswers) => void;
}) {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<WizardAnswers>(
    () => readDraftAnswers(initial ?? DEFAULT_ANSWERS),
  );
  const [stepIndex, setStepIndex] = useState(() => readDraftStep());
  const [confirmExit, setConfirmExit] = useState(false);
  const advanceTimer = useRef<number | null>(null);
  const stepId = STEP_ORDER[stepIndex];
  const isLast = stepIndex === STEP_ORDER.length - 1;
  const progress = ((stepIndex + 1) / STEP_ORDER.length) * 100;
  // Weapons needs an explicit pick; problems is optional (skippable).
  const canNext = stepId === 'weapons' ? answers.weapons.length > 0 : true;

  // Persist the draft so an interrupted run resumes where it left off.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        WIZARD_DRAFT_KEY,
        JSON.stringify({ answers, stepIndex }),
      );
    } catch {
      // ignore quota / privacy mode failures
    }
  }, [answers, stepIndex]);

  // Keep the question visible when the step changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stepIndex]);

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  function update<K extends keyof WizardAnswers>(key: K, value: WizardAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  // Single-choice steps commit + auto-advance so a tap never needs a second one.
  function chooseAndNext(patch: Partial<WizardAnswers>) {
    setAnswers((a) => ({ ...a, ...patch }));
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
    }, 180);
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(WIZARD_DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  function finish(a: WizardAnswers) {
    clearDraft();
    onFinish(a);
  }

  function next() {
    if (!canNext) return;
    if (isLast) finish(answers);
    else setStepIndex((i) => i + 1);
  }
  function back() {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    if (stepIndex === 0) requestExit();
    else setStepIndex((i) => i - 1);
  }

  const dirty =
    JSON.stringify(answers) !== JSON.stringify(initial ?? DEFAULT_ANSWERS);

  function requestExit() {
    if (dirty) setConfirmExit(true);
    else onCancel();
  }

  function discardAndExit() {
    clearDraft();
    onCancel();
   }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar with progress */}
      <header className="sticky top-0 z-20 bg-bg/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={requestExit}
            aria-label={t('wizard.close')}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-panel/80 text-text-soft hover:text-text"
          >
            <X className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <div className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-text-dim">
            {t('wizard.step.of')
              .replace('{{current}}', String(stepIndex + 1))
              .replace('{{total}}', String(STEP_ORDER.length))}
          </div>
          <div className="w-9" />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel-soft">
          <div
            className="hero-grad h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-5 pb-32 pt-6">
        <h2 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-tight text-text">
          {t(`wizard.step.${stepId}.title`)}
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-text-soft">
          {t(`wizard.step.${stepId}.desc`)}
        </p>

        <div className="mt-6">
          <Step
            stepId={stepId}
            answers={answers}
            update={update}
            choose={chooseAndNext}
          />
        </div>
      </main>

      {/* Floating bottom bar */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[440px] items-center gap-2 px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}
      >
        <button
          onClick={back}
          className="pointer-events-auto inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-line bg-panel/95 px-4 text-[13.5px] font-bold text-text-soft backdrop-blur-xl transition hover:text-text active:scale-[0.97]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          <span>{t('wizard.back')}</span>
        </button>
        {stepId === 'problems' && answers.problems.length === 0 && (
          <button
            onClick={() => finish(answers)}
            className="pointer-events-auto inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-panel/95 px-4 text-[13.5px] font-bold text-text-soft backdrop-blur-xl transition hover:text-text active:scale-[0.97]"
          >
            {t('wizard.skip')}
          </button>
        )}
        <button
          onClick={next}
          disabled={!canNext}
          className="pointer-events-auto hero-grad inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[14.5px] font-bold text-white shadow-[0_10px_30px_-8px_rgb(var(--module-accent)/0.7)] transition active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
        >
          <span>{isLast ? t('wizard.finish') : t('wizard.next')}</span>
          <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
        </button>
      </div>

      {confirmExit && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-6"
          role="alertdialog"
          aria-modal="true"
          aria-label={t('wizard.exit.title')}
        >
          <div className="w-full max-w-[340px] rounded-3xl border border-line bg-panel p-5">
            <h2 className="font-display text-[17px] font-bold text-text">
              {t('wizard.exit.title')}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-soft">
              {t('wizard.exit.body')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={discardAndExit}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-bad/30 bg-bad/15 px-3 text-[13.5px] font-bold text-bad transition active:scale-[0.97]"
              >
                {t('wizard.exit.discard')}
              </button>
              <button
                onClick={() => setConfirmExit(false)}
                className="hero-grad inline-flex h-11 items-center justify-center rounded-2xl px-3 text-[13.5px] font-bold text-white transition active:scale-[0.97]"
              >
                {t('wizard.exit.keep')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({
  stepId,
  answers,
  update,
  choose,
}: {
  stepId: StepId;
  answers: WizardAnswers;
  update: <K extends keyof WizardAnswers>(key: K, value: WizardAnswers[K]) => void;
  choose: (patch: Partial<WizardAnswers>) => void;
}) {
  const { t } = useI18n();

  if (stepId === 'device') {
    return (
      <OptionList>
        {DEVICE_OPTIONS.map((d) => (
          <OptionRow
            key={d.id}
            label={d.label}
            sublabel={`${d.tier} · ${d.refresh} Hz`}
            active={answers.device === d.id}
            onClick={() =>
              choose({ device: d.id, tier: d.tier, refresh: d.refresh })
            }
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'refresh') {
    return (
      <OptionList>
        {REFRESH_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={t(o.labelKey)}
            active={answers.refresh === o.value}
            onClick={() => choose({ refresh: o.value })}
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'fps') {
    return (
      <OptionList>
        {FPS_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={t(o.labelKey)}
            sublabel={t(o.descKey)}
            active={answers.fps === o.value}
            onClick={() => choose({ fps: o.value })}
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'performance') {
    return (
      <OptionList>
        {PERF_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={t(o.labelKey)}
            sublabel={t(o.descKey)}
            active={answers.tier === o.value}
            onClick={() => choose({ tier: o.value })}
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'playstyle') {
    return (
      <OptionList>
        {PLAYSTYLE_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={t(o.labelKey)}
            sublabel={t(o.descKey)}
            active={answers.playstyle === o.value}
            onClick={() => choose({ playstyle: o.value })}
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'fingers') {
    return (
      <OptionList>
        {FINGERS_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={t(o.labelKey)}
            sublabel={t(o.descKey)}
            active={answers.fingers === o.value}
            onClick={() => choose({ fingers: o.value })}
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'hand') {
    return (
      <OptionList>
        {HAND_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={t(o.labelKey)}
            active={answers.hand === o.value}
            onClick={() => choose({ hand: o.value })}
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'gyro') {
    return (
      <OptionList>
        {GYRO_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={t(o.labelKey)}
            sublabel={t(o.descKey)}
            active={answers.gyroMode === o.value}
            onClick={() => choose({ gyroMode: o.value })}
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'ads') {
    return (
      <OptionList>
        {ADS_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={t(o.labelKey)}
            sublabel={t(o.descKey)}
            active={answers.adsMode === o.value}
            onClick={() => choose({ adsMode: o.value })}
          />
        ))}
      </OptionList>
    );
  }

  if (stepId === 'weapons') {
    const selected = answers.weapons;
    function toggle(w: WeaponId) {
      const has = selected.includes(w);
      if (has) update('weapons', selected.filter((x) => x !== w));
      else if (selected.length < 3) update('weapons', [...selected, w]);
    }
    return (
      <div>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-soft/70 px-3 py-1 text-[11.5px] font-semibold text-text-soft">
          {t('wizard.weapons.max')} · {selected.length}/3
        </div>
        <div className="grid grid-cols-2 gap-2">
          {WEAPON_OPTIONS.map((w) => {
            const active = selected.includes(w.value);
            return (
              <button
                key={w.value}
                onClick={() => toggle(w.value)}
                className={`flex flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.97] ${
                  active
                    ? 'hero-grad border-transparent text-white shadow-[0_6px_16px_-6px_rgb(var(--module-accent)/0.6)]'
                    : 'border-line bg-panel-soft/60 text-text hover:bg-panel'
                }`}
              >
                <span className="font-display text-[14px] font-bold">
                  {w.label}
                </span>
                <span
                  className={`text-[10.5px] font-semibold uppercase tracking-wider ${
                    active ? 'text-white/85' : 'text-text-dim'
                  }`}
                >
                  {w.cat}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (stepId === 'problems') {
    const selected = answers.problems;
    function toggle(p: ProblemId) {
      const has = selected.includes(p);
      if (has) update('problems', selected.filter((x) => x !== p));
      else update('problems', [...selected, p]);
    }
    return (
      <div>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-soft/70 px-3 py-1 text-[11.5px] font-semibold text-text-soft">
          {t('wizard.problems.max')} · {selected.length}
        </div>
        <div className="space-y-2">
          {PROBLEM_OPTIONS.map((p) => {
            const active = selected.includes(p.value);
            return (
              <button
                key={p.value}
                onClick={() => toggle(p.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.98] ${
                  active
                    ? 'module-tint border-transparent shadow-[0_4px_14px_-4px_rgb(var(--module-accent)/0.5)]'
                    : 'border-line bg-panel-soft/60 text-text hover:bg-panel'
                }`}
              >
                <span className="text-[13.5px] font-medium leading-snug">
                  {t(p.labelKey)}
                </span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                    active
                      ? 'hero-grad text-white'
                      : 'border border-line bg-bg text-text-dim'
                  }`}
                >
                  {active ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

function OptionList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

function OptionRow({
  label,
  sublabel,
  active,
  onClick,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.98] ${
        active
          ? 'hero-grad border-transparent text-white shadow-[0_8px_24px_-8px_rgb(var(--module-accent)/0.6)]'
          : 'border-line bg-panel-soft/60 text-text hover:bg-panel'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div
          className={`font-display text-[15px] font-bold ${
            active ? 'text-white' : 'text-text'
          }`}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className={`mt-0.5 text-[12.5px] leading-snug ${
              active ? 'text-white/80' : 'text-text-soft'
            }`}
          >
            {sublabel}
          </div>
        )}
      </div>
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
          active ? 'bg-white/25 text-white' : 'border border-line bg-bg text-text-dim'
        }`}
      >
        {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
