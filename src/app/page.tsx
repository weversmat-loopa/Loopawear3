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
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-20 text-center">
        {/* Radial background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[700px] w-[700px] rounded-full bg-violet-600/[0.07] blur-[120px] dark:bg-violet-600/10" />
        </div>

        {/* Badge */}
        <div className="relative mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-1.5 backdrop-blur-sm dark:border-violet-500/20 dark:bg-violet-500/5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          <span className="text-xs font-medium uppercase tracking-widest text-violet-500 dark:text-violet-400">
            AI-powered apparel
          </span>
        </div>

        {/* Headline */}
        <h1 className="relative text-6xl font-black leading-none tracking-tight text-zinc-900 dark:text-white sm:text-7xl md:text-8xl lg:text-9xl">
          Wear what<br className="hidden sm:block" /> you imagine.
        </h1>

        {/* Subtitle */}
        <p className="relative mt-8 max-w-md text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          Describe your vision and let AI bring it to life on real apparel.
          Keep it for yourself — or publish it to the world.
        </p>

        {/* CTAs */}
        <div className="relative mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <div className="pointer-events-none absolute inset-0 scale-150 rounded-full bg-violet-500/[0.07] blur-2xl dark:animate-pulse dark:bg-violet-500/10" />
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
        <section className="border-t border-zinc-200 px-6 py-16 dark:border-white/[0.06]">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                Featured designs
              </h2>
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((design) => (
                <li key={design.id}>
                  <Link
                    href={`/marketplace/${design.id}`}
                    className="group relative block overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 transition-all duration-300 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-500/30 dark:hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]"
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
                      className="transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent p-4">
                      <p className="text-sm font-semibold leading-tight text-white">
                        {design.title ??
                          (design.product_type
                            ? `${design.product_type} Design`
                            : "Design")}
                      </p>
                      {design.price_cents !== null && (
                        <p className="mt-0.5 text-xs text-violet-400">
                          €{(design.price_cents / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 text-center">
              <Link
                href="/marketplace"
                className="text-sm text-zinc-500 transition-colors hover:text-violet-500 dark:text-zinc-600 dark:hover:text-violet-400"
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
