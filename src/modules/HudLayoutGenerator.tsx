import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button, Card, Pill, Slider, Stat } from '../components/UI';
import {
  HUD_LAYOUTS,
  cloneLayout,
  type HudButton,
  type HudLayout,
} from '../data/hud';
import { copyToClipboard, makeShareUrl, parseShareHash } from '../utils/share';

const SHARE_PREFIX = 'hud';

export default function HudLayoutGenerator() {
  const { t } = useI18n();
  const [layout, setLayout] = useLocalStorage<HudLayout>(
    'pubgm.hud',
    cloneLayout(HUD_LAYOUTS[0]),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState('');
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fromHash = parseShareHash<HudLayout>(SHARE_PREFIX);
    if (fromHash) setLayout(fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (id: string) => {
    const found = HUD_LAYOUTS.find((l) => l.id === id);
    if (!found) return;
    setLayout(cloneLayout(found));
    setSelected(null);
  };

  const updateButton = (id: string, patch: Partial<HudButton>) => {
    setLayout((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const startDrag = (
    e: React.PointerEvent,
    id: string,
    btn: HudButton,
  ) => {
    e.preventDefault();
    setSelected(id);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = e.clientX - (rect.left + btn.x * rect.width);
    const offsetY = e.clientY - (rect.top + btn.y * rect.height);
    const move = (ev: PointerEvent) => {
      const r = previewRef.current?.getBoundingClientRect();
      if (!r) return;
      const x = (ev.clientX - r.left - offsetX) / r.width;
      const y = (ev.clientY - r.top - offsetY) / r.height;
      updateButton(id, {
        x: Math.max(0.02, Math.min(0.98, x)),
        y: Math.max(0.02, Math.min(0.98, y)),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onShare = async () => {
    const url = makeShareUrl(SHARE_PREFIX, layout);
    const ok = await copyToClipboard(url);
    setShareNote(ok ? t('common.copied') : url);
    setTimeout(() => setShareNote(''), 1500);
  };

  const selBtn = layout.buttons.find((b) => b.id === selected);

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('hud.title')} subtitle={t('hud.lead')}>
        <div className="flex flex-wrap items-center gap-2">
          {HUD_LAYOUTS.map((l) => (
            <Pill
              key={l.id}
              active={layout.id === l.id}
              onClick={() => onPick(l.id)}
            >
              {l.name}
            </Pill>
          ))}
        </div>
        <p className="mt-3 text-sm text-text-soft">{layout.description}</p>
      </Card>

      <Card title="Preview" subtitle={t('hud.previewHint')}>
        <div
          ref={previewRef}
          className="relative w-full overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#1a1f2c] to-[#0f1218]"
          style={{ aspectRatio: '16 / 9' }}
        >
          <SceneBackdrop />
          {layout.buttons.map((b) => (
            <div
              key={b.id}
              onPointerDown={(e) => startDrag(e, b.id, b)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none touch-none rounded-full border-2 grid place-items-center text-[10px] font-semibold uppercase tracking-wider text-white/95 active:cursor-grabbing ${
                selected === b.id
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg'
                  : ''
              }`}
              style={{
                left: `${b.x * 100}%`,
                top: `${b.y * 100}%`,
                width: `calc(${b.size * 100}% * 0.5625)`,
                height: `${b.size * 100}%`,
                backgroundColor: `${b.color}33`,
                borderColor: b.color,
              }}
              title={b.label}
            >
              <span style={{ fontSize: `clamp(8px, ${b.size * 36}px, 16px)` }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs text-text-soft">
            {selBtn ? `${t('common.weapon')}: ${selBtn.label}` : 'Tap a button to edit'}
          </span>
          {selBtn && (
            <div className="flex-1 min-w-48">
              <Slider
                label={t('hud.button.size')}
                min={4}
                max={24}
                value={Math.round(selBtn.size * 100)}
                onChange={(v) => updateButton(selBtn.id, { size: v / 100 })}
                unit="%"
              />
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Buttons" value={layout.buttons.length} />
        <Stat label="Style" value={t(`hud.style.${layout.style}`)} />
        <Stat
          label="Avg size"
          value={`${(
            (layout.buttons.reduce((a, b) => a + b.size, 0) / layout.buttons.length) *
            100
          ).toFixed(1)}%`}
        />
        <Stat
          label="Touch density"
          value={`${(layout.buttons.length / 10).toFixed(1)}/10`}
        />
      </div>

      <Card title={t('common.export') + ' / ' + t('common.share')}>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={onShare}>
            {t('common.share')}
          </Button>
          <Button
            onClick={() => {
              const blob = new Blob([JSON.stringify(layout, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `pubgm-hud-${layout.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {t('common.export')} JSON
          </Button>
          <Button variant="ghost" onClick={() => onPick(HUD_LAYOUTS[0].id)}>
            {t('common.reset')}
          </Button>
          {shareNote && <span className="text-sm text-good">{shareNote}</span>}
        </div>
      </Card>
    </div>
  );
}

function SceneBackdrop() {
  // Static SVG backdrop that hints at "in-game" framing.
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-30"
      viewBox="0 0 320 180"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1d2230" />
          <stop offset="1" stopColor="#11141b" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#sky)" />
      <path d="M0,140 L40,120 L80,135 L120,110 L160,125 L200,100 L240,115 L280,95 L320,118 L320,180 L0,180 Z" fill="#1a1f2c" />
      <path d="M0,160 L60,150 L110,158 L170,142 L220,153 L280,140 L320,148 L320,180 L0,180 Z" fill="#262b39" />
      <circle cx="160" cy="90" r="2" fill="#f5a524" opacity="0.8" />
      <line x1="158" y1="90" x2="162" y2="90" stroke="#f5a524" strokeWidth="0.5" />
      <line x1="160" y1="88" x2="160" y2="92" stroke="#f5a524" strokeWidth="0.5" />
    </svg>
  );
}
