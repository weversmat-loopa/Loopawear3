import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

// Black M = 4017, White M = 4012 (Bella+Canvas 3001)
function getCatalogVariantId(placement: unknown): number {
  if (
    placement !== null &&
    typeof placement === "object" &&
    "shirtColor" in (placement as Record<string, unknown>) &&
    (placement as Record<string, unknown>).shirtColor === "white"
  ) {
    return 4012;
  }
  return 4017;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth: verify caller is admin ──────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 401 });
  }

  const { id: orderId } = await params;
  const service = createServiceClient();

  // ── Fetch order ───────────────────────────────────────────────────────────
  const { data: order, error: orderError } = await service
    .from("orders")
    .select(
      "id, status, design_id, size, quantity, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { ok: false, error: `Order status is '${order.status}', expected 'paid'` },
      { status: 400 }
    );
  }

  // ── Fetch design ──────────────────────────────────────────────────────────
  const { data: design, error: designError } = await service
    .from("designs")
    .select("id, image_url, placement")
    .eq("id", order.design_id)
    .maybeSingle();

  if (designError || !design) {
    return NextResponse.json({ ok: false, error: "Design not found" }, { status: 404 });
  }

  const catalogVariantId = getCatalogVariantId(design.placement);

  // ── Build Printful payload ────────────────────────────────────────────────
  const printfulPayload = {
    recipient: {
      name: order.shipping_name,
      address1: order.shipping_line1,
      address2: order.shipping_line2 ?? undefined,
      city: order.shipping_city,
      state_code: order.shipping_state,
      zip: order.shipping_postal_code,
      country_code: order.shipping_country,
    },
    items: [
      {
        catalog_variant_id: catalogVariantId,
        quantity: order.quantity ?? 1,
        files: [{ type: "default", url: design.image_url }],
      },
    ],
  };

  // ── Submit to Printful ────────────────────────────────────────────────────
  const pfRes = await fetch("https://api.printful.com/v2/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID!,
    },
    body: JSON.stringify(printfulPayload),
  });

  if (!pfRes.ok) {
    const pfBody = await pfRes.text().catch(() => "(no body)");
    return NextResponse.json(
      { ok: false, error: `Printful error ${pfRes.status}: ${pfBody}` },
      { status: 502 }
    );
  }

  const pfData = await pfRes.json();
  const printfulOrderId: number = pfData?.data?.id ?? pfData?.id;

  // ── Update order in DB ────────────────────────────────────────────────────
  const { error: updateError } = await service
    .from("orders")
    .update({ status: "fulfillment_pending", printful_order_id: printfulOrderId })
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: "Printful order created but DB update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, printful_order_id: printfulOrderId });
}
