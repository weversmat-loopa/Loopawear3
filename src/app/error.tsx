"use client";

import Link from "next/link";
import PageShell from "@/components/layout/PageShell";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <PageShell>
      <p className="text-xs font-medium uppercase tracking-widest text-violet-400/70">
        Error
      </p>
      <h1 className="mt-4 bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-500">
        An unexpected error occurred. You can try again or head back to a safe
        page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-75"
        >
          Try again
        </button>
        <Link
          href="/marketplace"
          className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Browse marketplace
        </Link>
        <Link
          href="/"
          className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Home
        </Link>
      </div>
    </PageShell>
  );
}
