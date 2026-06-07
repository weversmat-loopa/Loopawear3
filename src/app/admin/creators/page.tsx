import type { Metadata } from "next";
import { createServiceClient } from "@/utils/supabase/service";
import AdminCreatorsClient, { type AdminCreator } from "@/components/admin/AdminCreatorsClient";
import { DoodleSparkle, DoodleStar } from "@/components/ui/Doodles";

export const metadata: Metadata = {
  title: "Admin — Creators",
  robots: { index: false },
};

// Only these statuses represent a completed sale
const COMPLETED_STATUSES = ["paid", "fulfillment_pending", "shipped"];

export default async function AdminCreatorsPage() {
  // Auth guard is handled by src/app/admin/layout.tsx.
  const service = createServiceClient();

  // ── Parallel data fetch ─────────────────────────────────────────────────
  const [designsResult, ordersResult] = await Promise.all([
    service
      .from("designs")
      .select("creator_id, status, archived_at"),

    service
      .from("orders")
      .select("creator_id, creator_earnings_cents, quantity")
      .in("status", COMPLETED_STATUSES),
  ]);

  const allDesigns = designsResult.data ?? [];
  const allOrders = ordersResult.data ?? [];

  // ── Aggregate per creator ────────────────────────────────────────────────

  // Collect all creator IDs that have at least one design
  const creatorIdSet = new Set<string>(
    allDesigns.map((d) => d.creator_id).filter((id): id is string => Boolean(id))
  );
  // Also include creators that have orders but no designs (edge case)
  for (const o of allOrders) {
    if (o.creator_id) creatorIdSet.add(o.creator_id);
  }

  const creatorIds = [...creatorIdSet];

  if (creatorIds.length === 0) {
    return (
      <main className="flex flex-1 flex-col px-6 py-12 md:py-14 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">
          <Header count={0} />
          <AdminCreatorsClient creators={[]} />
        </div>
      </main>
    );
  }

  // ── Fetch profiles for all creator IDs ──────────────────────────────────
  const { data: profilesRaw } = await service
    .from("profiles")
    .select("id, display_name, avatar_url, created_at")
    .in("id", creatorIds);

  const profileMap = new Map(
    (profilesRaw ?? []).map((p) => [p.id, p])
  );

  // ── Design aggregation ───────────────────────────────────────────────────
  type DesignCounts = {
    total: number;
    published: number;
    archived: number;
    draft: number;
  };

  const designCounts = new Map<string, DesignCounts>();

  for (const d of allDesigns) {
    if (!d.creator_id) continue;
    const c = designCounts.get(d.creator_id) ?? { total: 0, published: 0, archived: 0, draft: 0 };
    c.total += 1;
    if (d.archived_at !== null) {
      c.archived += 1;
    } else if (d.status === "published") {
      c.published += 1;
    } else {
      c.draft += 1;
    }
    designCounts.set(d.creator_id, c);
  }

  // ── Order aggregation (completed sales only) ─────────────────────────────
  type SalesStats = { earnings_cents: number; items_sold: number };

  const salesStats = new Map<string, SalesStats>();

  for (const o of allOrders) {
    if (!o.creator_id) continue;
    const s = salesStats.get(o.creator_id) ?? { earnings_cents: 0, items_sold: 0 };
    s.earnings_cents += o.creator_earnings_cents ?? 0;
    s.items_sold += o.quantity ?? 1;
    salesStats.set(o.creator_id, s);
  }

  // ── Merge into AdminCreator[] ────────────────────────────────────────────
  const creators: AdminCreator[] = creatorIds.map((id) => {
    const profile = profileMap.get(id);
    const dc = designCounts.get(id) ?? { total: 0, published: 0, archived: 0, draft: 0 };
    const ss = salesStats.get(id) ?? { earnings_cents: 0, items_sold: 0 };
    return {
      id,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      joined_at: profile?.created_at ?? new Date(0).toISOString(),
      designs_total: dc.total,
      designs_published: dc.published,
      designs_archived: dc.archived,
      designs_draft: dc.draft,
      earnings_cents: ss.earnings_cents,
      items_sold: ss.items_sold,
    };
  });

  return (
    <main className="flex flex-1 flex-col px-6 py-12 md:py-14 lg:px-12">
      <div className="mx-auto w-full max-w-5xl">
        <Header count={creators.length} />
        <AdminCreatorsClient creators={creators} />
      </div>
    </main>
  );
}

// ── Header sub-component ────────────────────────────────────────────────────

function Header({ count }: { count: number }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 font-hand text-xl font-bold text-brand-blue">
          <DoodleSparkle className="h-4 w-4 text-brand-orange" />
          Admin
        </p>
        <h1 className="relative inline-block font-display text-3xl text-ink sm:text-4xl">
          Creators
          <DoodleStar className="absolute -right-7 -top-4 h-5 w-5 rotate-12 text-brand-yellow" />
        </h1>
      </div>
      {count > 0 && (
        <span className="ink-card rounded-full bg-paper px-4 py-1.5 font-display text-xl text-ink">
          {count}
          <span className="ml-1.5 font-sans text-sm font-normal text-zinc-400">total</span>
        </span>
      )}
    </div>
  );
}
