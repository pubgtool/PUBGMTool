/** Soft gold radial light for the corner of a VIP_PANEL. */
export function GoldGlow({ className = "-right-10 -top-12" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.40),transparent_68%)] ${className}`}
    />
  );
}
