import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Payment cancelled",
  robots: { index: false },
};

export default function CheckoutCancelPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Payment cancelled
        </h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          No charge was made. You can return to the marketplace whenever you&apos;re ready.
        </p>

        <div className="mt-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            ← Back to marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}
