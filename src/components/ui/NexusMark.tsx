/** The platform mark: a bold N with a gold node, in a fine ring. */
export function NexusMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex items-center justify-center rounded-full border border-gray-200 bg-white ${className}`}>
      <svg viewBox="0 0 32 32" className="h-3/5 w-3/5">
        <path d="M7 26V7l18 18V7" fill="none" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="7" r="2.8" fill="#D4A017" />
      </svg>
    </span>
  );
}
