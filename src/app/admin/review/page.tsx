import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { approveDesign, rejectDesign } from "../actions";

export const metadata: Metadata = {
  title: "Review queue",
  robots: { index: false },
};

type AdminReviewPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminReviewPage({
  searchParams,
}: AdminReviewPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    notFound();
  }

  const { data: pendingRaw } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, image_url, creator_id, created_at, price_cents")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true })
    .limit(100);

  const pending = pendingRaw ?? [];

  const creatorIds = [
    ...new Set(
      pending.map((d) => d.creator_id).filter((id): id is string => Boolean(id))
    ),
  ];

  let creatorNames: Record<string, string | null> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    creatorNames = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? null])
    );
  }

  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Review queue
          </h1>
          {pending.length > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-sm font-medium text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
              {pending.length}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Designs submitted for marketplace review. Oldest first.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {pending.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {pending.map((design) => {
              const creatorName =
                creatorNames[design.creator_id] ?? "Unknown creator";
              return (
                <li
                  key={design.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <div className="aspect-square w-24 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {design.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen
                        <img
                          src={design.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {design.title ??
                              (design.product_type
                                ? `${design.product_type} Design`
                                : "Design")}
                          </p>
                          {design.price_cents !== null && (
                            <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              €{(design.price_cents / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          by {creatorName}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                          {design.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <form action={approveDesign}>
                          <input
                            type="hidden"
                            name="designId"
                            value={design.id}
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                          >
                            Approve →
                          </button>
                        </form>
                        <form action={rejectDesign}>
                          <input
                            type="hidden"
                            name="designId"
                            value={design.id}
                          />
                          <button
                            type="submit"
                            className="text-xs text-zinc-400 transition-colors hover:text-red-500"
                          >
                            Reject
                          </button>
                        </form>
                        <Link
                          href={`/account/designs/${design.id}`}
                          className="ml-auto text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                          View workspace →
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Queue is empty
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              No designs pending review.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
