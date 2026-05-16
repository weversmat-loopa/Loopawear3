import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ProductMockup from "@/components/ui/ProductMockup";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "Loopawear" },
  description:
    "Describe your design and let AI bring it to life. Create and sell original AI-generated apparel on Loopawear.",
};

type FeaturedDesign = {
  id: string;
  title: string | null;
  product_type: string | null;
  image_url: string | null;
  price_cents: number | null;
};

export default async function Home() {
  const supabase = await createClient();

  // Newest 8 published designs. Lean column set — no creator byline on
  // the homepage cards, so no second query for creator names.
  const { data: featuredRaw } = await supabase
    .from("designs")
    .select("id, title, product_type, image_url, price_cents")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(8);

  const featured: FeaturedDesign[] = featuredRaw ?? [];

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center px-6 pb-16 pt-20 text-center md:pb-20 md:pt-28">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 dark:border-violet-800/60 dark:bg-violet-950/50">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
          <span className="text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
            AI-powered apparel
          </span>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-7xl dark:text-zinc-100">
          Wear what<br className="hidden sm:block" /> you imagine.
        </h1>

        <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-500">
          Describe your vision and let AI bring it to life on real apparel.
          Keep it for yourself — or publish it to the world.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button href="/generate" variant="primary">
            Start designing →
          </Button>
          <Button href="/marketplace" variant="ghost">
            Browse marketplace
          </Button>
        </div>
      </section>

      {/* Featured designs — only when the marketplace has any published */}
      {featured.length > 0 && (
        <section className="border-t border-zinc-200 px-6 py-16 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Featured designs
              </h2>
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((design) => (
                <li key={design.id}>
                  <Link
                    href={`/marketplace/${design.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
                  >
                    <ProductMockup
                      imageUrl={design.image_url}
                      productType={design.product_type}
                      alt={
                        design.product_type
                          ? `${design.product_type} design`
                          : "Design"
                      }
                      loading="lazy"
                      className="transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="flex items-start justify-between gap-2 p-4">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {design.title ??
                          (design.product_type
                            ? `${design.product_type} Design`
                            : "Design")}
                      </p>
                      {design.price_cents !== null && (
                        <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          €{(design.price_cents / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 text-center">
              <Link
                href="/marketplace"
                className="text-sm text-zinc-500 underline underline-offset-4 transition-colors hover:text-violet-600"
              >
                Browse all →
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
