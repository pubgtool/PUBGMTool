import type {
  ReactNode,
  ButtonHTMLAttributes,
  SelectHTMLAttributes,
  InputHTMLAttributes,
} from 'react';

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
    <section className="card-glass relative overflow-hidden rounded-3xl border border-line bg-panel/80 p-5 backdrop-blur-sm">
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-[17px] font-bold tracking-tight text-text">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-[13.5px] leading-relaxed text-text-soft">
                {subtitle}
              </p>
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
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[14px] font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none';
  const map = {
    default:
      'bg-panel-soft text-text hover:bg-line border border-line',
    primary:
      'hero-grad text-white shadow-[0_8px_24px_-6px_rgb(var(--module-accent)/0.6)]',
    ghost: 'text-text-soft hover:text-text hover:bg-panel-soft',
    danger: 'bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25',
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition active:scale-[0.97] ${
        active
          ? 'hero-grad text-white shadow-[0_4px_14px_-4px_rgb(var(--module-accent)/0.6)]'
          : 'border border-line bg-panel-soft text-text-soft hover:text-text'
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
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-text-soft">{label}</span>
          <span className="font-mono text-[13px] font-bold text-module">
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
      className={`w-full rounded-2xl border border-line bg-panel-soft px-4 py-3 text-[14px] text-text focus:border-line-bright focus:outline-none ${className}`}
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
      className={`w-full rounded-2xl border border-line bg-panel-soft px-4 py-3 font-mono text-[14px] text-text focus:border-line-bright focus:outline-none ${className}`}
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
      className={`w-full rounded-2xl border border-line bg-panel-soft px-4 py-3 text-[14px] text-text focus:border-line-bright focus:outline-none ${className}`}
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
            ? 'text-module'
            : 'text-text';
  return (
    <div className="card-glass rounded-2xl border border-line bg-panel-soft/60 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
        {label}
      </div>
      <div className={`mt-1.5 font-display text-[26px] font-bold ${color}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[12px] text-text-soft">{hint}</div>}
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
    good: 'border-good/30 text-good bg-good/10',
    warn: 'border-warn/30 text-warn bg-warn/10',
    bad: 'border-bad/30 text-bad bg-bad/10',
    accent: 'border-line text-module module-tint',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${map[tone]}`}
    >
      {children}
    </span>
  );
}
