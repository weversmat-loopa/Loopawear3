import type { Metadata } from "next";
import { createServiceClient } from "@/utils/supabase/service";

export const metadata: Metadata = {
  title: "Admin — Overview",
};

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
};

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div
      className={`ink-card rounded-xl p-5 ${
        accent ? "bg-brand-orange" : "bg-paper"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-widest ${
          accent ? "text-white/80" : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 font-display text-3xl tabular-nums ${
          accent ? "text-white" : "text-ink"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`mt-1 text-xs ${
            accent ? "text-white/70" : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const service = createServiceClient();

  // Run all stat queries in parallel
  const [
    { count: pendingCount },
    { count: totalOrders },
    { data: revenueRows },
    { count: totalUsers },
    { count: publishedDesigns },
    { count: totalDesigns },
  ] = await Promise.all([
    service
      .from("designs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
    service
      .from("orders")
      .select("*", { count: "exact", head: true }),
    service
      .from("orders")
      .select("amount_total_cents")
      .in("status", ["paid", "fulfillment_pending", "shipped"]),
    service
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    service
      .from("designs")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    service
      .from("designs")
      .select("*", { count: "exact", head: true }),
  ]);

  const totalRevenueCents = (revenueRows ?? []).reduce(
    (sum, r) => sum + (r.amount_total_cents ?? 0),
    0
  );
  const revenueStr = `€${(totalRevenueCents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <main className="flex flex-1 flex-col px-6 py-12 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Live platform stats.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Pending review"
            value={pendingCount ?? 0}
            sub="designs in queue"
            accent={(pendingCount ?? 0) > 0}
          />
          <StatCard
            label="Total orders"
            value={totalOrders ?? 0}
            sub="all time"
          />
          <StatCard
            label="Revenue"
            value={revenueStr}
            sub="paid + fulfilled"
          />
          <StatCard
            label="Users"
            value={totalUsers ?? 0}
            sub="registered accounts"
          />
          <StatCard
            label="Designs"
            value={`${publishedDesigns ?? 0} / ${totalDesigns ?? 0}`}
            sub="published / total"
          />
        </div>
      </div>
    </main>
  );
}
