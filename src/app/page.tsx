import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ProductMockup from "@/components/ui/ProductMockup";
import { createClient } from "@/utils/supabase/server";
import MarkerUnderline from "@/components/ui/MarkerUnderline";
import TrendingSection from "@/components/marketplace/TrendingSection";
import {
  DoodleStar,
  DoodleArrow,
  DoodleSun,
  DoodleSquiggle,
  DoodleSparkle,
  DoodleSwirl,
  DoodleBolt,
  DoodleHeart,
  DoodleDots,
} from "@/components/ui/Doodles";

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
    .is("archived_at", null)
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
      <section className="relative flex min-h-[88vh] flex-col justify-end overflow-hidden px-6 pb-20 pt-32 md:px-12 lg:min-h-[92vh] lg:px-20">
        {/* Background image — object-right keeps the model in frame */}
        <Image
          src="/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center sm:object-right"
        />
        {/* Left overlay — darkens the text side, fades toward the model */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10"
        />
        {/* Bottom overlay — anchors the text block against the image */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent"
        />

        {/* Loose doodle accents scattered in the hero margins */}
        <DoodleSparkle
          aria-hidden
          className="doodle-twinkle pointer-events-none absolute right-8 top-24 hidden h-9 w-9 text-brand-yellow sm:block lg:right-20"
        />
        <DoodleSwirl
          aria-hidden
          className="doodle-sway pointer-events-none absolute right-16 top-1/2 hidden h-12 w-12 rotate-12 text-brand-orange lg:block"
        />
        <DoodleDots
          aria-hidden
          className="pointer-events-none absolute bottom-28 right-10 hidden h-7 w-10 text-brand-blue sm:block lg:right-28"
        />

        <div className="relative mx-auto w-full max-w-7xl">
          <span className="mb-5 inline-flex -rotate-2 items-center gap-2 rounded-full border-2 border-white/80 bg-brand-yellow px-4 py-1 font-hand text-lg font-bold text-ink">
            <DoodleSun className="h-5 w-5" />
            Hand-made by AI, worn by you
          </span>

          <h1 className="relative max-w-5xl font-display text-5xl leading-[0.9] tracking-tight text-white sm:text-8xl lg:text-[8.5rem]">
            Wear what{" "}
            <span className="relative">
              <MarkerUnderline>you imagine</MarkerUnderline>
              <DoodleStar className="doodle-twinkle absolute -right-10 -top-6 hidden h-10 w-10 rotate-12 text-brand-orange sm:block" />
            </span>
            .
          </h1>

          <p className="mt-7 max-w-md font-hand text-2xl leading-snug text-white/90">
            AI-generated apparel, made real — keep it for yourself or publish it to the world.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/marketplace"
              className="sticker inline-flex items-center justify-center rounded-full bg-brand-orange px-8 py-3.5 text-sm font-extrabold text-white"
            >
              Shop the collection →
            </Link>
            <div className="flex items-center gap-2">
              <DoodleArrow className="hidden h-7 w-11 text-white/70 sm:block" />
              <Link
                href="/generate"
                className="sticker inline-flex items-center justify-center rounded-full bg-paper px-8 py-3.5 text-sm font-extrabold text-ink"
              >
                Start designing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product showcase ──────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="px-6 py-20 md:px-12 md:py-28 lg:px-20">
          <div className="mx-auto w-full max-w-7xl">

            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="mb-1 flex items-center gap-2 font-hand text-xl font-bold text-brand-blue">
                  <DoodleSparkle className="h-4 w-4 text-brand-orange" />
                  New arrivals
                </p>
                <h2 className="relative inline-block font-display text-2xl text-ink sm:text-3xl">
                  The Collection
                  <DoodleStar className="absolute -right-7 -top-4 h-5 w-5 rotate-12 text-brand-yellow" />
                </h2>
              </div>
              <Link
                href="/marketplace"
                className="text-sm font-bold text-zinc-500 transition-colors hover:text-ink"
              >
                View all →
              </Link>
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
              {featured.map((design) => (
                <li key={design.id}>
                  <Link href={`/marketplace/${design.id}`} className="group block">
                    <div className="ink-card overflow-hidden rounded-xl bg-paper-2">
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

      {/* ── Trending ─────────────────────────────────────────────── */}
      <TrendingSection />

      {/* ── Brand pillars ─────────────────────────────────────────── */}
      <section className="border-t-2 border-ink px-6 py-16 md:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="paper-grid ink-card grid gap-0 rounded-2xl sm:grid-cols-3">
            {PILLARS.map(({ label, description }, i) => {
              const accents = ["text-brand-blue", "text-brand-orange", "text-brand-green"];
              return (
                <div
                  key={label}
                  className={`flex flex-col gap-2 p-8 ${
                    i > 0 ? "border-t-2 border-dashed border-zinc-300 sm:border-l-2 sm:border-t-0" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <DoodleSquiggle className={`h-3 w-12 ${accents[i]}`} />
                  </div>
                  <h3 className="font-display text-base text-ink">{label}</h3>
                  <p className="text-sm leading-relaxed text-zinc-600">
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t-2 border-ink bg-ink px-6 py-24 md:px-12 lg:px-20">
        <DoodleBolt
          aria-hidden
          className="doodle-sway pointer-events-none absolute left-10 top-16 hidden h-12 w-10 -rotate-12 text-brand-orange md:block lg:left-24"
        />
        <DoodleHeart
          aria-hidden
          className="doodle-float pointer-events-none absolute bottom-16 right-10 hidden h-11 w-11 rotate-6 text-brand-green md:block lg:right-24"
        />
        <DoodleDots
          aria-hidden
          className="pointer-events-none absolute left-16 bottom-20 hidden h-7 w-10 text-brand-blue lg:block"
        />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-6 text-center">
          <DoodleSun className="doodle-sway h-10 w-10 text-brand-yellow" />
          <h2 className="font-display text-4xl text-paper sm:text-6xl">
            Your idea,{" "}
            <span className="font-marker text-brand-yellow">worn.</span>
          </h2>
          <p className="max-w-xs font-hand text-2xl leading-snug text-paper/80 sm:max-w-sm">
            Describe it. Generate it. Wear it — or sell it to the world.
          </p>
          <Link
            href="/generate"
            className="sticker mt-2 inline-flex items-center justify-center rounded-full bg-brand-yellow px-10 py-3.5 text-sm font-extrabold text-ink"
          >
            Start creating for free →
          </Link>
        </div>
      </section>

    </main>
  );
}
