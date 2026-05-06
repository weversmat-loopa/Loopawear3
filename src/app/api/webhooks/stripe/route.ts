import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/utils/supabase/service";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe-webhook] Missing Stripe configuration");
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[stripe-webhook] Missing SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  // Idempotency — Stripe can deliver the same event more than once
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  // Metadata is the contract set at checkout session creation time
  const meta = session.metadata ?? {};
  const { design_id, buyer_id, creator_id, size, quantity, unit_price_cents } = meta;

  if (!design_id || !buyer_id || !size || !quantity || !unit_price_cents) {
    console.error("[stripe-webhook] Incomplete metadata for session", session.id, meta);
    return NextResponse.json({ received: true });
  }

  // Shipping details are required — do not insert without them
  // In Stripe API 2026-04-22.dahlia, shipping is nested under collected_information
  const shipping = session.collected_information?.shipping_details;
  const addr = shipping?.address;

  if (
    !shipping?.name ||
    !addr?.line1 ||
    !addr?.city ||
    !addr?.postal_code ||
    !addr?.country
  ) {
    console.error("[stripe-webhook] Missing shipping details for session", session.id);
    return NextResponse.json({ received: true });
  }

  const amount_total_cents = session.amount_total ?? 0;
  const platform_fee_cents = Math.round(amount_total_cents * 0.15);
  const creator_earnings_cents = amount_total_cents - platform_fee_cents;

  const { error } = await supabase.from("orders").insert({
    buyer_id,
    design_id,
    creator_id: creator_id || null,
    quantity: parseInt(quantity, 10),
    size,
    unit_price_cents: parseInt(unit_price_cents, 10),
    amount_total_cents,
    currency: session.currency ?? "eur",
    platform_fee_cents,
    creator_earnings_cents,
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
    shipping_name: shipping.name,
    shipping_line1: addr.line1,
    shipping_line2: addr.line2 ?? null,
    shipping_city: addr.city,
    shipping_state: addr.state ?? null,
    shipping_postal_code: addr.postal_code,
    shipping_country: addr.country,
    status: "paid",
  });

  if (error) {
    console.error("[stripe-webhook] Failed to insert order:", error);
    // Return 500 so Stripe retries delivery
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
