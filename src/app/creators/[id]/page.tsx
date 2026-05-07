import type { Metadata } from "next";
import Image from "next/image";
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
    .from("public_profiles")
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
    .from("public_profiles")
    .select("display_name, bio")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: designs } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, style, image_url")
    .eq("creator_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  const publishedDesigns = designs ?? [];

  const displayName = profile.display_name ?? "Anonymous creator";

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/marketplace"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Marketplace
        </Link>

        {/* Creator header */}
        <div className="mt-10 border-b border-zinc-200 pb-10 dark:border-zinc-800">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-200 text-2xl font-bold text-white dark:bg-white dark:text-zinc-900 dark:ring-zinc-700">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {publishedDesigns.length === 0
                  ? "No published designs yet"
                  : `${publishedDesigns.length} ${publishedDesigns.length === 1 ? "design" : "designs"} published`}
              </p>
            </div>
          </div>
          {profile.bio && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Designs grid */}
        <div className="mt-10">
          {publishedDesigns.length > 0 ? (
            <>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {publishedDesigns.map((design) => (
                  <li key={design.id}>
                    <Link
                      href={`/marketplace/${design.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
                    >
                      {design.image_url ? (
                        <div className="relative aspect-square w-full overflow-hidden">
                          <Image
                            src={design.image_url}
                            alt={
                              design.product_type
                                ? `${design.product_type} design`
                                : "Design"
                            }
                            fill
                            sizes="(min-width: 1280px) 256px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square w-full bg-zinc-100 dark:bg-zinc-800" />
                      )}
                      <div className="flex flex-col gap-1 p-4">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                        </p>
                        {design.style && (
                          <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {design.style}
                          </span>
                        )}
                        <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-zinc-400">
                          {design.prompt}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                No published designs yet
              </p>
              <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
                This creator hasn&apos;t published anything yet.
              </p>
            </div>
          )}
        </div>

        {/* Studio CTA */}
        <div className="mt-16 border-t border-zinc-200 pt-8 pb-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            Inspired by what you see?{" "}
            <Link
              href="/generate"
              className="text-zinc-500 underline underline-offset-2 transition-colors hover:text-violet-600"
            >
              Create your own design →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
