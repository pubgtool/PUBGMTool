import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-slate-500 hover:text-ink">← Back</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{doc.title}</h1>
      <p className="mt-1 text-xs text-slate-500">Version {doc.version}</p>
      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-6">
          <h2 className="font-medium">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="mt-2 text-sm leading-relaxed text-slate-600">{p}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
