import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "VIP Control Matrix",
  robots: { index: false, follow: false },
};

export default function AdminMatrixPage() {
  return (
    <main className="flex-1 px-4 pb-8 pt-6">
      <Link
        href="/"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-full border border-gray-200 bg-surface pl-2.5 pr-4 text-sm font-semibold text-fg-secondary outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <header className="relative mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <span aria-hidden className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-btn">
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">VIP Control Matrix</h1>
        </div>
      </header>

      <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-surface px-5 py-6 text-sm text-fg-secondary">
        The tier control grid is coming in an upcoming update.
      </p>
    </main>
  );
}
