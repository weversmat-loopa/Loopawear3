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
      <p className="font-marker text-4xl text-brand-orange">
        404
      </p>
      <h1 className="mt-4 font-display text-3xl text-ink">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-500">
        This page doesn&apos;t exist or may have been moved. Try heading back
        to the marketplace or creating something new in the Studio.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/marketplace"
          className="sticker-sm rounded-full bg-brand-blue px-6 py-2.5 text-sm font-extrabold text-white"
        >
          Browse marketplace
        </Link>
        <Link
          href="/generate"
          className="sticker-sm rounded-full bg-paper px-6 py-2.5 text-sm font-extrabold text-ink"
        >
          Open Studio
        </Link>
      </div>
    </PageShell>
  );
}
