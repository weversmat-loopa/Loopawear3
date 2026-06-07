import type { Metadata } from "next";
import { createServiceClient } from "@/utils/supabase/service";
import AdminOrdersClient, { type AdminOrder } from "@/components/admin/AdminOrdersClient";
import {
  DoodleSparkle,
  DoodleStar,
} from "@/components/ui/Doodles";

export const metadata: Metadata = {
  title: "Admin — Orders",
  robots: { index: false },
};

type AdminOrdersPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  // Auth guard is handled by src/app/admin/layout.tsx.
  const service = createServiceClient();

  // ── Fetch orders ────────────────────────────────────────────────────────
  const { data: ordersRaw } = await service
    .from("orders")
    .select(
      "id, design_id, creator_id, size, quantity, amount_total_cents, creator_earnings_cents, platform_fee_cents, status, tracking_number, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rawOrders = ordersRaw ?? [];

  // ── Collect unique design / creator IDs ─────────────────────────────────
  const designIds = [...new Set(rawOrders.map((o) => o.design_id).filter((id): id is string => Boolean(id)))];
  const creatorIds = [...new Set(rawOrders.map((o) => o.creator_id).filter((id): id is string => Boolean(id)))];

  // ── Parallel lookup of designs + creator names ───────────────────────────
  const [designsResult, profilesResult] = await Promise.all([
    designIds.length > 0
      ? service
          .from("designs")
          .select("id, title, product_type, mockup_url, image_url")
          .in("id", designIds)
      : Promise.resolve({ data: [] }),

    creatorIds.length > 0
      ? service
          .from("public_profiles")
          .select("id, display_name")
          .in("id", creatorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const designMap = new Map(
    (designsResult.data ?? []).map((d) => [
      d.id,
      {
        title: (d.title ?? (d.product_type ? `${d.product_type} Design` : null)) as string | null,
        mockup_url: d.mockup_url as string | null,
        image_url: d.image_url as string | null,
      },
    ])
  );

  const creatorMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p.display_name as string | null])
  );

  // ── Merge into AdminOrder shape ──────────────────────────────────────────
  const orders: AdminOrder[] = rawOrders.map((o) => {
    const design = o.design_id ? designMap.get(o.design_id) : undefined;
    return {
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      amount_total_cents: o.amount_total_cents,
      creator_earnings_cents: o.creator_earnings_cents ?? null,
      platform_fee_cents: o.platform_fee_cents ?? null,
      design_id: o.design_id ?? null,
      creator_id: o.creator_id ?? null,
      size: o.size ?? null,
      quantity: o.quantity ?? null,
      tracking_number: o.tracking_number ?? null,
      shipping_name: o.shipping_name ?? null,
      shipping_line1: o.shipping_line1 ?? null,
      shipping_line2: o.shipping_line2 ?? null,
      shipping_city: o.shipping_city ?? null,
      shipping_state: o.shipping_state ?? null,
      shipping_postal_code: o.shipping_postal_code ?? null,
      shipping_country: o.shipping_country ?? null,
      design_title: design?.title ?? null,
      design_mockup_url: design?.mockup_url ?? null,
      design_image_url: design?.image_url ?? null,
      creator_name: o.creator_id ? (creatorMap.get(o.creator_id) ?? null) : null,
    };
  });

  const params = await searchParams;
  const error = params?.error;
  const success = params?.success;

  return (
    <main className="flex flex-1 flex-col px-6 py-12 md:py-14 lg:px-12">
      <div className="mx-auto w-full max-w-5xl">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-hand text-xl font-bold text-brand-blue">
              <DoodleSparkle className="h-4 w-4 text-brand-orange" />
              Admin
            </p>
            <h1 className="relative inline-block font-display text-3xl text-ink sm:text-4xl">
              Orders
              <DoodleStar className="absolute -right-7 -top-4 h-5 w-5 rotate-12 text-brand-yellow" />
            </h1>
          </div>
          {orders.length > 0 && (
            <span className="ink-card rounded-full bg-paper px-4 py-1.5 font-display text-xl text-ink">
              {orders.length}
              <span className="ml-1.5 font-sans text-sm font-normal text-zinc-400">total</span>
            </span>
          )}
        </div>

        {/* ── Client component (filtering, sorting, expand) ────────── */}
        <AdminOrdersClient orders={orders} error={error} success={success} />

      </div>
    </main>
  );
}
