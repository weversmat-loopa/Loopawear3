import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();

  if (!profile?.display_name) {
    return { title: "Creator" };
  }

  return {
    title: `${profile.display_name} — Creator`,
    description: `Explore designs by ${profile.display_name} on Loopawear.`,
  };
}

export default async function CreatorPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: designs } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style, image_url")
    .eq("creator_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  const publishedDesigns = designs ?? [];

  const displayName = profile.display_name ?? "Anonymous creator";

  return (
    <main className="flex flex-1 flex-col bg-black px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/marketplace"
          className="text-sm text-zinc-500 transition-colors hover:text-white"
        >
          ← Marketplace
        </Link>

        <div className="mt-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {displayName}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                {publishedDesigns.length}{" "}
                {publishedDesigns.length === 1 ? "design" : "designs"} published
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          {publishedDesigns.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publishedDesigns.map((design) => (
                <li key={design.id}>
                  <Link
                    href={`/marketplace/${design.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-600"
                  >
                    {design.image_url ? (
                      <div className="aspect-square w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
                        <img
                          src={design.image_url}
                          alt={
                            design.product_type
                              ? `${design.product_type} design`
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
                    <div className="flex flex-col gap-1 p-4">
                      <p className="text-sm font-medium text-white">
                        {design.product_type
                          ? `${design.product_type} Design`
                          : "Design"}
                      </p>
                      {design.style && (
                        <p className="text-xs text-zinc-500">{design.style}</p>
                      )}
                      <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-zinc-600">
                        {design.prompt}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center border-t border-zinc-900 py-24 text-center">
              <p className="text-sm font-medium text-zinc-500">
                No published designs yet
              </p>
              <p className="mt-2 text-sm text-zinc-700">
                This creator hasn&apos;t published anything yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
