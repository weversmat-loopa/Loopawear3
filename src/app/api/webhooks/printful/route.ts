import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

/**
 * Printful fulfillment webhook.
 *
 * Listens for `package.shipped` and writes the carrier/tracking details onto
 * the matching order (matched via `printful_order_id`, set when the order was
 * submitted to Printful in the admin fulfill route).
 *
 * Auth: Printful's webhooks do not carry an HMAC signature, so we gate the
 * endpoint with a shared secret. Configure the webhook URL in Printful and set
 * `PRINTFUL_WEBHOOK_SECRET`; Printful must send it in the `X-Webhook-Secret`
 * header (configurable as a custom header on the webhook, or via a proxy).
 */

type PrintfulShippedPayload = {
  type?: string;
  // v1 shape: { type, data: { order: {...}, shipment: {...} } }
  // v2 shape is similar; we read defensively from both.
  data?: {
    order?: { id?: number | string } | null;
    shipment?: {
      tracking_number?: string | null;
      tracking_url?: string | null;
      carrier?: string | null;
      service?: string | null;
      shipped_at?: number | string | null;
    } | null;
  } | null;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(req: NextRequest) {
  const secret = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[printful-webhook] Missing PRINTFUL_WEBHOOK_SECRET");
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[printful-webhook] Missing SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
  }

  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: PrintfulShippedPayload;
  try {
    payload = (await req.json()) as PrintfulShippedPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Only act on shipment events; acknowledge everything else so Printful
  // doesn't retry events we intentionally ignore.
  if (payload.type !== "package_shipped" && payload.type !== "package.shipped") {
    return NextResponse.json({ received: true });
  }

  const printfulOrderId = payload.data?.order?.id;
  const shipment = payload.data?.shipment;

  if (printfulOrderId === undefined || printfulOrderId === null) {
    console.warn("[printful-webhook] package.shipped without order id");
    return NextResponse.json({ received: true });
  }

  // printful_order_id is stored as bigint — normalise to a number for matching.
  const orderIdNumber =
    typeof printfulOrderId === "string"
      ? Number.parseInt(printfulOrderId, 10)
      : printfulOrderId;

  if (!Number.isFinite(orderIdNumber)) {
    console.warn(
      "[printful-webhook] package.shipped with non-numeric order id:",
      printfulOrderId
    );
    return NextResponse.json({ received: true });
  }

  // Printful sends shipped_at as a unix timestamp (seconds) in v1; fall back to
  // now() if it's missing or unparseable.
  const shippedAt = parseShippedAt(shipment?.shipped_at);

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "shipped",
      tracking_number: shipment?.tracking_number ?? null,
      tracking_url: shipment?.tracking_url ?? null,
      carrier: shipment?.carrier ?? shipment?.service ?? null,
      shipped_at: shippedAt,
    })
    .eq("printful_order_id", orderIdNumber)
    .select("id");

  if (error) {
    console.error("[printful-webhook] Failed to update order:", {
      printfulOrderId: orderIdNumber,
      message: error.message,
      code: error.code,
    });
    // 500 so Printful retries delivery.
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // No matching order — acknowledge so Printful stops retrying. This can
    // happen for test events or orders created outside this app.
    console.warn(
      "[printful-webhook] No order found for printful_order_id",
      orderIdNumber
    );
  }

  return NextResponse.json({ received: true });
}

function parseShippedAt(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return new Date().toISOString();
  }
  const num = typeof value === "string" ? Number.parseInt(value, 10) : value;
  if (Number.isFinite(num)) {
    // Printful timestamps are in seconds.
    return new Date(num * 1000).toISOString();
  }
  return new Date().toISOString();
}
