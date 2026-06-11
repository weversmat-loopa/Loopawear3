import type { Metadata } from "next";
import { createServiceClient } from "@/utils/supabase/service";
import AdminCreatorsClient, { type AdminCreator } from "@/components/admin/AdminCreatorsClient";
import { DoodleSparkle, DoodleStar } from "@/components/ui/Doodles";
import { calculateSplit } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Admin — Creators",
  robots: { index: false },
};

// Only these statuses count as completed sales
const SALE_STATUSES = ["paid", "fulfillment_pending", "shipped"];

export default async function AdminCreatorsPage() {
  // Auth guard is handled by src/app/admin/layout.tsx.
  const service = createServiceClient();

  // ── Parallel data fetch ──────────────────────────────────────────────────
  const [designsResult, ordersResult] = await Promise.all([
    service
      .from("designs")
      .select("id, creator_id, status, archived_at, title, image_url, price_cents"),

    service
      .from("orders")
      .select("id, creator_id, design_id, creator_earnings_cents, platform_fee_cents, amount_total_cents, quantity")
      .in("status", SALE_STATUSES),
  ]);

  const allDesigns = designsResult.data ?? [];
  const allOrders = ordersResult.data ?? [];

  // ── Collect all creator IDs ──────────────────────────────────────────────
  const creatorIdSet = new Set<string>();
  for (const d of allDesigns) {
    if (d.creator_id) creatorIdSet.add(d.creator_id);
  }
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

  // ── Fetch profiles (public_profiles view: no created_at) ─────────────────
  const { data: profilesRaw } = await service
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .in("id", creatorIds);

  const profileMap = new Map(
    (profilesRaw ?? []).map((p) => [p.id, p])
  );

  // ── Design aggregation per creator ───────────────────────────────────────
  type DesignCounts = {
    total: number;
    published: number;
    pending: number;
    draft: number;
    archived: number;
  };

  const designCounts = new Map<string, DesignCounts>();
  // Also track per-design revenue for top designs
  const designRevMap = new Map<string, { title: string | null; image_url: string | null; earnings_cents: number; order_count: number }>();

  for (const d of allDesigns) {
    if (!d.creator_id) continue;
    const c = designCounts.get(d.creator_id) ?? { total: 0, published: 0, pending: 0, draft: 0, archived: 0 };
    c.total += 1;
    if (d.archived_at !== null) {
      c.archived += 1;
    } else if (d.status === "published") {
      c.published += 1;
    } else if (d.status === "pending_review") {
      c.pending += 1;
    } else {
      c.draft += 1;
    }
    designCounts.set(d.creator_id, c);

    // Seed the design rev map entry so we can match orders later
    if (!designRevMap.has(d.id)) {
      designRevMap.set(d.id, {
        title: d.title,
        image_url: d.image_url,
        earnings_cents: 0,
        order_count: 0,
      });
    }
  }

  // ── Order aggregation per creator and per design ─────────────────────────
  type SalesStats = {
    earnings_cents: number;
    order_count: number;
    items_sold: number;
  };

  const salesStats = new Map<string, SalesStats>();

  // Map design_id → creator_id for lookup
  const designCreatorMap = new Map<string, string>(
    allDesigns
      .filter((d): d is typeof d & { creator_id: string } => Boolean(d.creator_id))
      .map((d) => [d.id, d.creator_id])
  );

  for (const o of allOrders) {
    if (!o.creator_id) continue;

    // Determine earnings — prefer stored column, fall back to calculateSplit
    let earningsCents: number;
    if (typeof o.creator_earnings_cents === "number") {
      earningsCents = o.creator_earnings_cents;
    } else {
      earningsCents = calculateSplit(o.amount_total_cents, o.quantity ?? 1).creator_earnings_cents;
    }

    const s = salesStats.get(o.creator_id) ?? { earnings_cents: 0, order_count: 0, items_sold: 0 };
    s.earnings_cents += earningsCents;
    s.order_count += 1;
    s.items_sold += o.quantity ?? 1;
    salesStats.set(o.creator_id, s);

    // Per-design revenue
    if (o.design_id) {
      const dr = designRevMap.get(o.design_id) ?? { title: null, image_url: null, earnings_cents: 0, order_count: 0 };
      dr.earnings_cents += earningsCents;
      dr.order_count += 1;
      designRevMap.set(o.design_id, dr);
    }
  }

  // ── Top designs per creator (max 3) ──────────────────────────────────────
  // Group design IDs by creator
  const creatorDesignIds = new Map<string, string[]>();
  for (const d of allDesigns) {
    if (!d.creator_id) continue;
    const arr = creatorDesignIds.get(d.creator_id) ?? [];
    arr.push(d.id);
    creatorDesignIds.set(d.creator_id, arr);
  }

  // ── Merge into AdminCreator[] ────────────────────────────────────────────
  const creators: AdminCreator[] = creatorIds.map((id) => {
    const profile = profileMap.get(id);
    const dc = designCounts.get(id) ?? { total: 0, published: 0, pending: 0, draft: 0, archived: 0 };
    const ss = salesStats.get(id) ?? { earnings_cents: 0, order_count: 0, items_sold: 0 };

    const avgPerOrderCents = ss.order_count > 0
      ? Math.round(ss.earnings_cents / ss.order_count)
      : 0;

    // Top 3 designs by earnings for this creator
    const topDesigns = (creatorDesignIds.get(id) ?? [])
      .map((did) => ({ id: did, ...designRevMap.get(did)! }))
      .filter((d) => d.earnings_cents > 0)
      .sort((a, b) => b.earnings_cents - a.earnings_cents)
      .slice(0, 3)
      .map((d) => ({
        id: d.id,
        title: d.title,
        image_url: d.image_url,
        earnings_cents: d.earnings_cents,
        order_count: d.order_count,
      }));

    return {
      id,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      designs_total: dc.total,
      designs_published: dc.published,
      designs_pending: dc.pending,
      designs_draft: dc.draft,
      designs_archived: dc.archived,
      earnings_cents: ss.earnings_cents,
      order_count: ss.order_count,
      items_sold: ss.items_sold,
      avg_per_order_cents: avgPerOrderCents,
      top_designs: topDesigns,
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
