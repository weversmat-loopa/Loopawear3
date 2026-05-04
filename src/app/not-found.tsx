import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFoundPage() {
  return (
    <PageShell>
      <p className="text-xs font-medium uppercase tracking-widest text-violet-400/70">
        404
      </p>
      <h1 className="mt-4 bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-500">
        This page doesn&apos;t exist or may have been moved. Try heading back
        to the marketplace or creating something new in the Studio.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/marketplace"
          className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-75"
        >
          Browse marketplace
        </Link>
        <Link
          href="/generate"
          className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Open Studio
        </Link>
      </div>
    </PageShell>
  );
}
