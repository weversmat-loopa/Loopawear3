import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/utils/supabase/service";
import AdminDashboardCharts, { type RevenueRow } from "./AdminDashboardCharts";
import { PRINTFUL_PRODUCTION_COST_CENTS, CREATOR_SHARE } from "@/lib/pricing";
import {
  DoodleSparkle,
  DoodleStar,
  DoodleBolt,
  DoodleSquiggle,
} from "@/components/ui/Doodles";

export const metadata: Metadata = {
  title: "Admin — Dashboard",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function euros(cents: number) {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "orange" | "blue" | "green" | "yellow";
  icon?: React.ReactNode;
};

function KpiCard({ label, value, sub, accent, icon }: KpiCardProps) {
  const bg =
    accent === "orange"
      ? "bg-brand-orange"
      : accent === "blue"
      ? "bg-brand-blue"
      : accent === "green"
      ? "bg-brand-green"
      : accent === "yellow"
      ? "bg-brand-yellow"
      : "bg-paper";

  const textMain = accent ? "text-white" : "text-ink";
  const textSub = accent ? "text-white/70" : "text-zinc-500 dark:text-zinc-400";
  const textLabel = accent
    ? "text-white/80"
    : "text-zinc-500 dark:text-zinc-400";

  return (
    <div className={`ink-card rounded-xl p-5 ${bg}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-semibold uppercase tracking-widest ${textLabel}`}>
          {label}
        </p>
        {icon && <span className={`${accent ? "text-white/70" : "text-zinc-400"}`}>{icon}</span>}
      </div>
      <p className={`mt-3 font-display text-3xl tabular-nums leading-none ${textMain}`}>
        {value}
      </p>
      {sub && <p className={`mt-1.5 text-xs ${textSub}`}>{sub}</p>}
    </div>
  );
}

type StatusBarProps = {
  label: string;
  count: number;
  total: number;
  color: string;
};

function StatusBar({ label, count, total, color }: StatusBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="font-display text-sm text-ink">{count} <span className="font-sans text-xs text-zinc-400">({pct}%)</span></span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const service = createServiceClient();

  // ── Parallel data fetching ────────────────────────────────────────────
  const [
    ordersResult,
    designsResult,
    topDesignsResult,
    likesResult,
  ] = await Promise.all([
    // All paid/fulfilled/shipped orders with earnings data
    service
      .from("orders")
      .select(
        "id, amount_total_cents, creator_earnings_cents, platform_fee_cents, quantity, created_at, design_id, creator_id, status"
      )
      .in("status", ["paid", "fulfillment_pending", "shipped"])
      .order("created_at", { ascending: true }),

    // Design status counts
    service
      .from("designs")
      .select("id, status, creator_id, title, product_type"),

    // Top designs by order count (join via orders)
    service
      .from("orders")
      .select("design_id, amount_total_cents")
      .in("status", ["paid", "fulfillment_pending", "shipped"]),

    // Like counts per design
    service
      .from("likes")
      .select("design_id"),
  ]);

  const orders = ordersResult.data ?? [];
  const allDesigns = designsResult.data ?? [];
  const allOrderItems = topDesignsResult.data ?? [];
  const allLikes = likesResult.data ?? [];

  // ── KPI aggregation ───────────────────────────────────────────────────

  let totalRevenueCents = 0;
  let totalPlatformCents = 0;
  let totalCreatorCents = 0;

  // revenue chart rows — one per order, bucketed by day on the client
  const chartRows: RevenueRow[] = [];

  for (const order of orders) {
    const rev = order.amount_total_cents ?? 0;
    totalRevenueCents += rev;

    // Prefer stored columns; fall back to calculateSplit logic inline
    let platformCents: number;
    let creatorCents: number;

    if (
      typeof order.platform_fee_cents === "number" &&
      typeof order.creator_earnings_cents === "number"
    ) {
      platformCents = order.platform_fee_cents;
      creatorCents = order.creator_earnings_cents;
    } else if (typeof order.creator_earnings_cents === "number") {
      creatorCents = order.creator_earnings_cents;
      platformCents =
        rev - PRINTFUL_PRODUCTION_COST_CENTS * (order.quantity ?? 1) - creatorCents;
    } else {
      const qty = order.quantity ?? 1;
      const profit = Math.max(0, rev - PRINTFUL_PRODUCTION_COST_CENTS * qty);
      creatorCents = Math.round(profit * CREATOR_SHARE);
      platformCents = profit - creatorCents;
    }

    totalCreatorCents += creatorCents;
    totalPlatformCents += platformCents;

    chartRows.push({
      date: order.created_at.slice(0, 10),
      revenue: rev / 100,
      platformFee: platformCents / 100,
      creatorEarnings: creatorCents / 100,
    });
  }

  const avgOrderCents =
    orders.length > 0 ? Math.round(totalRevenueCents / orders.length) : 0;

  // ── Design status breakdown ──────────────────────────────────────────
  const statusCounts = {
    published: 0,
    pending_review: 0,
    draft: 0,
    rejected: 0,
  } as Record<string, number>;

  for (const d of allDesigns) {
    const s = d.status ?? "draft";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }
  const totalDesigns = allDesigns.length;

  // ── Top designs by revenue ───────────────────────────────────────────
  const designRevMap = new Map<string, number>();
  for (const o of allOrderItems) {
    if (!o.design_id) continue;
    designRevMap.set(
      o.design_id,
      (designRevMap.get(o.design_id) ?? 0) + (o.amount_total_cents ?? 0)
    );
  }

  // Like count per design
  const likeMap = new Map<string, number>();
  for (const l of allLikes) {
    if (!l.design_id) continue;
    likeMap.set(l.design_id, (likeMap.get(l.design_id) ?? 0) + 1);
  }

  const topDesigns = [...designRevMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, rev]) => {
      const design = allDesigns.find((d) => d.id === id);
      return {
        id,
        title: design?.title ?? (design?.product_type ? `${design.product_type} Design` : "Design"),
        revenueCents: rev,
        likes: likeMap.get(id) ?? 0,
      };
    });

  // ── Top creators by earnings ─────────────────────────────────────────
  const creatorEarningsMap = new Map<string, number>();
  for (const order of orders) {
    if (!order.creator_id) continue;
    const ce =
      typeof order.creator_earnings_cents === "number"
        ? order.creator_earnings_cents
        : 0;
    creatorEarningsMap.set(
      order.creator_id,
      (creatorEarningsMap.get(order.creator_id) ?? 0) + ce
    );
  }

  // Fetch display names for top creator IDs
  const topCreatorIds = [...creatorEarningsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let creatorNames: Record<string, string> = {};
  if (topCreatorIds.length > 0) {
    const { data: profiles } = await service
      .from("public_profiles")
      .select("id, display_name")
      .in("id", topCreatorIds);
    creatorNames = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? "—"])
    );
  }

  const topCreators = topCreatorIds.map((id) => ({
    id,
    name: creatorNames[id] ?? id.slice(0, 8).toUpperCase(),
    earningsCents: creatorEarningsMap.get(id) ?? 0,
  }));

  // ── Pending count (for alert accent) ────────────────────────────────
  const pendingCount = statusCounts["pending_review"] ?? 0;

  return (
    <main className="flex flex-1 flex-col px-6 py-12 md:py-14 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-hand text-xl font-bold text-brand-blue">
              <DoodleSparkle className="h-4 w-4 text-brand-orange" />
              Admin
            </p>
            <h1 className="relative inline-block font-display text-3xl text-ink sm:text-4xl">
              Dashboard
              <DoodleStar className="absolute -right-7 -top-4 h-5 w-5 rotate-12 text-brand-yellow" />
            </h1>
          </div>
          {pendingCount > 0 && (
            <Link
              href="/admin/review"
              className="sticker inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2 text-sm font-extrabold text-white"
            >
              <DoodleBolt className="h-4 w-4" />
              {pendingCount} pending review →
            </Link>
          )}
        </div>

        {/* ── KPI grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
          <KpiCard
            label="Total revenue"
            value={euros(totalRevenueCents)}
            sub="paid + fulfilled + shipped"
            accent="orange"
            icon={<DoodleSquiggle className="h-3 w-8" />}
          />
          <KpiCard
            label="Platform profit"
            value={euros(totalPlatformCents)}
            sub={`${totalRevenueCents > 0 ? Math.round((totalPlatformCents / totalRevenueCents) * 100) : 0}% of revenue`}
            accent="blue"
          />
          <KpiCard
            label="Orders"
            value={orders.length}
            sub="paid / fulfilled / shipped"
          />
          <KpiCard
            label="Avg order value"
            value={euros(avgOrderCents)}
            sub="across all orders"
          />
        </div>

        {/* ── Charts ───────────────────────────────────────────────── */}
        <div className="mt-10">
          <AdminDashboardCharts rows={chartRows} />
        </div>

        {/* ── Bottom grid: design status + top tables ──────────────── */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">

          {/* Design status breakdown */}
          <div className="ink-card rounded-xl bg-paper p-6">
            <p className="font-hand text-base font-bold text-brand-blue">Catalogue</p>
            <h2 className="font-display text-xl text-ink">Designs by status</h2>
            <div className="mt-6 space-y-4">
              <StatusBar
                label="Published"
                count={statusCounts["published"] ?? 0}
                total={totalDesigns}
                color="bg-brand-green"
              />
              <StatusBar
                label="Pending review"
                count={statusCounts["pending_review"] ?? 0}
                total={totalDesigns}
                color="bg-brand-orange"
              />
              <StatusBar
                label="Draft"
                count={statusCounts["draft"] ?? 0}
                total={totalDesigns}
                color="bg-zinc-300 dark:bg-zinc-600"
              />
              {(statusCounts["rejected"] ?? 0) > 0 && (
                <StatusBar
                  label="Rejected"
                  count={statusCounts["rejected"] ?? 0}
                  total={totalDesigns}
                  color="bg-red-400"
                />
              )}
            </div>
            <p className="mt-5 text-center font-display text-2xl text-ink">
              {totalDesigns}
              <span className="ml-1 font-sans text-sm font-normal text-zinc-400">total</span>
            </p>
          </div>

          {/* Top designs */}
          <div className="ink-card rounded-xl bg-paper p-6">
            <p className="font-hand text-base font-bold text-brand-blue">Best sellers</p>
            <h2 className="mb-5 font-display text-xl text-ink">Top designs</h2>
            {topDesigns.length === 0 ? (
              <EmptyState label="No sales yet" />
            ) : (
              <ol className="space-y-3">
                {topDesigns.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-2 font-display text-xs text-zinc-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/marketplace/${d.id}`}
                        className="block truncate text-sm font-medium text-ink transition-colors hover:text-brand-blue"
                      >
                        {d.title}
                      </Link>
                      <p className="text-xs text-zinc-400">{d.likes} ♥</p>
                    </div>
                    <span className="shrink-0 font-display text-sm text-ink">
                      {euros(d.revenueCents)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Top creators */}
          <div className="ink-card rounded-xl bg-paper p-6">
            <p className="font-hand text-base font-bold text-brand-blue">Earnings</p>
            <h2 className="mb-5 font-display text-xl text-ink">Top creators</h2>
            {topCreators.length === 0 ? (
              <EmptyState label="No creator earnings yet" />
            ) : (
              <ol className="space-y-3">
                {topCreators.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-2 font-display text-xs text-zinc-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/creators/${c.id}`}
                        className="block truncate text-sm font-medium text-ink transition-colors hover:text-brand-blue"
                      >
                        {c.name}
                      </Link>
                    </div>
                    <span className="shrink-0 font-display text-sm text-ink">
                      {euros(c.earningsCents)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700">
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}
