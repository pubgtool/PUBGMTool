import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Invite links (/join?ref=CODE) land on the app, which opens registration with the code filled in. */
export default async function JoinPage({ searchParams }: { searchParams: SearchParams }) {
  const { ref } = await searchParams;
  const code = (Array.isArray(ref) ? ref[0] : ref)?.trim() ?? "";
  redirect(/^\d{4,12}$/.test(code) ? `/?ref=${code}` : "/");
}
