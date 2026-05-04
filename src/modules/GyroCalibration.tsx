import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { Button, Card, Slider, Stat } from '../components/UI';

type Step = 'idle' | 'permission' | 'yaw' | 'pitch' | 'done' | 'unsupported';

interface OrientationLike {
  alpha: number | null; // yaw
  beta: number | null; // pitch
  gamma: number | null; // roll
}

interface SensorWindow {
  DeviceOrientationEvent?: typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
}

export default function GyroCalibration() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('idle');
  const [orientation, setOrientation] = useState<OrientationLike>({
    alpha: null,
    beta: null,
    gamma: null,
  });
  const startAlpha = useRef<number | null>(null);
  const startBeta = useRef<number | null>(null);
  const [yawDelta, setYawDelta] = useState(0);
  const [pitchDelta, setPitchDelta] = useState(0);
  const [pollSensitivity, setPollSensitivity] = useState(180);

  // Calculator-mode state
  const [neckSwipeDeg, setNeckSwipeDeg] = useState(180);
  const [pixelSwipe, setPixelSwipe] = useState(150);
  const [phoneFps, setPhoneFps] = useState<60 | 90 | 120>(90);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      setOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma });
    };
    if (
      typeof window !== 'undefined' &&
      'DeviceOrientationEvent' in window
    ) {
      if (step === 'yaw' || step === 'pitch') {
        window.addEventListener('deviceorientation', handler);
      }
    }
    return () => window.removeEventListener('deviceorientation', handler);
  }, [step]);

  useEffect(() => {
    if (step === 'yaw' && orientation.alpha != null) {
      if (startAlpha.current == null) startAlpha.current = orientation.alpha;
      const delta = shortestArc(orientation.alpha - startAlpha.current);
      setYawDelta(delta);
    } else if (step === 'pitch' && orientation.beta != null) {
      if (startBeta.current == null) startBeta.current = orientation.beta;
      setPitchDelta(orientation.beta - startBeta.current);
    }
  }, [orientation, step]);

  const requestPermission = async () => {
    const w = window as SensorWindow;
    const Cls = w.DeviceOrientationEvent;
    if (!Cls) {
      setStep('unsupported');
      return;
    }
    if (typeof Cls.requestPermission === 'function') {
      try {
        const result = await Cls.requestPermission();
        if (result !== 'granted') {
          setStep('unsupported');
          return;
        }
      } catch {
        setStep('unsupported');
        return;
      }
    }
    startAlpha.current = null;
    startBeta.current = null;
    setYawDelta(0);
    setPitchDelta(0);
    setStep('yaw');
  };

  const next = () => {
    if (step === 'yaw') {
      startBeta.current = null;
      setStep('pitch');
    } else if (step === 'pitch') {
      setStep('done');
    } else if (step === 'done') {
      setStep('idle');
    }
  };

  // Sensitivity recommendation derived from "how far did the player physically rotate
  // versus how far the camera should travel" — the higher the rotation needed, the
  // higher the gyro sensitivity to compensate.
  const recommendation = (() => {
    const targetCameraTurn = 180; // degrees we want to map to the swipe
    const measured = Math.abs(yawDelta) || neckSwipeDeg;
    const factor = targetCameraTurn / Math.max(30, measured);
    // Map factor (0.5 .. 3) onto sensitivity 80..300
    const s = Math.min(300, Math.max(80, Math.round(120 * factor)));
    return s;
  })();

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('gyro.title')} subtitle={t('gyro.lead')}>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={requestPermission}>
            {t('gyro.startSensor')}
          </Button>
          <Button onClick={() => setStep('idle')}>{t('gyro.calculator')}</Button>
        </div>
      </Card>

      {step === 'unsupported' && (
        <Card>
          <p className="text-sm text-warn">{t('gyro.notSupported')}</p>
        </Card>
      )}

      {step === 'yaw' && (
        <Card title={t('gyro.step.180')}>
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label={t('gyro.targetRotation')}
              value="180°"
              tone="warn"
            />
            <Stat
              label={t('gyro.measured')}
              value={`${Math.abs(yawDelta).toFixed(1)}°`}
              tone={Math.abs(Math.abs(yawDelta) - 180) < 8 ? 'good' : 'default'}
            />
          </div>
          <ProgressBar
            value={Math.min(100, (Math.abs(yawDelta) / 180) * 100)}
          />
          <Button className="mt-3" variant="primary" onClick={next}>
            {t('common.next')}
          </Button>
        </Card>
      )}

      {step === 'pitch' && (
        <Card title={t('gyro.step.90')}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t('gyro.targetRotation')} value="90°" tone="warn" />
            <Stat
              label={t('gyro.measured')}
              value={`${Math.abs(pitchDelta).toFixed(1)}°`}
              tone={Math.abs(Math.abs(pitchDelta) - 90) < 8 ? 'good' : 'default'}
            />
          </div>
          <ProgressBar
            value={Math.min(100, (Math.abs(pitchDelta) / 90) * 100)}
          />
          <Button className="mt-3" variant="primary" onClick={next}>
            {t('common.next')}
          </Button>
        </Card>
      )}

      {step === 'done' && (
        <Card title={t('gyro.suggestedSensitivity')}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Gyro 6x/8x" value={Math.round(recommendation * 0.55)} tone="good" />
            <Stat label="Gyro 4x" value={Math.round(recommendation * 0.85)} tone="good" />
            <Stat label="Gyro 2x/3x" value={recommendation} tone="good" />
            <Stat label="Gyro Red Dot" value={Math.min(300, Math.round(recommendation * 1.4))} tone="good" />
          </div>
          <p className="mt-3 text-xs text-text-soft">
            Скопируй значения в Settings → Sensitivity → Gyroscope. Если на дистанции пуля «улетает вверх» —
            понижай 4x/6x/8x на 10–20 единиц.
          </p>
          <Button className="mt-3" onClick={next}>
            {t('common.restart')}
          </Button>
        </Card>
      )}

      <Card title={t('gyro.calculator')}>
        <p className="mb-3 text-sm text-text-soft">
          Не работает датчик? Прикинь чувствительность по тому, насколько ты привык
          крутить телефон, чтобы повернуть камеру на 180°.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider
            label="Сколько градусов крутишь телефон"
            min={45}
            max={300}
            value={neckSwipeDeg}
            onChange={setNeckSwipeDeg}
            unit="°"
          />
          <Slider
            label="Размер свайпа большим пальцем"
            min={50}
            max={400}
            value={pixelSwipe}
            onChange={setPixelSwipe}
            unit="px"
          />
          <Slider
            label="Текущая Gyro Sens (общий уровень)"
            min={50}
            max={300}
            value={pollSensitivity}
            onChange={setPollSensitivity}
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-soft">FPS режим</span>
            <div className="flex gap-2">
              {[60, 90, 120].map((f) => (
                <button
                  key={f}
                  onClick={() => setPhoneFps(f as 60 | 90 | 120)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                    phoneFps === f
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line bg-panel-soft text-text-soft'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Red Dot" value={Math.min(300, Math.round(recommendation * 1.4))} />
          <Stat label="2x / 3x" value={recommendation} />
          <Stat label="4x" value={Math.round(recommendation * 0.85)} />
          <Stat label="6x / 8x" value={Math.round(recommendation * 0.55)} />
        </div>
        <p className="mt-2 text-xs text-text-dim">
          {phoneFps >= 90
            ? 'High-FPS режим: гиро отклик быстрее — не повышай sens сверх рекомендации.'
            : '60 FPS: для компенсации latency можно поднять sens на 5–10 единиц.'}
        </p>
      </Card>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
      <div
        className="h-full bg-accent transition-all"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function shortestArc(deltaDeg: number): number {
  let d = deltaDeg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
