import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileBanner from "@/components/profile/ProfileBanner";
import SocialLinks from "@/components/profile/SocialLinks";
import ProfileStatTiles from "@/components/profile/ProfileStatTiles";
import FollowButton from "@/components/profile/FollowButton";

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

  // ── Public profile ──
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("display_name, bio, avatar_url, banner_url, website_url, instagram_url, tiktok_url")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const displayName = profile.display_name ?? "Anonymous creator";

  // ── Published designs ──
  const { data: designs, count: designCount } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, style, image_url", { count: "exact" })
    .eq("creator_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  const publishedDesigns = designs ?? [];
  const totalDesigns     = designCount ?? publishedDesigns.length;

  // ── Sales count ──
  const { count: salesCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id);

  // ── Follower / following counts ──
  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", id);

  // ── Current viewer (to decide whether to show follow button) ──
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = !!user && user.id === id;

  // Is the current viewer already following this creator?
  let isFollowing = false;
  if (user && !isOwnProfile) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", id)
      .maybeSingle();
    isFollowing = !!followRow;
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10 md:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/marketplace"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Marketplace
        </Link>

        {/* Banner */}
        <div className="mt-6">
          <ProfileBanner bannerUrl={profile.banner_url ?? null} displayName={displayName} />
        </div>

        {/* Header row: avatar + name + follow */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <ProfileAvatar
              avatarUrl={profile.avatar_url ?? null}
              displayName={displayName}
              size={80}
              className="-mt-10 ring-4 ring-paper dark:ring-zinc-900"
            />
            <div>
              <h1 className="font-display text-2xl text-ink sm:text-3xl">{displayName}</h1>
              {profile.bio && (
                <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {profile.bio}
                </p>
              )}
              <SocialLinks
                website_url={profile.website_url ?? null}
                instagram_url={profile.instagram_url ?? null}
                tiktok_url={profile.tiktok_url ?? null}
              />
            </div>
          </div>

          {/* Follow / Unfollow — hidden on own profile */}
          {!isOwnProfile && user && (
            <FollowButton creatorId={id} isFollowing={isFollowing} />
          )}
          {!isOwnProfile && !user && (
            <Link
              href="/login"
              className="sticker rounded-full bg-ink px-5 py-2 text-sm font-extrabold text-paper"
            >
              Follow
            </Link>
          )}
        </div>

        {/* Stats */}
        <ProfileStatTiles
          designCount={totalDesigns}
          salesCount={salesCount ?? 0}
          followerCount={followerCount ?? 0}
          followingCount={followingCount ?? 0}
        />

        {/* Designs grid */}
        <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Published designs
          </h2>

          {publishedDesigns.length > 0 ? (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {publishedDesigns.map((design) => (
                <li key={design.id}>
                  <Link
                    href={`/marketplace/${design.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-paper shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
                  >
                    {design.image_url ? (
                      <div className="relative aspect-square w-full overflow-hidden">
                        <Image
                          src={design.image_url}
                          alt={design.product_type ? `${design.product_type} design` : "Design"}
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
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No published designs yet</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                This creator hasn&apos;t published anything yet.
              </p>
            </div>
          )}
        </div>

        {/* Studio CTA */}
        <div className="mt-16 border-t border-zinc-200 pt-8 pb-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            Inspired?{" "}
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
