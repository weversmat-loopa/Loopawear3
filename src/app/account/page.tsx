import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Input from "@/components/ui/Input";
import { createClient } from "@/utils/supabase/server";
import { updateDisplayName, publishDraft, unpublishDesign } from "./actions";
import ConfirmForm from "@/components/ui/ConfirmForm";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your designs, orders, and creator profile.",
  robots: { index: false },
};

type AccountPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type DesignRow = {
  id: string;
  title: string | null;
  prompt: string;
  product_type: string | null;
  style: string | null;
  image_url: string | null;
  image_status: string | null;
  created_at: string;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, generation_credits")
    .eq("id", user.id)
    .maybeSingle();

  const { data: draftsRaw } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, style, image_url, image_status, created_at")
    .eq("creator_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: publishedRaw } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, style, image_url, image_status, created_at")
    .eq("creator_id", user.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  const drafts: DesignRow[] = draftsRaw ?? [];
  const publishedDesigns: DesignRow[] = publishedRaw ?? [];

  const params = await searchParams;
  const success = params?.success;
  const error = params?.error;

  return (
    <main className="flex flex-1 flex-col bg-black px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          Your account
        </h1>

        {success && (
          <p className="mt-4 text-sm text-green-400">{success}</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {/* Profile settings */}
        <div className="mt-8 divide-y divide-zinc-800/60 rounded-2xl border border-zinc-800/60 bg-zinc-950">
          <div className="px-5 py-4">
            <form action={updateDisplayName}>
              <label
                htmlFor="display_name"
                className="text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                Name
              </label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  defaultValue={profile?.display_name ?? ""}
                  placeholder="Your display name"
                  autoComplete="name"
                />
                <button
                  type="submit"
                  className="shrink-0 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-300"
                >
                  Save
                </button>
              </div>
            </form>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Email
            </p>
            <p className="mt-1 text-sm text-white">{user.email}</p>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Role
            </p>
            <p className="mt-1 text-sm capitalize text-white">
              {profile?.role ?? "buyer"}
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Generation credits
            </p>
            <p className="mt-1 text-sm text-white">
              {profile?.generation_credits ?? 0}{" "}
              <span className="text-zinc-600">
                {(profile?.generation_credits ?? 0) === 1 ? "credit" : "credits"} remaining
              </span>
            </p>
          </div>
        </div>

        {/* Drafts */}
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-base font-semibold tracking-tight text-white">
              Drafts
            </h2>
            {drafts.length > 0 && (
              <span className="text-sm text-zinc-600">{drafts.length}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Saved designs not yet visible in the marketplace.
          </p>

          {drafts.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {drafts.map((design) => (
                <li
                  key={design.id}
                  className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <Link
                      href={`/account/designs/${design.id}`}
                      className="block aspect-square w-20 shrink-0 overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950"
                      tabIndex={-1}
                      aria-hidden
                    >
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
                    </Link>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/account/designs/${design.id}`}
                            className="text-sm font-medium text-white transition-colors hover:text-zinc-300"
                          >
                            {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                          </Link>
                          {design.image_status === "generating" && (
                            <span className="rounded-full border border-violet-800/60 px-2 py-0.5 text-xs text-violet-400/70">
                              Generating…
                            </span>
                          )}
                          {design.image_status === "failed" && (
                            <span className="rounded-full border border-red-900 px-2 py-0.5 text-xs text-red-500">
                              Failed
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-600">
                          {design.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {design.product_type && (
                          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-600">
                            {design.product_type}
                          </span>
                        )}
                        <span className="text-xs text-zinc-700">
                          {formatDate(design.created_at)}
                        </span>
                        <div className="ml-auto flex items-center gap-3">
                          <Link
                            href={`/account/designs/${design.id}`}
                            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                          >
                            Edit
                          </Link>
                          {design.image_status === "ready" && (
                            <ConfirmForm
                              action={publishDraft}
                              message="Publish this design to the marketplace?"
                              hiddenFields={{ designId: design.id }}
                            >
                              <button
                                type="submit"
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black transition-opacity hover:opacity-75"
                              >
                                Publish →
                              </button>
                            </ConfirmForm>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-800 px-6 py-10 text-center">
              <p className="text-sm text-zinc-500">No drafts yet</p>
              <p className="mt-1 text-xs text-zinc-700">
                Head to the{" "}
                <Link href="/generate" className="underline underline-offset-2 transition-colors hover:text-violet-300">
                  Studio
                </Link>{" "}
                to create your first design.
              </p>
            </div>
          )}
        </section>

        {/* Published */}
        <section className="mt-12 pb-16">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-base font-semibold tracking-tight text-white">
              Published
            </h2>
            {publishedDesigns.length > 0 && (
              <span className="text-sm text-zinc-600">{publishedDesigns.length}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Designs visible in the public marketplace.
          </p>

          {publishedDesigns.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {publishedDesigns.map((design) => (
                <li
                  key={design.id}
                  className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <Link
                      href={`/account/designs/${design.id}`}
                      className="block aspect-square w-20 shrink-0 overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950"
                      tabIndex={-1}
                      aria-hidden
                    >
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
                    </Link>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <Link
                          href={`/account/designs/${design.id}`}
                          className="text-sm font-medium text-white transition-colors hover:text-zinc-300"
                        >
                          {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                        </Link>
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-600">
                          {design.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {design.product_type && (
                          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-600">
                            {design.product_type}
                          </span>
                        )}
                        <span className="text-xs text-zinc-700">
                          {formatDate(design.created_at)}
                        </span>
                        <div className="ml-auto flex items-center gap-3">
                          <Link
                            href={`/marketplace/${design.id}`}
                            className="text-xs text-zinc-400 transition-colors hover:text-white"
                          >
                            View ↗
                          </Link>
                          <ConfirmForm
                            action={unpublishDesign}
                            message="Remove this design from the marketplace?"
                            hiddenFields={{ designId: design.id }}
                          >
                            <button
                              type="submit"
                              className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
                            >
                              Unpublish
                            </button>
                          </ConfirmForm>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-800 px-6 py-10 text-center">
              <p className="text-sm text-zinc-500">No published designs yet</p>
              <p className="mt-1 text-xs text-zinc-700">
                Publish a draft to make it visible in the marketplace.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
