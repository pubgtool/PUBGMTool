import type { ReactNode, ButtonHTMLAttributes, SelectHTMLAttributes, InputHTMLAttributes } from 'react';

export function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="hud-corners relative rounded-xl border border-line bg-panel/95 p-4 shadow-[0_2px_0_0_rgba(255,255,255,0.04)_inset,0_8px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      {/* Top accent strip */}
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      {(title || right) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="bracket-l">
            {title && (
              <h2 className="font-display text-[15px] font-bold tracking-[0.06em] text-text">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-text-soft">{subtitle}</p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({
  variant = 'default',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
}) {
  const base =
    'btn-glow inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-display font-bold uppercase tracking-[0.08em] transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none';
  const map = {
    default:
      'bg-panel-soft text-text hover:bg-line border border-line hover:border-accent/60',
    primary:
      'bg-gradient-to-b from-accent to-[#d8881a] text-bg border border-accent shadow-[0_4px_18px_-6px_rgba(245,165,36,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110',
    ghost: 'text-text-soft hover:text-accent hover:bg-panel-soft',
    danger:
      'bg-gradient-to-b from-bad to-[#b91c1c] text-white border border-bad/70 shadow-[0_4px_18px_-6px_rgba(239,68,68,0.7)]',
  } as const;
  return <button className={`${base} ${map[variant]} ${className}`} {...rest} />;
}

export function Pill({
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-display font-semibold uppercase tracking-[0.06em] transition border ${
        active
          ? 'pill-pulse bg-gradient-to-b from-accent to-[#d8881a] text-bg border-accent'
          : 'bg-panel-soft text-text-soft border-line hover:text-accent hover:border-accent/60'
      } ${rest.className ?? ''}`}
    />
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 300,
  step = 1,
  label,
  unit,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: ReactNode;
  unit?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label !== undefined && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-display uppercase tracking-[0.06em] text-text-soft">{label}</span>
          <span className="font-mono text-[13px] font-semibold text-accent">
            {value}
            {unit ?? ''}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Select({
  className = '',
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`w-full rounded-md border border-line bg-panel-soft px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ${className}`}
    />
  );
}

export function NumberInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      {...rest}
      className={`w-full rounded-md border border-line bg-panel-soft px-3 py-2 font-mono text-sm text-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ${className}`}
    />
  );
}

export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-md border border-line bg-panel-soft px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ${className}`}
    />
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'accent';
}) {
  const color =
    tone === 'good'
      ? 'text-good'
      : tone === 'warn'
        ? 'text-warn'
        : tone === 'bad'
          ? 'text-bad'
          : tone === 'accent'
            ? 'text-accent'
            : 'text-text';
  const ringColor =
    tone === 'good'
      ? 'shadow-[0_0_20px_-4px_rgba(74,222,128,0.5)]'
      : tone === 'bad'
        ? 'shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
        : tone === 'accent' || tone === 'default'
          ? 'shadow-[0_0_20px_-4px_rgba(245,165,36,0.4)]'
          : '';
  return (
    <div
      className={`relative overflow-hidden rounded-md border border-line bg-gradient-to-b from-panel-soft to-panel p-3 ${ringColor}`}
    >
      <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(245,165,36,0.8)]" />
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-text-dim">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-text-soft">{hint}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'accent';
}) {
  const map = {
    default: 'border-line text-text-soft bg-panel-soft',
    good: 'border-good/50 text-good bg-good/10',
    warn: 'border-warn/50 text-warn bg-warn/10',
    bad: 'border-bad/50 text-bad bg-bad/10',
    accent: 'border-accent/50 text-accent bg-accent/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.1em] ${map[tone]}`}
    >
      {children}
    </span>
  );
}
