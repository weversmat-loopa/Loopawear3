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
import CreatorTabContent from "./CreatorTabContent";
import type { TabId } from "./CreatorTabs";

// ── Types ──────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
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

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_TABS: TabId[] = ["designs", "drafts", "sales", "credits", "settings"];

function resolveTab(raw: string | undefined, isOwner: boolean): TabId {
  const t = (raw ?? "designs") as TabId;
  if (!VALID_TABS.includes(t)) return "designs";
  // Non-owners are always forced to the public tab, regardless of URL param.
  // This is the server-side gate — no private tab can be reached by URL-hacking.
  if (!isOwner && t !== "designs") return "designs";
  return t;
}

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();

  if (!profile?.display_name) return { title: "Creator" };

  return {
    title: `${profile.display_name} — Creator`,
    description: `Explore designs by ${profile.display_name} on Loopawear.`,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function CreatorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const rawTab = (await searchParams)?.tab;
  const supabase = await createClient();

  // ── Public profile (always needed) ──────────────────────────────────────
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("display_name, bio, avatar_url, banner_url, website_url, instagram_url, tiktok_url")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const displayName = profile.display_name ?? "Anonymous creator";

  // ── Auth: verify ownership server-side ──────────────────────────────────
  // SECURITY: ownership is established here via the Supabase auth helper,
  // which reads the session cookie. No client-side check is trusted.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = !!user && user.id === id;

  // Resolve tab — non-owners are hard-redirected to "designs" server-side.
  const activeTab = resolveTab(rawTab, isOwnProfile);

  // ── Public stats (always needed) ────────────────────────────────────────
  const { data: creatorDesigns } = await supabase
    .from("designs")
    .select("id")
    .eq("creator_id", id)
    .eq("status", "published")
    .is("archived_at", null);

  let totalLikes = 0;
  if (creatorDesigns && creatorDesigns.length > 0) {
    const designIds = creatorDesigns.map((d) => d.id);
    const { count: lc } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .in("design_id", designIds);
    totalLikes = lc ?? 0;
  }

  const { count: salesCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id);

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", id);

  // ── Designs tab (public) ─────────────────────────────────────────────────
  const { data: publishedDesignsRaw, count: designCount } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, style, image_url", { count: "exact" })
    .eq("creator_id", id)
    .eq("status", "published")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const publishedDesigns = publishedDesignsRaw ?? [];
  const totalDesigns = designCount ?? publishedDesigns.length;

  // ── Follow state (only for logged-in non-owners) ─────────────────────────
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

  // ── PRIVATE DATA: only fetched when viewer IS the owner ─────────────────
  // All queries below are inside this block. If isOwnProfile is false, none
  // of these variables exist in the render tree — they are never serialised
  // into the page HTML or RSC payload sent to the browser.
  let ownerData: {
    ownProfile: {
      display_name: string | null;
      bio: string | null;
      avatar_url: string | null;
      banner_url: string | null;
      website_url: string | null;
      instagram_url: string | null;
      tiktok_url: string | null;
      role: string | null;
      generation_credits: number | null;
    } | null;
    drafts: DesignRow[];
    pendingDesigns: DesignRow[];
    totalSalesCents: number;
    totalEarnedCents: number;
    orderCount: number;
    itemsSold: number;
    userEmail: string | undefined;
  } | null = null;

  if (isOwnProfile && user) {
    // Full profile from private `profiles` table (not the public view)
    const { data: ownProfile } = await supabase
      .from("profiles")
      .select("display_name, bio, avatar_url, banner_url, website_url, instagram_url, tiktok_url, role, generation_credits")
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

    // Sales/earnings from orders table — creator_id scoped to this user
    const { data: ordersRaw } = await supabase
      .from("orders")
      .select("amount_total_cents, creator_earnings_cents, quantity")
      .eq("creator_id", user.id)
      .in("status", ["paid", "fulfillment_pending", "shipped"]);

    const orders = ordersRaw ?? [];
    const totalSalesCents = orders.reduce((s, o) => s + o.amount_total_cents, 0);
    const totalEarnedCents = orders.reduce((s, o) => s + o.creator_earnings_cents, 0);
    const orderCount = orders.length;
    const itemsSold = orders.reduce((s, o) => s + o.quantity, 0);

    ownerData = {
      ownProfile,
      drafts: draftsRaw ?? [],
      pendingDesigns: pendingRaw ?? [],
      totalSalesCents,
      totalEarnedCents,
      orderCount,
      itemsSold,
      userEmail: user.email,
    };
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-1 flex-col px-6 py-10 md:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/marketplace"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Marketplace
        </Link>

        {/* ── Banner ── */}
        <div className="mt-6">
          <ProfileBanner bannerUrl={profile.banner_url ?? null} displayName={displayName} />
        </div>

        {/* ── Header row: avatar + name + CTA ── */}
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

          {/* Own profile → link to Settings tab; other profiles → Follow */}
          {isOwnProfile && (
            <Link
              href={`/creators/${id}?tab=settings`}
              className="sticker-sm rounded-full bg-paper px-5 py-2 text-sm font-extrabold text-ink"
            >
              Edit profile
            </Link>
          )}
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

        {/* ── Stats ── */}
        <ProfileStatTiles
          designCount={totalDesigns}
          likesCount={totalLikes}
          salesCount={salesCount ?? 0}
          followerCount={followerCount ?? 0}
          followingCount={followingCount ?? 0}
        />

        {/* ── Tabs + tab content (client component for instant tab switching) ── */}
        <CreatorTabContent
          initialTab={activeTab}
          profileId={id}
          isOwnProfile={isOwnProfile}
          publishedDesigns={publishedDesigns}
          ownerData={ownerData}
        />
      </div>
    </main>
  );
}
