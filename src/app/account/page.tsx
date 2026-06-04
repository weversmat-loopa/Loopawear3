import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import Input from "@/components/ui/Input";
import { createClient } from "@/utils/supabase/server";
import { updateDisplayName, updateBio, submitForReview, unpublishDesign, deleteDesign } from "./actions";
import { updateSocialLinks } from "./profile-actions";
import ConfirmForm from "@/components/ui/ConfirmForm";
import ImageUploadField from "@/components/profile/ImageUploadField";

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
    .select("display_name, role, generation_credits, bio, avatar_url, banner_url, website_url, instagram_url, tiktok_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: draftsRaw } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, style, image_url, image_status, created_at")
    .eq("creator_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: pendingRaw } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, style, image_url, image_status, created_at")
    .eq("creator_id", user.id)
    .eq("status", "pending_review")
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
  const pendingDesigns: DesignRow[] = pendingRaw ?? [];
  const publishedDesigns: DesignRow[] = publishedRaw ?? [];

  const params = await searchParams;
  const success = params?.success;
  const error = params?.error;

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-2xl text-ink sm:text-3xl">
          Your account
        </h1>

        {success && (
          <p className="mt-4 text-sm text-green-600">{success}</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {/* Profile settings */}
        <div className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-paper dark:divide-zinc-800 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="px-5 py-4">
            <form action={updateDisplayName}>
              <label
                htmlFor="display_name"
                className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
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
                  className="shrink-0 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Save
                </button>
              </div>
            </form>
          </div>

          <div className="px-5 py-4">
            <form action={updateBio}>
              <label
                htmlFor="bio"
                className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Bio
              </label>
              <div className="mt-2">
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  defaultValue={profile?.bio ?? ""}
                  placeholder="A short intro about you…"
                  maxLength={300}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-paper px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-violet-400/60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Optional · max 300 characters
                  </p>
                  <button
                    type="submit"
                    className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Avatar upload */}
          <div className="px-5 py-4">
            <ImageUploadField
              kind="avatar"
              currentUrl={profile?.avatar_url ?? null}
              displayName={profile?.display_name ?? user.email ?? ""}
            />
          </div>

          {/* Banner upload */}
          <div className="px-5 py-4">
            <ImageUploadField
              kind="banner"
              currentUrl={profile?.banner_url ?? null}
              displayName={profile?.display_name ?? user.email ?? ""}
            />
          </div>

          {/* Social links */}
          <div className="px-5 py-4">
            <form action={updateSocialLinks}>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Social links
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="website_url" className="text-xs text-zinc-500 dark:text-zinc-400">Website</label>
                  <Input
                    id="website_url"
                    name="website_url"
                    type="url"
                    defaultValue={profile?.website_url ?? ""}
                    placeholder="https://yourwebsite.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="instagram_url" className="text-xs text-zinc-500 dark:text-zinc-400">Instagram</label>
                  <Input
                    id="instagram_url"
                    name="instagram_url"
                    type="url"
                    defaultValue={profile?.instagram_url ?? ""}
                    placeholder="https://instagram.com/handle"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="tiktok_url" className="text-xs text-zinc-500 dark:text-zinc-400">TikTok</label>
                  <Input
                    id="tiktok_url"
                    name="tiktok_url"
                    type="url"
                    defaultValue={profile?.tiktok_url ?? ""}
                    placeholder="https://tiktok.com/@handle"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Save
                </button>
              </div>
            </form>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Email
            </p>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{user.email}</p>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Role
            </p>
            <p className="mt-1 text-sm capitalize text-zinc-900 dark:text-zinc-100">
              {profile?.role ?? "buyer"}
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Generation credits
            </p>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {profile?.generation_credits ?? 0}{" "}
              <span className="text-zinc-400 dark:text-zinc-500">
                {(profile?.generation_credits ?? 0) === 1 ? "credit" : "credits"} remaining
              </span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-4">
          <Link
            href="/account/orders"
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            Your orders →
          </Link>
          <Link
            href="/account/creator"
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            Creator Dashboard →
          </Link>
          <Link
            href={`/creators/${user.id}`}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            View public profile →
          </Link>
        </div>

        {/* Drafts */}
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Drafts
            </h2>
            {drafts.length > 0 && (
              <span className="text-sm text-zinc-400">{drafts.length}</span>
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
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-paper dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <Link
                      href={`/account/designs/${design.id}`}
                      className="relative block aspect-square w-20 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                      tabIndex={-1}
                      aria-hidden
                    >
                      {design.image_url ? (
                        <Image
                          src={design.image_url}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : null}
                    </Link>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/account/designs/${design.id}`}
                            className="text-sm font-medium text-zinc-900 transition-colors hover:text-violet-600 dark:text-zinc-100"
                          >
                            {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                          </Link>
                          {design.image_status === "generating" && (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-600">
                              Generating…
                            </span>
                          )}
                          {design.image_status === "failed" && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-600">
                              Failed
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                          {design.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {design.product_type && (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {design.product_type}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">
                          {formatDate(design.created_at)}
                        </span>
                        <div className="ml-auto flex items-center gap-3">
                          <Link
                            href={`/account/designs/${design.id}`}
                            className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                          >
                            Edit
                          </Link>
                          {design.image_status === "ready" && (
                            <ConfirmForm
                              action={submitForReview}
                              message="Submit this design for marketplace review?"
                              hiddenFields={{ designId: design.id }}
                            >
                              <button
                                type="submit"
                                className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100"
                              >
                                Submit for review →
                              </button>
                            </ConfirmForm>
                          )}
                          <ConfirmForm
                            action={deleteDesign}
                            message="Delete this design permanently? This cannot be undone."
                            hiddenFields={{ designId: design.id }}
                          >
                            <button
                              type="submit"
                              className="text-xs text-zinc-400 transition-colors hover:text-red-500"
                            >
                              Delete
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
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No drafts yet</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Head to the{" "}
                <Link href="/generate" className="underline underline-offset-2 transition-colors hover:text-violet-600">
                  Studio
                </Link>{" "}
                to create your first design.
              </p>
            </div>
          )}
        </section>

        {/* In review */}
        {pendingDesigns.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                In review
              </h2>
              <span className="text-sm text-zinc-400">{pendingDesigns.length}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Submitted designs awaiting admin review before going live.
            </p>
            <ul className="mt-4 space-y-2">
              {pendingDesigns.map((design) => (
                <li
                  key={design.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-paper dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex">
                    <Link
                      href={`/account/designs/${design.id}`}
                      className="relative block aspect-square w-20 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                      tabIndex={-1}
                      aria-hidden
                    >
                      {design.image_url ? (
                        <Image
                          src={design.image_url}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : null}
                    </Link>

                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/account/designs/${design.id}`}
                            className="text-sm font-medium text-zinc-900 transition-colors hover:text-violet-600 dark:text-zinc-100"
                          >
                            {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                          </Link>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                            In review
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                          {design.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {design.product_type && (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {design.product_type}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">
                          {formatDate(design.created_at)}
                        </span>
                        <div className="ml-auto">
                          <ConfirmForm
                            action={deleteDesign}
                            message="Delete this design permanently? This cannot be undone."
                            hiddenFields={{ designId: design.id }}
                          >
                            <button
                              type="submit"
                              className="text-xs text-zinc-400 transition-colors hover:text-red-500"
                            >
                              Delete
                            </button>
                          </ConfirmForm>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Published */}
        <section className="mt-12 pb-16">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Published
            </h2>
            {publishedDesigns.length > 0 && (
              <span className="text-sm text-zinc-400">{publishedDesigns.length}</span>
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
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-paper dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <Link
                      href={`/account/designs/${design.id}`}
                      className="relative block aspect-square w-20 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                      tabIndex={-1}
                      aria-hidden
                    >
                      {design.image_url ? (
                        <Image
                          src={design.image_url}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : null}
                    </Link>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <Link
                          href={`/account/designs/${design.id}`}
                          className="text-sm font-medium text-zinc-900 transition-colors hover:text-violet-600 dark:text-zinc-100"
                        >
                          {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                        </Link>
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                          {design.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {design.product_type && (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {design.product_type}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">
                          {formatDate(design.created_at)}
                        </span>
                        <div className="ml-auto flex items-center gap-3">
                          <Link
                            href={`/marketplace/${design.id}`}
                            className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
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
                              className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              Unpublish
                            </button>
                          </ConfirmForm>
                          <ConfirmForm
                            action={deleteDesign}
                            message="Delete this design permanently? It will be removed from the marketplace. This cannot be undone."
                            hiddenFields={{ designId: design.id }}
                          >
                            <button
                              type="submit"
                              className="text-xs text-zinc-400 transition-colors hover:text-red-500"
                            >
                              Delete
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
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No published designs yet</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Publish a draft to make it visible in the marketplace.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
