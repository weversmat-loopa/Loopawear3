import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProductOptions from "./ProductOptions";
import ProductMockup from "@/components/ui/ProductMockup";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: design } = await supabase
    .from("designs")
    .select("title, prompt, product_type")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!design) {
    return { title: "Design not found" };
  }

  return {
    title: design.title ?? (design.product_type ? `${design.product_type} Design` : "Design"),
    description: design.prompt.slice(0, 160),
  };
}

type RelatedDesign = {
  id: string;
  title: string | null;
  product_type: string | null;
  image_url: string | null;
  prompt: string;
};

function RelatedDesignCard({ item }: { item: RelatedDesign }) {
  return (
    <Link
      href={`/marketplace/${item.id}`}
      className="group relative block overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 transition-all duration-300 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-500/30 dark:hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]"
    >
      <ProductMockup
        imageUrl={item.image_url}
        productType={item.product_type}
        alt={item.product_type ? `${item.product_type} design` : "Design"}
        loading="lazy"
        className="transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent p-3">
        <p className="text-xs font-semibold leading-tight text-white">
          {item.title ??
            (item.product_type ? `${item.product_type} Design` : "Design")}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
          {item.prompt}
        </p>
      </div>
    </Link>
  );
}

export default async function DesignPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: design } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, style, image_url, created_at, creator_id, price_cents")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!design) {
    notFound();
  }

  let creatorName: string | null = null;
  if (design.creator_id) {
    const { data: profile } = await supabase
      .from("public_profiles")
      .select("display_name")
      .eq("id", design.creator_id)
      .maybeSingle();
    creatorName = profile?.display_name ?? null;
  }

  let moreByCreator: RelatedDesign[] = [];
  if (design.creator_id) {
    const { data: more } = await supabase
      .from("designs")
      .select("id, title, product_type, image_url, prompt")
      .eq("creator_id", design.creator_id)
      .eq("status", "published")
      .neq("id", design.id)
      .order("created_at", { ascending: false })
      .limit(3);
    moreByCreator = more ?? [];
  }

  let similarDesigns: RelatedDesign[] = [];
  const similarConditions: string[] = [];
  if (design.style) similarConditions.push(`style.eq.${design.style}`);
  if (design.product_type)
    similarConditions.push(`product_type.eq.${design.product_type}`);

  if (similarConditions.length > 0) {
    const excludeIds = [design.id, ...moreByCreator.map((d) => d.id)];
    const { data: similar } = await supabase
      .from("designs")
      .select("id, title, product_type, image_url, prompt")
      .eq("status", "published")
      .or(similarConditions.join(","))
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(4);
    similarDesigns = similar ?? [];
  }

  const studioParams = new URLSearchParams({ prompt: design.prompt });
  if (design.product_type) studioParams.set("product_type", design.product_type);
  if (design.style) studioParams.set("style", design.style);
  const studioHref = `/generate?${studioParams.toString()}`;

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-20">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/marketplace"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-400"
        >
          ← Marketplace
        </Link>

        <div className="mt-10 lg:grid lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div className="lg:sticky lg:top-10 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <ProductMockup
                imageUrl={design.image_url}
                productType={design.product_type}
                alt={
                  design.product_type
                    ? `${design.product_type} design`
                    : "Design"
                }
                loading="eager"
              />
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 flex flex-col lg:mt-0">
            {design.product_type && (
              <div>
                <Link
                  href={`/marketplace?type=${encodeURIComponent(design.product_type)}`}
                  className="rounded-full border border-violet-500/20 bg-violet-500/5 px-2.5 py-0.5 text-xs text-violet-500 transition-all duration-300 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-400 dark:border-violet-500/20 dark:bg-violet-500/5 dark:text-violet-400"
                >
                  {design.product_type}
                </Link>
              </div>
            )}

            <h1 className="mt-5 text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
              {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
            </h1>

            {creatorName && (
              <Link
                href={`/creators/${design.creator_id}`}
                className="mt-2 text-sm text-zinc-500 transition-colors hover:text-violet-500 dark:text-zinc-500 dark:hover:text-violet-400"
              >
                by {creatorName}
              </Link>
            )}

            <p className="mt-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
              &ldquo;{design.prompt}&rdquo;
            </p>

            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-t border-zinc-100 pt-6 text-sm dark:border-zinc-800/60">
              {design.price_cents !== null && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-500">Price</dt>
                  <dd className="text-lg font-bold text-zinc-900 dark:text-white">
                    €{(design.price_cents / 100).toFixed(2)}
                  </dd>
                </>
              )}
              {design.style && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-500">Style</dt>
                  <dd className="text-zinc-700 dark:text-zinc-300">{design.style}</dd>
                </>
              )}
              <dt className="text-zinc-500 dark:text-zinc-500">Published</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{formatDate(design.created_at)}</dd>
            </dl>

            <div className="mt-auto pt-8">
              {design.price_cents !== null && (
                <ProductOptions
                  priceCents={design.price_cents}
                  designId={design.id}
                />
              )}
              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800/60">
                <Link
                  href={studioHref}
                  className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-all duration-300 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white"
                >
                  Create something similar →
                </Link>
                <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-600">
                  Opens the studio with this prompt pre-filled.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* More by this creator */}
        {moreByCreator.length > 0 && (
          <div className="mt-20 border-t border-zinc-100 pt-12 dark:border-zinc-800/60">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                  More by {creatorName ?? "this creator"}
                </h2>
              </div>
              {design.creator_id && (
                <Link
                  href={`/creators/${design.creator_id}`}
                  className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-400"
                >
                  See all →
                </Link>
              )}
            </div>
            <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {moreByCreator.map((related) => (
                <li key={related.id}>
                  <RelatedDesignCard item={related} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Similar designs */}
        {similarDesigns.length > 0 && (
          <div className="mt-20 border-t border-zinc-100 pt-12 dark:border-zinc-800/60">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                Similar designs
              </h2>
            </div>
            <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similarDesigns.map((related) => (
                <li key={related.id}>
                  <RelatedDesignCard item={related} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
