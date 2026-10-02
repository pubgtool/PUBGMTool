import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ScrollText } from "lucide-react";
import { LEGAL_SLUGS, getLegalDocument } from "@/content/legal";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const doc = getLegalDocument((await params).slug);
  return doc ? { title: doc.title, description: doc.summary } : {};
}

export default async function LegalPage({ params }: { params: Params }) {
  const doc = getLegalDocument((await params).slug);
  if (!doc) notFound();

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
        <div className="relative flex items-start gap-3">
          <span className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-btn">
            <ScrollText className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{doc.title}</h1>
            <p className="mt-2 inline-flex rounded-full border border-slate-100 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-700">
              Version {doc.version}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-3">
        {doc.sections.map((s) => (
          <section key={s.heading} className="rounded-2xl border border-gray-200 bg-surface p-5">
            <h2 className="text-sm font-bold text-amber-700">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-fg-secondary">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
