import type { Metadata } from "next";
import Link from "next/link";
import { businessInfo } from "@/lib/legal/businessInfo";
import LegalDraftBanner from "@/components/legal/LegalDraftBanner";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing use of the Loopawear marketplace, AI design studio, and creator services.",
};

export default function TermsPage() {
  return (
    <>
      <LegalDraftBanner />
      <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <article className="mx-auto w-full max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Last updated 7 May 2026
          </p>
        </header>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            1. Who we are
          </h2>
          <p>
            These Terms govern your use of Loopawear, an online marketplace and
            AI-assisted design studio operated by{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.entityName}
            </span>
            , a company registered in Belgium under enterprise number{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.kboNumber}
            </span>
            , VAT{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.vatNumber}
            </span>
            , registered office at{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.registeredAddress}
            </span>{" "}
            (&ldquo;Loopawear&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By
            creating an account or placing an order you accept these Terms.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            2. Eligibility and accounts
          </h2>
          <p>
            You must be at least 16 years old to use Loopawear. If you create an
            account, you are responsible for the credentials, for activity under
            the account, and for keeping the account information accurate. We
            may suspend or close accounts that breach these Terms, are
            associated with fraud or chargebacks, or have been inactive for an
            extended period.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            3. The marketplace
          </h2>
          <p>
            Loopawear allows creators to generate AI-assisted designs, place
            them on apparel products, and offer the resulting items to buyers.
            The contract of sale for a physical item is concluded between the
            buyer and Loopawear. Creators are not parties to that contract;
            their relationship with Loopawear is governed by Section 5 below.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            4. AI-generated content and intellectual property
          </h2>
          <p>
            By submitting a prompt, you confirm that it does not infringe the
            rights of others (including copyright, trademark, name and likeness
            rights), is not unlawful, and does not depict identifiable real
            persons without consent. You acknowledge that AI-generated outputs
            may not qualify for copyright protection in jurisdictions that
            require human authorship, and Loopawear makes no representation as
            to the protectability of any output.
          </p>
          <p>
            To the extent you hold any rights in a published design, you grant
            Loopawear a worldwide, non-exclusive, royalty-free licence to host,
            reproduce, display, print, fulfil and promote that design in
            connection with operating the service. You may withdraw a design
            from sale at any time via your account; that withdrawal does not
            affect orders already accepted.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            5. Pricing, fees, and payouts
          </h2>
          <p>
            Creators set the retail price for their published designs.
            Loopawear retains a platform fee of 15% of each sale; the remaining
            85% accrues to the creator&apos;s pending balance. Payouts are made
            on the schedule and minimums set out at{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.payoutTermsUrl}
            </span>
            . All prices on the marketplace are in EUR and include VAT where
            applicable.
          </p>
          <p>
            Buyer payments are processed by Stripe Payments Europe, Limited.
            Loopawear does not store full card details.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            6. Prohibited content and conduct
          </h2>
          <p>
            You must not submit, upload, generate, list or purchase content
            that: (a) infringes third-party intellectual property; (b) depicts
            minors in a sexual or otherwise harmful manner; (c) is hateful or
            incites violence against protected groups; (d) is defamatory or
            harassing; (e) breaches applicable trademark or right-of-publicity
            laws; (f) is unlawful in Belgium or in the buyer&apos;s
            jurisdiction. We may remove content and suspend accounts at our
            discretion to enforce this section.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            7. Cancellation, returns and defects
          </h2>
          <p>
            Apparel ordered through Loopawear is produced on demand and is
            therefore exempt from the statutory 14-day right of withdrawal
            under Article VI.53(3) of the Belgian Code of Economic Law (which
            implements Article 16(c) of Directive 2011/83/EU). Defective or
            damaged items are covered under our{" "}
            <Link
              href="/refunds"
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              Refund &amp; Return Policy
            </Link>
            .
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            8. Liability
          </h2>
          <p>
            To the extent permitted by law, Loopawear&apos;s aggregate
            liability for any claim arising out of these Terms is limited to
            the amount you paid for the item that gave rise to the claim, or
            EUR 100, whichever is greater. Nothing in these Terms limits
            liability that cannot be limited under Belgian law (including for
            death or personal injury caused by negligence, fraud, or breaches
            of mandatory consumer-protection rules).
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            9. Governing law and disputes
          </h2>
          <p>
            These Terms are governed by Belgian law. The competent courts are
            those of{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.jurisdictionCity}
            </span>
            , without prejudice to consumers&apos; mandatory rights to bring
            proceedings in their own jurisdiction. EU residents may also use
            the European Commission&apos;s online dispute resolution platform
            at{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              ec.europa.eu/consumers/odr
            </a>
            .
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            10. Changes
          </h2>
          <p>
            We may update these Terms from time to time. Material changes will
            be communicated by email or in-product notice at least 14 days
            before they take effect for existing users. Continued use after the
            effective date constitutes acceptance.
          </p>
        </section>

        <section className="mt-6 space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Contact
          </h2>
          <p>
            Questions about these Terms? Reach us at{" "}
            <a
              href={`mailto:${businessInfo.contactEmail}`}
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              {businessInfo.contactEmail}
            </a>
            .
          </p>
        </section>
      </article>
    </main>
    </>
  );
}
