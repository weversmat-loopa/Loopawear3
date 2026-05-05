import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  robots: { index: false },
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
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-zinc-900">
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
      className="group rounded-xl border border-zinc-200 bg-white px-4 py-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
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

  const published = publishedCount ?? 0;
  const drafts = draftCount ?? 0;
  const total = published + drafts;
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
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
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
          <StatCard label="Drafts" value={drafts} />
          <StatCard label="Total designs" value={total} />
          <StatCard label="Credits" value={credits} />
        </div>

        {/* Sales — placeholder, not connected */}
        <section className="mt-10">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sales
            </h2>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
              Coming soon
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
            Sales tracking will activate once checkout is connected.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total sales" value="€0.00" muted />
            <StatCard label="Orders" value={0} muted />
            <StatCard label="Items sold" value={0} muted />
            <StatCard label="Pending payout" value="€0.00" muted />
          </div>
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
