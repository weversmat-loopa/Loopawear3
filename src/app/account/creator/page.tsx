import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  robots: { index: false },
};

type OrderAgg = {
  amount_total_cents: number;
  creator_earnings_cents: number;
  quantity: number;
};

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

type DesignRow = {
  id: string;
  title: string | null;
  prompt: string;
  product_type: string | null;
  image_url: string | null;
  image_status: string | null;
  status: string;
};

function StatCard({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-paper px-4 py-4 dark:border-zinc-700 dark:bg-zinc-900">
      <p
        className={`text-xs font-medium uppercase tracking-wider ${
          muted
            ? "text-zinc-400 dark:text-zinc-600"
            : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          muted
            ? "text-zinc-300 dark:text-zinc-600"
            : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200 bg-paper px-4 py-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
    >
      <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-violet-600 dark:text-zinc-100">
        {label} →
      </p>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        {description}
      </p>
    </Link>
  );
}

export default async function CreatorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, role, generation_credits")
    .eq("id", user.id)
    .maybeSingle();

  const { count: publishedCount } = await supabase
    .from("designs")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id)
    .eq("status", "published");

  const { count: draftCount } = await supabase
    .from("designs")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id)
    .eq("status", "draft");

  const { count: pendingCount } = await supabase
    .from("designs")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id)
    .eq("status", "pending_review");

  const { data: ordersRaw } = await supabase
    .from("orders")
    .select("amount_total_cents, creator_earnings_cents, quantity")
    .eq("creator_id", user.id)
    .in("status", ["paid", "fulfillment_pending", "shipped"]);

  const { data: recentRaw } = await supabase
    .from("designs")
    .select("id, title, prompt, product_type, image_url, image_status, status")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(4);

  const orders: OrderAgg[] = ordersRaw ?? [];
  const totalSalesCents = orders.reduce((sum, o) => sum + o.amount_total_cents, 0);
  const totalEarnedCents = orders.reduce((sum, o) => sum + o.creator_earnings_cents, 0);
  const orderCount = orders.length;
  const itemsSold = orders.reduce((sum, o) => sum + o.quantity, 0);

  const recentDesigns: DesignRow[] = recentRaw ?? [];
  const published = publishedCount ?? 0;
  const drafts = draftCount ?? 0;
  const pending = pendingCount ?? 0;
  const credits = profile?.generation_credits ?? 0;
  const displayName = profile?.display_name ?? "Anonymous";

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/account"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Account
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Creator Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of your creator activity on Loopawear.
        </p>

        {/* Profile summary */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-paper px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Creator
          </p>
          <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {displayName}
          </p>
          {profile?.bio && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
              {profile.bio}
            </p>
          )}
          <div className="mt-3">
            <Link
              href={`/creators/${user.id}`}
              className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              View public profile →
            </Link>
          </div>
        </div>

        {/* Design stats — real data */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Published" value={published} />
          <StatCard label="In review" value={pending} />
          <StatCard label="Drafts" value={drafts} />
          <StatCard label="Credits" value={credits} />
        </div>

        {/* Recent designs — real data */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Recent designs
              </h2>
              {recentDesigns.length > 0 && (
                <span className="text-sm text-zinc-400">{recentDesigns.length}</span>
              )}
            </div>
            {recentDesigns.length > 0 && (
              <Link
                href="/account"
                className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                See all →
              </Link>
            )}
          </div>

          {recentDesigns.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {recentDesigns.map((design) => (
                <li
                  key={design.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-paper dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <Link
                    href={`/account/designs/${design.id}`}
                    className="flex transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-14 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {design.image_url ? (
                        <Image
                          src={design.image_url}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {design.title ??
                            (design.product_type
                              ? `${design.product_type} Design`
                              : "Design")}
                        </span>
                        {design.status === "published" ? (
                          <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                            Published
                          </span>
                        ) : design.status === "pending_review" ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                            In review
                          </span>
                        ) : (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            Draft
                          </span>
                        )}
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
                      <p className="line-clamp-1 text-xs text-zinc-400 dark:text-zinc-500">
                        {design.prompt}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 px-6 py-8 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No designs yet</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Head to the{" "}
                <Link
                  href="/generate"
                  className="underline underline-offset-2 transition-colors hover:text-violet-600"
                >
                  Studio
                </Link>{" "}
                to create your first design.
              </p>
            </div>
          )}
        </section>

        {/* Sales — connected to real orders */}
        <section className="mt-10">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sales
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total sales" value={formatEuros(totalSalesCents)} />
            <StatCard label="Orders" value={orderCount} />
            <StatCard label="Items sold" value={itemsSold} />
            <StatCard label="Pending payout" value={formatEuros(totalEarnedCents)} muted />
          </div>
          {orderCount === 0 && (
            <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">
              No sales yet. Sales will appear here once buyers complete checkout.
            </p>
          )}
        </section>

        {/* Quick links */}
        <section className="mt-10 pb-16">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Quick links
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <QuickLink
              href="/generate"
              label="Create new design"
              description="Open the Studio and generate a new design."
            />
            <QuickLink
              href="/account"
              label="Manage designs"
              description="View and edit your drafts and published designs."
            />
            <QuickLink
              href="/marketplace"
              label="Browse marketplace"
              description="Explore published designs from all creators."
            />
            <QuickLink
              href={`/creators/${user.id}`}
              label="View public profile"
              description="See how your creator profile appears publicly."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
