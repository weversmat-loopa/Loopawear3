import type { Metadata } from "next";
import Link from "next/link";
import { businessInfo } from "@/lib/legal/businessInfo";
import LegalDraftBanner from "@/components/legal/LegalDraftBanner";

export const metadata: Metadata = {
  title: "Refund & Return Policy",
  description:
    "How returns, refunds, and defective items are handled on Loopawear.",
};

export default function RefundsPage() {
  return (
    <>
      <LegalDraftBanner />
      <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <article className="mx-auto w-full max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Refund &amp; Return Policy
          </h1>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Last updated 7 May 2026
          </p>
        </header>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            1. The 14-day right of withdrawal does not apply
          </h2>
          <p>
            Every Loopawear item is produced on demand from a design chosen by
            you. Under Article VI.53 §3 of the Belgian Code of Economic Law
            (implementing Article 16(c) of Directive 2011/83/EU on consumer
            rights), goods that are made to consumer specifications or are
            clearly personalised are excluded from the 14-day right of
            withdrawal that normally applies to distance sales.
          </p>
          <p>
            By placing an order you acknowledge that this exemption applies and
            that you cannot cancel a confirmed order for a refund of the
            purchase price unless the item is defective or differs from what
            you ordered.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            2. Defective or damaged items
          </h2>
          <p>
            If the item you receive is defective, materially differs from the
            preview shown at checkout, or arrives damaged, you are entitled to
            a free replacement or a full refund &mdash; including any
            shipping you paid &mdash; in line with the legal warranty of
            conformity (Articles 1649bis et seq. of the Belgian Civil Code).
            This warranty is independent of any commercial guarantee and does
            not expire on a 14-day clock.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            3. How to claim
          </h2>
          <p>
            Email{" "}
            <a
              href={`mailto:${businessInfo.supportEmail}`}
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              {businessInfo.supportEmail}
            </a>{" "}
            within 14 days of delivery, including your order number and at
            least one clear photograph of the issue. We will respond within
            two business days. Where a return is required, we provide a
            prepaid label; you do not need to pay for return shipping for
            defective or incorrect items.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            4. Refund timing
          </h2>
          <p>
            Approved refunds are issued to the original payment method within
            14 days of our receipt of the returned item, or within 14 days of
            our approval of the claim where no return is required. The actual
            time the funds appear depends on your bank or card issuer.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            5. Cancellation before production
          </h2>
          <p>
            If you contact us within{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.cancellationWindowHours}
            </span>{" "}
            hours of placing an order and the item has not yet entered
            production, we will use commercially reasonable efforts to cancel
            the order and refund you in full. After production has started,
            cancellation is not available because of the personalised nature
            of the item.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            6. Disputes
          </h2>
          <p>
            If we cannot resolve a complaint, you may also use the European
            Commission&apos;s Online Dispute Resolution platform at{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              ec.europa.eu/consumers/odr
            </a>
            . Other terms of sale are set out in our{" "}
            <Link
              href="/terms"
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </article>
    </main>
    </>
  );
}
