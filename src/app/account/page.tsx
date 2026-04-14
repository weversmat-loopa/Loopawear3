import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import Input from "@/components/ui/Input";
import { createClient } from "@/utils/supabase/server";
import { updateDisplayName, publishDraft, unpublishDesign } from "./actions";

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
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: drafts } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style, image_url, created_at")
    .eq("creator_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: publishedDesigns } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style, image_url, created_at")
    .eq("creator_id", user.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  const params = await searchParams;
  const success = params?.success;
  const error = params?.error;

  return (
    <PageShell>
      <div className="w-full max-w-md text-left">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Your account
        </h1>

        {success && (
          <p className="mt-4 text-sm text-green-400">{success}</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-8 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="px-6 py-4">
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
                  className="shrink-0 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>

          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Email
            </p>
            <p className="mt-1 text-sm text-white">{user.email}</p>
          </div>

          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Role
            </p>
            <p className="mt-1 text-sm capitalize text-white">
              {profile?.role ?? "buyer"}
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Drafts
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your saved design drafts.
          </p>

          {drafts && drafts.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {drafts.map((design) => (
                <li
                  key={design.id}
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
                >
                  <div className="flex">
                    {design.image_url ? (
                      <div className="w-16 shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
                        <img
                          src={design.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : (
                      <div className="w-16 shrink-0 bg-zinc-900" />
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      <Link
                        href={`/account/designs/${design.id}`}
                        className="line-clamp-2 text-sm leading-relaxed text-zinc-300 transition-colors hover:text-white"
                      >
                        {design.prompt}
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
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
                        <div className="ml-auto flex items-center gap-4">
                          <span className="text-xs text-zinc-600">
                            {formatDate(design.created_at)}
                          </span>
                          <form action={publishDraft}>
                            <input
                              type="hidden"
                              name="designId"
                              value={design.id}
                            />
                            <button
                              type="submit"
                              className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
                            >
                              Publish
                            </button>
                          </form>
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
                Go to Generate to create your first design.
              </p>
            </div>
          )}
        </section>

        <section className="mt-10 pb-16">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Published
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your designs visible in the marketplace.
          </p>

          {publishedDesigns && publishedDesigns.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {publishedDesigns.map((design) => (
                <li
                  key={design.id}
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
                >
                  <div className="flex">
                    {design.image_url ? (
                      <div className="w-16 shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
                        <img
                          src={design.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : (
                      <div className="w-16 shrink-0 bg-zinc-900" />
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      <Link
                        href={`/account/designs/${design.id}`}
                        className="line-clamp-2 text-sm leading-relaxed text-zinc-300 transition-colors hover:text-white"
                      >
                        {design.prompt}
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
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
                        <div className="ml-auto flex items-center gap-4">
                          <span className="text-xs text-zinc-600">
                            {formatDate(design.created_at)}
                          </span>
                          <Link
                            href={`/marketplace/${design.id}`}
                            className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
                          >
                            View ↗
                          </Link>
                          <form action={unpublishDesign}>
                            <input
                              type="hidden"
                              name="designId"
                              value={design.id}
                            />
                            <button
                              type="submit"
                              className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
                            >
                              Unpublish
                            </button>
                          </form>
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
                Publish a draft to see it here.
              </p>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
