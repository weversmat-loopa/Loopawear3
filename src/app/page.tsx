import type { Metadata } from "next";
import Link from "next/link";
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
  placement: { x: number; y: number; scale: number } | null;
  price_cents: number | null;
};

const PILLARS = [
  {
    label: "Unique by design",
    description:
      "Every piece is AI-generated from your prompt — no two are ever the same.",
  },
  {
    label: "Printed on demand",
    description:
      "Real garments, printed and shipped when you order. No inventory, no waste.",
  },
  {
    label: "Earn as a creator",
    description:
      "Publish to the marketplace and receive a cut of every sale, automatically.",
  },
];

export default async function Home() {
  const supabase = await createClient();

  const { data: featuredRaw } = await supabase
    .from("designs")
    .select("id, title, product_type, image_url, placement, price_cents")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(8);

  const featured: FeaturedDesign[] = (featuredRaw ?? []).map((d) => {
    const raw = d.placement as { x?: unknown; y?: unknown; scale?: unknown } | null;
    return {
      ...d,
      placement:
        raw &&
        typeof raw.x === "number" &&
        typeof raw.y === "number" &&
        typeof raw.scale === "number"
          ? { x: raw.x, y: raw.y, scale: raw.scale }
          : null,
    };
  });

  return (
    <main className="flex flex-1 flex-col">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[88vh] flex-col justify-end bg-zinc-950 px-6 pb-20 pt-32 md:px-12 lg:min-h-[92vh] lg:px-20">
        {/* Subtle top glow for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_45%_at_50%_0%,rgba(255,255,255,0.05),transparent)]"
        />

        <div className="relative mx-auto w-full max-w-7xl">
          <h1 className="max-w-5xl text-6xl font-black leading-[0.9] tracking-tight text-white sm:text-8xl lg:text-[8.5rem]">
            Wear what<br className="hidden sm:block" /> you imagine.
          </h1>

          <p className="mt-7 max-w-sm text-sm leading-relaxed text-zinc-400 sm:text-base">
            AI-generated apparel, made real — keep it for yourself or publish it to the world.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
            >
              Shop the collection →
            </Link>
            <Link
              href="/generate"
              className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3.5 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-400 hover:text-white"
            >
              Start designing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Product showcase ──────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="px-6 py-20 md:px-12 md:py-28 lg:px-20">
          <div className="mx-auto w-full max-w-7xl">

            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
                  New arrivals
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                  The Collection
                </h2>
              </div>
              <Link
                href="/marketplace"
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
              >
                View all →
              </Link>
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
              {featured.map((design) => (
                <li key={design.id}>
                  <Link href={`/marketplace/${design.id}`} className="group block">
                    <div className="overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800/60">
                      <ProductMockup
                        imageUrl={design.image_url}
                        productType={design.product_type}
                        placement={design.placement}
                        alt={
                          design.product_type
                            ? `${design.product_type} design`
                            : "Design"
                        }
                        loading="lazy"
                        className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="mt-4 space-y-1 px-0.5">
                      <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-zinc-500 dark:text-zinc-100 dark:group-hover:text-zinc-400">
                        {design.title ??
                          (design.product_type
                            ? `${design.product_type} Design`
                            : "Design")}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {design.price_cents !== null
                          ? `€${(design.price_cents / 100).toFixed(2)}`
                          : " "}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

          </div>
        </section>
      )}

      {/* ── Brand pillars ─────────────────────────────────────────── */}
      <section className="border-t border-zinc-100 px-6 py-16 dark:border-zinc-800 md:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-0 sm:grid-cols-3">
            {PILLARS.map(({ label, description }, i) => (
              <div
                key={label}
                className={`flex flex-col gap-2 py-8 sm:py-0 ${
                  i > 0
                    ? "border-t border-zinc-100 dark:border-zinc-800 sm:border-l sm:border-t-0 sm:pl-10 lg:pl-16"
                    : "sm:pr-10 lg:pr-16"
                }`}
              >
                <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {label}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────────── */}
      <section className="bg-zinc-950 px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 text-center">
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
            Your idea,<br className="hidden sm:block" /> worn.
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-zinc-400 sm:max-w-sm">
            Describe it. Generate it. Wear it — or sell it to the world.
          </p>
          <Link
            href="/generate"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-white px-10 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            Start creating for free →
          </Link>
        </div>
      </section>

    </main>
  );
}
