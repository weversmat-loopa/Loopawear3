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

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Describe your vision",
    description:
      "Type a prompt, choose a style and colour palette. Be as specific or as open-ended as you like.",
  },
  {
    step: "02",
    title: "AI generates your design",
    description:
      "Our image model turns your words into a unique graphic in seconds — no design skills needed.",
  },
  {
    step: "03",
    title: "Wear it or sell it",
    description:
      "Order it printed on real apparel for yourself, or publish it to the marketplace and earn from every sale.",
  },
];

const WHY_LOOPAWEAR = [
  {
    title: "AI-powered",
    description:
      "Every design is generated uniquely for you. No templates, no stock art — just your idea made real.",
  },
  {
    title: "Real apparel",
    description:
      "Each order is printed and shipped on demand. No minimum quantities, no inventory, no waste.",
  },
  {
    title: "Creator economy",
    description:
      "Publish your designs to the marketplace and earn a cut of every sale. Your creativity, your revenue.",
  },
];

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
      <section className="flex flex-col items-center px-6 pb-24 pt-28 text-center md:pt-36">
        <span className="mb-6 inline-block rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-medium tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Now in beta — free to try
        </span>

        <h1 className="max-w-4xl text-5xl font-black leading-none tracking-tight text-zinc-900 dark:text-white sm:text-7xl md:text-8xl">
          Wear what<br className="hidden sm:block" /> you imagine.
        </h1>

        <p className="mt-8 max-w-md text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          Describe any design, let AI generate it in seconds, and wear it on
          real apparel. Keep it for yourself — or publish it and start earning.
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button href="/generate" variant="primary" className="text-center">
            Start designing →
          </Button>
          <Button href="/marketplace" variant="ghost" className="text-center">
            Browse marketplace
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-100 px-6 py-20 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="mb-14 text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            How it works
          </h2>
          <div className="grid gap-10 md:grid-cols-3 md:gap-12">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step} className="flex flex-col">
                <span className="mb-4 text-4xl font-black leading-none tracking-tight text-zinc-200 dark:text-zinc-700">
                  {step}
                </span>
                <h3 className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Loopawear */}
      <section className="border-t border-zinc-100 px-6 py-20 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="mb-14 text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Why Loopawear
          </h2>
          <div className="grid gap-8 md:grid-cols-3 md:gap-12">
            {WHY_LOOPAWEAR.map(({ title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-100 p-8 dark:border-zinc-800"
              >
                <h3 className="mb-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured designs — only when the marketplace has any published */}
      {featured.length > 0 && (
        <section className="border-t border-zinc-100 px-6 py-16 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Featured designs
              </h2>
              <Link
                href="/marketplace"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Browse all →
              </Link>
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((design) => (
                <li key={design.id}>
                  <Link
                    href={`/marketplace/${design.id}`}
                    className="group flex flex-col"
                  >
                    <div className="overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
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
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {design.title ??
                          (design.product_type
                            ? `${design.product_type} Design`
                            : "Design")}
                      </p>
                      {design.price_cents !== null && (
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
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
      )}
    </main>
  );
}
