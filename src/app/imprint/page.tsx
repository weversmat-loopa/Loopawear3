import type { Metadata } from "next";
import { businessInfo } from "@/lib/legal/businessInfo";
import LegalDraftBanner from "@/components/legal/LegalDraftBanner";

export const metadata: Metadata = {
  title: "Imprint",
  description:
    "Legal information about Loopawear under Article 5 of Directive 2000/31/EC.",
};

export default function ImprintPage() {
  return (
    <>
      <LegalDraftBanner />
      <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <article className="mx-auto w-full max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Imprint
          </h1>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Information published in accordance with Article 5 of
            Directive 2000/31/EC. Last updated 7 May 2026.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Operator
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-[10rem_1fr] sm:gap-x-6">
            <dt className="text-zinc-500 dark:text-zinc-400">Legal name</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {businessInfo.entityName}
            </dd>

            <dt className="text-zinc-500 dark:text-zinc-400">Legal form</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {businessInfo.legalForm}
            </dd>

            <dt className="text-zinc-500 dark:text-zinc-400">
              Registered office
            </dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {businessInfo.registeredAddress}
            </dd>

            <dt className="text-zinc-500 dark:text-zinc-400">KBO / BCE</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{businessInfo.kboNumber}</dd>

            <dt className="text-zinc-500 dark:text-zinc-400">VAT</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {businessInfo.vatNumber}
            </dd>

            <dt className="text-zinc-500 dark:text-zinc-400">Director(s)</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {businessInfo.directorNames}
            </dd>

            <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd>
              <a
                href={`mailto:${businessInfo.contactEmail}`}
                className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
              >
                {businessInfo.contactEmail}
              </a>
            </dd>

            <dt className="text-zinc-500 dark:text-zinc-400">Phone</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{businessInfo.phone}</dd>
          </dl>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Hosting and infrastructure
          </h2>
          <p className="mt-3">
            The Loopawear web application is hosted by Vercel Inc., 440 N
            Barranca Ave #4133, Covina, CA 91723, USA. Database, authentication
            and storage are provided by Supabase (Supabase, Inc., 970 Toa
            Payoh North #07-04, Singapore 318992). AI image generation is
            provided by{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {businessInfo.falLegalEntity}
            </span>
            . Payment processing is provided by Stripe Payments Europe,
            Limited, 25/28 North Wall Quay, Dublin 1, Ireland.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Supervisory authorities
          </h2>
          <p className="mt-3">
            For consumer matters: FPS Economy, S.M.E.s, Self-Employed and
            Energy, Boulevard du Roi Albert II 16, 1000 Brussels (
            <a
              href="https://economie.fgov.be"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              economie.fgov.be
            </a>
            ). For data-protection matters: Belgian Data Protection Authority,
            Drukpersstraat 35, 1000 Brussels (
            <a
              href="https://www.dataprotectionauthority.be"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              dataprotectionauthority.be
            </a>
            ).
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Online dispute resolution
          </h2>
          <p className="mt-3">
            The European Commission provides a platform for online dispute
            resolution at{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 underline underline-offset-2 hover:text-violet-600 dark:text-zinc-100"
            >
              ec.europa.eu/consumers/odr
            </a>
            . We are not currently obliged to participate in dispute resolution
            proceedings before a consumer arbitration board.
          </p>
        </section>
      </article>
    </main>
    </>
  );
}
