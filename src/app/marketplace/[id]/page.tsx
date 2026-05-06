import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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

  // Fetch up to 3 other published designs by the same creator
  let moreByCreator: {
    id: string;
    title: string | null;
    product_type: string | null;
    image_url: string | null;
    prompt: string;
  }[] = [];
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

  const studioParams = new URLSearchParams({ prompt: design.prompt });
  if (design.product_type) studioParams.set("product_type", design.product_type);
  if (design.style) studioParams.set("style", design.style);
  const studioHref = `/generate?${studioParams.toString()}`;

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/marketplace"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Marketplace
        </Link>

        <div className="mt-10 lg:grid lg:grid-cols-2 lg:gap-12">
          {/* Image */}
          <div className="lg:sticky lg:top-10 lg:self-start">
            {design.image_url ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
                <img
                  src={design.image_url}
                  alt={
                    design.product_type
                      ? `${design.product_type} design`
                      : "Design"
                  }
                  className="block h-auto w-full"
                  loading="eager"
                  decoding="async"
                />
              </div>
            ) : (
              <div className="aspect-square w-full rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800" />
            )}
          </div>

          {/* Info */}
          <div className="mt-8 flex flex-col lg:mt-0">
            {design.product_type && (
              <div>
                <Link
                  href={`/marketplace?type=${encodeURIComponent(design.product_type)}`}
                  className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600 transition-colors hover:border-violet-400/50 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-400"
                >
                  {design.product_type}
                </Link>
              </div>
            )}

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
            </h1>

            {creatorName && (
              <Link
                href={`/creators/${design.creator_id}`}
                className="mt-1.5 text-sm text-zinc-500 transition-colors hover:text-violet-600"
              >
                by {creatorName}
              </Link>
            )}

            <p className="mt-6 text-sm leading-relaxed text-zinc-500">
              &ldquo;{design.prompt}&rdquo;
            </p>

            {/* Structured details */}
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
              {design.price_cents !== null && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-400">Price</dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                    €{(design.price_cents / 100).toFixed(2)}
                  </dd>
                </>
              )}
              {design.style && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-400">Style</dt>
                  <dd className="text-zinc-700 dark:text-zinc-300">{design.style}</dd>
                </>
              )}
              <dt className="text-zinc-500 dark:text-zinc-400">Published</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{formatDate(design.created_at)}</dd>
            </dl>

            <div className="mt-auto pt-8">
              <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
                {design.price_cents !== null && (
                  <div className="mb-3">
                    <button
                      disabled
                      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                    >
                      Checkout coming soon
                    </button>
                    <p className="mt-1.5 text-center text-xs text-zinc-400 dark:text-zinc-500">
                      Purchase will be available in a future update.
                    </p>
                  </div>
                )}
                <Link
                  href={studioHref}
                  className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  Create something similar →
                </Link>
                <p className="mt-2 text-center text-xs text-zinc-400">
                  Opens the studio with this prompt pre-filled.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* More by this creator */}
        {moreByCreator.length > 0 && (
          <div className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  More by {creatorName ?? "this creator"}
                </h2>
              </div>
              {design.creator_id && (
                <Link
                  href={`/creators/${design.creator_id}`}
                  className="text-xs text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  See all →
                </Link>
              )}
            </div>
            <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {moreByCreator.map((related) => (
                <li key={related.id}>
                  <Link
                    href={`/marketplace/${related.id}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
                  >
                    {related.image_url ? (
                      <div className="aspect-square w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
                        <img
                          src={related.image_url}
                          alt={
                            related.product_type
                              ? `${related.product_type} design`
                              : "Design"
                          }
                          className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square w-full bg-zinc-100 dark:bg-zinc-800" />
                    )}
                    <div className="p-3">
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {related.title ?? (related.product_type ? `${related.product_type} Design` : "Design")}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                        {related.prompt}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
