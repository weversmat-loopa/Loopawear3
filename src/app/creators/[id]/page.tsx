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
import ConfirmForm from "@/components/ui/ConfirmForm";
import ImageUploadField from "@/components/profile/ImageUploadField";
import ProfileForm from "@/app/account/ProfileForm";
import CreatorTabs, { type TabId } from "./CreatorTabs";
import { submitForReview, unpublishDesign, deleteDesign } from "@/app/account/actions";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function euros(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

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

  // ── Tab definitions ───────────────────────────────────────────────────────
  const publicTabs = [{ id: "designs" as TabId, label: "Designs" }];
  const ownerTabs = [
    { id: "designs" as TabId, label: "Designs" },
    { id: "drafts" as TabId, label: "Drafts" },
    { id: "sales" as TabId, label: "Sales" },
    { id: "credits" as TabId, label: "Credits" },
    { id: "settings" as TabId, label: "Settings" },
  ];
  const tabs = isOwnProfile ? ownerTabs : publicTabs;

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

        {/* ── Tab bar ── */}
        <div className="mt-10">
          <CreatorTabs tabs={tabs} activeTab={activeTab} profileId={id} />
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB: DESIGNS  (public)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "designs" && (
          <div className="mt-6">
            {publishedDesigns.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No published designs yet</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {isOwnProfile
                    ? "Head to the Studio to create your first design."
                    : "This creator hasn't published anything yet."}
                </p>
                {isOwnProfile && (
                  <Link href="/generate" className="mt-3 text-xs text-violet-600 underline underline-offset-2">
                    Open Studio →
                  </Link>
                )}
              </div>
            )}

            {/* Studio CTA for public visitors */}
            {!isOwnProfile && (
              <div className="mt-16 border-t border-zinc-200 pt-8 pb-4 dark:border-zinc-800">
                <p className="text-sm text-zinc-500">
                  Inspired?{" "}
                  <Link href="/generate" className="text-zinc-500 underline underline-offset-2 transition-colors hover:text-violet-600">
                    Create your own design →
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: DRAFTS  (owner only — data only present if isOwnProfile)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "drafts" && isOwnProfile && ownerData && (
          <div className="mt-6 space-y-10 pb-16">
            {/* Drafts */}
            <section>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Drafts</h2>
                {ownerData.drafts.length > 0 && (
                  <span className="text-sm text-zinc-400">{ownerData.drafts.length}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-500">Saved designs not yet visible in the marketplace.</p>

              {ownerData.drafts.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {ownerData.drafts.map((design) => (
                    <li key={design.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-paper dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="flex">
                        <Link href={`/account/designs/${design.id}`} className="relative block aspect-square w-20 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800" tabIndex={-1} aria-hidden>
                          {design.image_url && <Image src={design.image_url} alt="" fill sizes="80px" className="object-cover" />}
                        </Link>
                        <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Link href={`/account/designs/${design.id}`} className="text-sm font-medium text-zinc-900 transition-colors hover:text-violet-600 dark:text-zinc-100">
                                {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                              </Link>
                              {design.image_status === "generating" && (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-600">Generating…</span>
                              )}
                              {design.image_status === "failed" && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-600">Failed</span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{design.prompt}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {design.product_type && (
                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">{design.product_type}</span>
                            )}
                            <span className="text-xs text-zinc-400">{formatDate(design.created_at)}</span>
                            <div className="ml-auto flex items-center gap-3">
                              <Link href={`/account/designs/${design.id}`} className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">Edit</Link>
                              {design.image_status === "ready" && (
                                <ConfirmForm action={submitForReview} message="Submit this design for marketplace review?" hiddenFields={{ designId: design.id }}>
                                  <button type="submit" className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">Submit for review →</button>
                                </ConfirmForm>
                              )}
                              <ConfirmForm action={deleteDesign} message="Delete this design permanently? This cannot be undone." hiddenFields={{ designId: design.id }}>
                                <button type="submit" className="text-xs text-zinc-400 transition-colors hover:text-red-500">Delete</button>
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
                    <Link href="/generate" className="underline underline-offset-2 transition-colors hover:text-violet-600">Studio</Link>
                    {" "}to create your first design.
                  </p>
                </div>
              )}
            </section>

            {/* In review */}
            {ownerData.pendingDesigns.length > 0 && (
              <section>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">In review</h2>
                  <span className="text-sm text-zinc-400">{ownerData.pendingDesigns.length}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">Submitted designs awaiting admin review.</p>
                <ul className="mt-4 space-y-2">
                  {ownerData.pendingDesigns.map((design) => (
                    <li key={design.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-paper dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="flex">
                        <Link href={`/account/designs/${design.id}`} className="relative block aspect-square w-20 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800" tabIndex={-1} aria-hidden>
                          {design.image_url && <Image src={design.image_url} alt="" fill sizes="80px" className="object-cover" />}
                        </Link>
                        <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Link href={`/account/designs/${design.id}`} className="text-sm font-medium text-zinc-900 transition-colors hover:text-violet-600 dark:text-zinc-100">
                                {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                              </Link>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">In review</span>
                            </div>
                            <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{design.prompt}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {design.product_type && (
                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">{design.product_type}</span>
                            )}
                            <span className="text-xs text-zinc-400">{formatDate(design.created_at)}</span>
                            <div className="ml-auto">
                              <ConfirmForm action={deleteDesign} message="Delete this design permanently? This cannot be undone." hiddenFields={{ designId: design.id }}>
                                <button type="submit" className="text-xs text-zinc-400 transition-colors hover:text-red-500">Delete</button>
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
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: SALES  (owner only)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "sales" && isOwnProfile && ownerData && (
          <div className="mt-6 pb-16">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Sales & Earnings</h2>
            <p className="mt-1 text-sm text-zinc-500">Revenue from completed and processing orders.</p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total sales", value: euros(ownerData.totalSalesCents) },
                { label: "Orders", value: ownerData.orderCount },
                { label: "Items sold", value: ownerData.itemsSold },
                { label: "Earned", value: euros(ownerData.totalEarnedCents) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-zinc-200 bg-paper px-4 py-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</p>
                </div>
              ))}
            </div>

            {ownerData.orderCount === 0 && (
              <p className="mt-6 text-sm text-zinc-400 dark:text-zinc-500">
                No sales yet. Earnings appear here once buyers complete checkout.
              </p>
            )}

            <div className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
              Earnings shown are your creator share from paid, processing, and shipped orders.
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: CREDITS  (owner only)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "credits" && isOwnProfile && ownerData && (
          <div className="mt-6 pb-16">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">AI Credits</h2>
            <p className="mt-1 text-sm text-zinc-500">Credits are used to generate designs in the Studio.</p>

            <div className="mt-4 inline-flex items-baseline gap-2 rounded-xl border border-zinc-200 bg-paper px-6 py-5 dark:border-zinc-700 dark:bg-zinc-900">
              <span className="font-display text-4xl text-ink">
                {ownerData.ownProfile?.generation_credits ?? 0}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {(ownerData.ownProfile?.generation_credits ?? 0) === 1 ? "credit" : "credits"} remaining
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">How credits work</p>
              <p className="mt-1">Each AI image generation costs 1 credit. Credits are granted when you sign up and can be topped up by the platform.</p>
            </div>

            <div className="mt-6">
              <Link href="/generate" className="sticker-sm inline-block rounded-full bg-brand-blue px-5 py-2 text-sm font-extrabold text-white">
                Open Studio →
              </Link>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: SETTINGS  (owner only)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && isOwnProfile && ownerData && (
          <div className="mt-6 pb-16">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Profile settings</h2>
            <p className="mt-1 text-sm text-zinc-500">Update your public profile information.</p>

            <div className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-paper dark:divide-zinc-800 dark:border-zinc-700 dark:bg-zinc-900">
              <ProfileForm
                displayName={ownerData.ownProfile?.display_name ?? ""}
                bio={ownerData.ownProfile?.bio ?? ""}
                websiteUrl={ownerData.ownProfile?.website_url ?? ""}
                instagramUrl={ownerData.ownProfile?.instagram_url ?? ""}
                tiktokUrl={ownerData.ownProfile?.tiktok_url ?? ""}
              />

              <div className="px-5 py-4">
                <ImageUploadField
                  kind="avatar"
                  currentUrl={ownerData.ownProfile?.avatar_url ?? null}
                  displayName={ownerData.ownProfile?.display_name ?? ownerData.userEmail ?? ""}
                />
              </div>

              <div className="px-5 py-4">
                <ImageUploadField
                  kind="banner"
                  currentUrl={ownerData.ownProfile?.banner_url ?? null}
                  displayName={ownerData.ownProfile?.display_name ?? ownerData.userEmail ?? ""}
                />
              </div>

              <div className="px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email</p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{ownerData.userEmail}</p>
              </div>

              <div className="px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Role</p>
                <p className="mt-1 text-sm capitalize text-zinc-900 dark:text-zinc-100">{ownerData.ownProfile?.role ?? "buyer"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
