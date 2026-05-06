import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Order received",
  robots: { index: false },
};

export default function CheckoutSuccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <svg
            className="h-5 w-5 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Order received!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Payment confirmed. A receipt has been sent to your email by Stripe.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          We&apos;ll process your order and update you when it ships.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Browse marketplace →
          </Link>
          <Link
            href="/account"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Back to account
          </Link>
        </div>
      </div>
    </main>
  );
}
