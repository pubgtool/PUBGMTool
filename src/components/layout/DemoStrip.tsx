/** One slim, constant marker in place of scattered banners. */
export function DemoStrip() {
  return (
    <div
      role="note"
      data-testid="demo-strip"
      className="flex items-center justify-center gap-2 border-b border-amber-200/70 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Demo mode · balances and activity are not real
    </div>
  );
}
