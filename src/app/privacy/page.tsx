import type { Metadata } from "next";
import { businessInfo } from "@/lib/legal/businessInfo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Loopawear collects, uses, and protects your personal data under the GDPR.",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <article className="mx-auto w-full max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Last updated 7 May 2026
          </p>
        </header>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            1. Controller
          </h2>
          <p>
            The controller of your personal data within the meaning of
            Regulation (EU) 2016/679 (&ldquo;GDPR&rdquo;) is{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.entityName}
            </span>
            , registered office at{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.registeredAddress}
            </span>
            , Belgium, KBO/BCE{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.kboNumber}
            </span>
            . Privacy enquiries:{" "}
            <a
              href={`mailto:${businessInfo.privacyEmail}`}
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              {businessInfo.privacyEmail}
            </a>
            . Data Protection Officer:{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.dpoStatement}
            </span>
            .
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            2. Data we process and why
          </h2>
          <p>
            We process the categories of personal data listed below for the
            purposes stated, on the legal basis indicated in parentheses
            (Article 6(1) GDPR).
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-y-3 sm:grid-cols-[10rem_1fr] sm:gap-x-6">
            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Account data
            </dt>
            <dd>
              Email, password hash, display name, optional bio &mdash; to
              create and operate your account (b: contract).
            </dd>

            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Design data
            </dt>
            <dd>
              Prompts, generation parameters, generated images, status,
              pricing &mdash; to operate the studio and marketplace
              (b: contract; f: legitimate interest in moderation).
            </dd>

            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Order data
            </dt>
            <dd>
              Items, sizes, quantities, totals, shipping address, status,
              tracking &mdash; to fulfil and deliver orders (b: contract;
              c: legal obligation for tax/accounting).
            </dd>

            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Payment data
            </dt>
            <dd>
              Stripe customer ID, last 4 digits and brand of card; full card
              numbers are processed by Stripe and never stored by us
              (b: contract).
            </dd>

            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Technical data
            </dt>
            <dd>
              IP address, user agent, error logs &mdash; to keep the service
              secure and operational (f: legitimate interest in security).
            </dd>

            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Communications
            </dt>
            <dd>
              Support emails, transactional emails &mdash; to handle requests
              and notify you about your account/orders (b: contract;
              f: legitimate interest).
            </dd>
          </dl>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            3. Recipients and sub-processors
          </h2>
          <p>
            We share personal data only with service providers that act as
            processors on our instructions. Current sub-processors include:
            Supabase (database and auth, hosted in the EU),{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.falRegion}
            </span>{" "}
            (fal.ai, AI image generation), Stripe Payments Europe, Limited
            (payments), Vercel (hosting), and{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.emailProvider}
            </span>{" "}
            (transactional email). Some of these providers may transfer data
            outside the EEA; in such cases transfers are covered by Standard
            Contractual Clauses or an adequacy decision.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            4. Retention
          </h2>
          <p>
            We retain account data for as long as your account is active.
            Order, invoice and tax-relevant data is retained for 7 years to
            comply with Belgian accounting obligations. Generated images
            associated with a deleted design are removed from public storage
            within 30 days. Server logs are retained for 90 days. After these
            periods, data is deleted or irreversibly anonymised.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            5. Your rights
          </h2>
          <p>
            Subject to the conditions in the GDPR, you have the right of
            access, rectification, erasure, restriction of processing,
            portability, and objection. You may also withdraw consent at any
            time where processing is based on consent. To exercise any of
            these, contact{" "}
            <a
              href={`mailto:${businessInfo.privacyEmail}`}
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              {businessInfo.privacyEmail}
            </a>
            . If you believe our processing infringes the GDPR, you have the
            right to lodge a complaint with the Belgian Data Protection
            Authority (Gegevensbeschermingsautoriteit / Autorité de protection
            des données),{" "}
            <a
              href="https://www.dataprotectionauthority.be"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              dataprotectionauthority.be
            </a>
            , Drukpersstraat 35, 1000 Brussels.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            6. Automated decision-making
          </h2>
          <p>
            We do not make decisions producing legal or similarly significant
            effects based solely on automated processing. Design moderation
            uses automated screening as a triage step, but final decisions are
            taken by a human reviewer.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            7. Cookies and similar technologies
          </h2>
          <p>
            We use strictly necessary cookies to keep you logged in and to
            secure the service. We do not use advertising or third-party
            analytics cookies. Where we add measurement tooling in the future,
            we will request your consent first and update this Policy.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            8. Changes
          </h2>
          <p>
            We update this Policy when our processing or our service providers
            change. Material changes will be notified by email or in-product
            notice at least 14 days before taking effect.
          </p>
        </section>
      </article>
    </main>
  );
}
