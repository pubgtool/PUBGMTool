import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VIP Control Matrix",
  robots: { index: false, follow: false },
};

export default function AdminMatrixPage() {
  return (
    <main className="flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-slate-500 hover:text-ink">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">VIP Control Matrix</h1>
      <p className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
        The tier control grid arrives in an upcoming build step.
      </p>
    </main>
  );
}
