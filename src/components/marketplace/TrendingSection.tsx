import Link from "next/link";
import { fetchTrending } from "@/app/marketplace/trending";
import ProductMockup from "@/components/ui/ProductMockup";
import { DoodleBolt } from "@/components/ui/Doodles";

/**
 * Server component — fetches trending designs and renders a card strip.
 * Designed to sit on the homepage and/or the top of the marketplace.
 * Product cards are kept intentionally clean (speels frame, rustig product).
 */
export default async function TrendingSection() {
  const designs = await fetchTrending(6);
  if (designs.length === 0) return null;

  return (
    <section className="px-6 py-16 md:px-12 md:py-20 lg:px-20">
      <div className="mx-auto w-full max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 flex items-center gap-2 font-hand text-xl font-bold text-brand-orange">
              <DoodleBolt className="h-4 w-4" />
              Populair deze week
            </p>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Trending
            </h2>
          </div>
          <Link
            href="/marketplace?sort=most-liked"
            className="text-sm font-bold text-zinc-500 transition-colors hover:text-ink"
          >
            View all →
          </Link>
        </div>

        {/* Cards */}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-6 lg:gap-x-6 lg:gap-y-12">
          {designs.map((design) => (
            <li key={design.id}>
              <Link href={`/marketplace/${design.id}`} className="group block">
                {/* Product card — ink-card frame, clean product inside */}
                <div className="relative ink-card overflow-hidden rounded-xl bg-paper-2">
                  <ProductMockup
                    imageUrl={design.image_url}
                    productType={design.product_type}
                    placement={design.placement}
                    alt={design.product_type ? `${design.product_type} design` : "Design"}
                    loading="lazy"
                    mockupUrl={design.mockup_url}
                    mockupStatus={design.mockup_status}
                    className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  {/* Like count badge — top-right, subtle */}
                  {design.like_count > 0 && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-paper/90 px-2 py-0.5 text-xs font-semibold text-zinc-600 backdrop-blur-sm dark:bg-zinc-900/90 dark:text-zinc-300">
                      <HeartFilledIcon className="h-3 w-3 text-brand-orange" />
                      {design.like_count}
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="mt-3 space-y-0.5 px-0.5">
                  <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-zinc-500 dark:text-zinc-100 dark:group-hover:text-zinc-400">
                    {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                  </p>
                  {design.creator_name && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      by {design.creator_name}
                    </p>
                  )}
                  {design.price_cents !== null && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      €{(design.price_cents / 100).toFixed(2)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}

function HeartFilledIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
