import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProductOptions from "./ProductOptions";
import ProductMockup from "@/components/ui/ProductMockup";
import LikeButton from "@/components/ui/LikeButton";

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
  mockup_url: string | null;
  mockup_status: string | null;
  prompt: string;
};

function RelatedDesignCard({ item }: { item: RelatedDesign }) {
  return (
    <Link href={`/marketplace/${item.id}`} className="group flex flex-col">
      <div className="ink-card overflow-hidden rounded-lg bg-paper-2">
        <ProductMockup
          imageUrl={item.image_url}
          productType={item.product_type}
          alt={item.product_type ? `${item.product_type} design` : "Design"}
          loading="lazy"
          className="transition-transform duration-300 group-hover:scale-[1.02]"
          mockupUrl={item.mockup_url}
          mockupStatus={item.mockup_status}
        />
      </div>
      <div className="mt-3">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {item.title ??
            (item.product_type ? `${item.product_type} Design` : "Design")}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
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
    .select("id, title, prompt, product_type, style, image_url, mockup_url, mockup_status, placement, created_at, creator_id, price_cents")
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

  // Like state for the current user
  const { data: { user } } = await supabase.auth.getUser();
  let initialLiked = false;
  let likeCount = 0;

  const { count: lc } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("design_id", design.id);
  likeCount = lc ?? 0;

  if (user) {
    const { data: likeRow } = await supabase
      .from("likes")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("design_id", design.id)
      .maybeSingle();
    initialLiked = !!likeRow;
  }

  let moreByCreator: RelatedDesign[] = [];
  if (design.creator_id) {
    const { data: more } = await supabase
      .from("designs")
      .select("id, title, product_type, image_url, mockup_url, mockup_status, prompt")
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
      .select("id, title, product_type, image_url, mockup_url, mockup_status, prompt")
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
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Marketplace
        </Link>

        <div className="mt-10 lg:grid lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div className="lg:sticky lg:top-10 lg:self-start">
            <div className="ink-card overflow-hidden rounded-xl bg-paper-2">
              <ProductMockup
                imageUrl={design.image_url}
                productType={design.product_type}
                placement={design.placement as { x: number; y: number; scale: number } | null}
                alt={
                  design.product_type
                    ? `${design.product_type} design`
                    : "Design"
                }
                loading="eager"
                mockupUrl={design.mockup_url ?? null}
                mockupStatus={design.mockup_status ?? null}
              />
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 flex flex-col lg:mt-0">
            {design.product_type && (
              <p className="font-hand text-xl font-bold text-brand-blue">
                {design.product_type}
              </p>
            )}

            <h1 className="mt-1 font-display text-3xl text-ink">
              {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
            </h1>

            {creatorName && (
              <Link
                href={`/creators/${design.creator_id}`}
                className="mt-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                by {creatorName}
              </Link>
            )}

            <div className="mt-4">
              <LikeButton
                designId={design.id}
                initialLiked={initialLiked}
                initialCount={likeCount}
                variant="detail"
              />
            </div>

            {design.price_cents !== null && (
              <p className="mt-5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                €{(design.price_cents / 100).toFixed(2)}
              </p>
            )}

            <p className="mt-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              &ldquo;{design.prompt}&rdquo;
            </p>

            {design.style && (
              <dl className="mt-5 border-t border-zinc-100 pt-5 text-sm dark:border-zinc-800">
                <div className="flex gap-6">
                  <dt className="text-zinc-500 dark:text-zinc-400">Style</dt>
                  <dd className="text-zinc-700 dark:text-zinc-300">{design.style}</dd>
                </div>
                <div className="mt-2 flex gap-6">
                  <dt className="text-zinc-500 dark:text-zinc-400">Published</dt>
                  <dd className="text-zinc-700 dark:text-zinc-300">{formatDate(design.created_at)}</dd>
                </div>
              </dl>
            )}

            <div className="mt-auto pt-8">
              {design.price_cents !== null && (
                <ProductOptions
                  priceCents={design.price_cents}
                  designId={design.id}
                />
              )}
              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <Link
                  href={studioHref}
                  className="sticker-sm inline-flex w-full items-center justify-center rounded-full bg-paper px-5 py-2.5 text-sm font-extrabold text-ink"
                >
                  Create something similar →
                </Link>
                <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Opens the studio with this prompt pre-filled.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* More by this creator */}
        {moreByCreator.length > 0 && (
          <div className="mt-20 border-t border-zinc-100 pt-12 dark:border-zinc-800">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                More by {creatorName ?? "this creator"}
              </h2>
              {design.creator_id && (
                <Link
                  href={`/creators/${design.creator_id}`}
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  See all →
                </Link>
              )}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
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
          <div className="mt-20 border-t border-zinc-100 pt-12 dark:border-zinc-800">
            <h2 className="mb-6 text-base font-bold text-zinc-900 dark:text-zinc-100">
              Similar designs
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
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
