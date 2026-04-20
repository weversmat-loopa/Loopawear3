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

  const studioParams = new URLSearchParams({ prompt: design.prompt });
  if (design.product_type) studioParams.set("product_type", design.product_type);
  if (design.style) studioParams.set("style", design.style);
  const studioHref = `/generate?${studioParams.toString()}`;

  return (
    <main className="flex flex-1 flex-col bg-black px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/marketplace"
          className="text-sm text-zinc-500 transition-colors hover:text-white"
        >
          ← Marketplace
        </Link>

        <div className="mt-10">
          {design.image_url && (
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
                loading="lazy"
                decoding="async"
              />
            </div>
          )}

          <div className="mt-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {design.product_type ? `${design.product_type} Design` : "Design"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {creatorName && (
                <span className="text-sm text-zinc-500">by {creatorName}</span>
              )}
              {design.style && (
                <span className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-xs text-zinc-500">
                  {design.style}
                </span>
              )}
            </div>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-zinc-400">
            &ldquo;{design.prompt}&rdquo;
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-zinc-900 pt-6">
            <Link
              href={studioHref}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-75"
            >
              Create something similar →
            </Link>
            <p className="text-xs text-zinc-600">
              Opens the studio with this prompt pre-filled.
            </p>
          </div>

          <p className="mt-8 text-xs text-zinc-700">
            Published {formatDate(design.created_at)}
          </p>
        </div>
      </div>
    </main>
  );
}
