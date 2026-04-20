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
    .select("prompt, product_type")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!design) {
    return { title: "Design not found" };
  }

  const title = design.product_type
    ? `${design.product_type} Design`
    : "Design";

  return {
    title,
    description: design.prompt.slice(0, 160),
  };
}

export default async function DesignPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: design } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style, image_url, created_at, creator_id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!design) {
    notFound();
  }

  let creatorName: string | null = null;
  if (design.creator_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", design.creator_id)
      .maybeSingle();
    creatorName = profile?.display_name ?? null;
  }

  // Fetch up to 3 other published designs by the same creator
  let moreByCreator: {
    id: string;
    product_type: string | null;
    image_url: string | null;
    prompt: string;
  }[] = [];
  if (design.creator_id) {
    const { data: more } = await supabase
      .from("designs")
      .select("id, product_type, image_url, prompt")
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
    <main className="flex flex-1 flex-col bg-black px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/marketplace"
          className="text-sm text-zinc-500 transition-colors hover:text-white"
        >
          ← Marketplace
        </Link>

        <div className="mt-10 lg:grid lg:grid-cols-2 lg:gap-12">
          {/* Image */}
          <div className="lg:sticky lg:top-10 lg:self-start">
            {design.image_url ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800">
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
              <div className="aspect-square w-full rounded-xl border border-zinc-800 bg-zinc-950" />
            )}
          </div>

          {/* Info */}
          <div className="mt-8 flex flex-col lg:mt-0">
            <div className="flex flex-wrap items-center gap-2">
              {design.product_type && (
                <span className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-xs text-zinc-500">
                  {design.product_type}
                </span>
              )}
              {design.style && (
                <span className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-xs text-zinc-500">
                  {design.style}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
              {design.product_type ? `${design.product_type} Design` : "Design"}
            </h1>

            {creatorName && (
              <Link
                href={`/creators/${design.creator_id}`}
                className="mt-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                by {creatorName}
              </Link>
            )}

            <p className="mt-6 text-sm leading-relaxed text-zinc-400">
              &ldquo;{design.prompt}&rdquo;
            </p>

            <div className="mt-auto pt-10">
              <div className="border-t border-zinc-900 pt-6">
                <Link
                  href={studioHref}
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-75"
                >
                  Create something similar →
                </Link>
                <p className="mt-2 text-center text-xs text-zinc-600">
                  Opens the studio with this prompt pre-filled.
                </p>
              </div>

              <p className="mt-6 text-xs text-zinc-700">
                Published {formatDate(design.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* More by this creator */}
        {moreByCreator.length > 0 && (
          <div className="mt-16 border-t border-zinc-900 pt-10">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                More by {creatorName ?? "this creator"}
              </h2>
              {design.creator_id && (
                <Link
                  href={`/creators/${design.creator_id}`}
                  className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
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
                    className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-600"
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
                      <div className="aspect-square w-full bg-zinc-900" />
                    )}
                    <div className="p-3">
                      <p className="text-xs font-medium text-white">
                        {related.product_type
                          ? `${related.product_type} Design`
                          : "Design"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-600">
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
