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
    .select("id, prompt, product_type, style, image_url, created_at")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!design) {
    notFound();
  }

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

          {(design.product_type || design.style) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {design.product_type && (
                <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
                  {design.product_type}
                </span>
              )}
              {design.style && (
                <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
                  {design.style}
                </span>
              )}
            </div>
          )}

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
            {design.product_type ? `${design.product_type} Design` : "Design"}
          </h1>

          <p className="mt-6 text-base leading-relaxed text-zinc-300">
            &ldquo;{design.prompt}&rdquo;
          </p>

          <p className="mt-10 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
            Published {formatDate(design.created_at)}
          </p>
        </div>
      </div>
    </main>
  );
}
