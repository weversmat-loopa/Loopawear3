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
      <p className="font-marker text-2xl text-brand-orange">
        Oops
      </p>
      <h1 className="mt-4 font-display text-3xl text-ink">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-500">
        An unexpected error occurred. You can try again or head back to a safe
        page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="sticker-sm rounded-full bg-brand-blue px-6 py-2.5 text-sm font-extrabold text-white"
        >
          Try again
        </button>
        <Link
          href="/marketplace"
          className="sticker-sm rounded-full bg-paper px-6 py-2.5 text-sm font-extrabold text-ink"
        >
          Browse marketplace
        </Link>
        <Link
          href="/"
          className="sticker-sm rounded-full bg-paper px-6 py-2.5 text-sm font-extrabold text-ink"
        >
          Home
        </Link>
      </div>
    </PageShell>
  );
}
