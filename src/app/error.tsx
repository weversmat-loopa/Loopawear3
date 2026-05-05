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
      <h1 className="mt-4 bg-gradient-to-b from-zinc-900 to-zinc-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-white dark:to-zinc-300">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-500">
        An unexpected error occurred. You can try again or head back to a safe
        page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          Try again
        </button>
        <Link
          href="/marketplace"
          className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
        >
          Browse marketplace
        </Link>
        <Link
          href="/"
          className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
        >
          Home
        </Link>
      </div>
    </PageShell>
  );
}
