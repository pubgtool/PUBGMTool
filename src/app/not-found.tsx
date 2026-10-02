import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-5xl font-black text-amber-700 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]">404</p>
      <h1 className="mt-3 text-lg font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-fg-secondary">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary mt-6 rounded-2xl px-6 py-3 text-sm">
        Back to Home
      </Link>
    </main>
  );
}
