import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/utils/supabase/service";
import { getSiteUrl, getUserEmail, sendEmail } from "@/lib/email/send";
import {
  newSaleEmail,
  orderConfirmationEmail,
} from "@/lib/email/templates";

type ServiceClient = ReturnType<typeof createServiceClient>;

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

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(
        supabase,
        event.data.object as Stripe.Checkout.Session
      );
    case "charge.refunded":
      return handleChargeRefunded(
        supabase,
        event.data.object as Stripe.Charge
      );
    case "charge.dispute.created":
      return handleDisputeCreated(
        supabase,
        event.data.object as Stripe.Dispute
      );
    case "charge.dispute.closed":
      return handleDisputeClosed(
        supabase,
        event.data.object as Stripe.Dispute
      );
    default:
      return NextResponse.json({ received: true });
  }
}

// ---------- Event handlers ----------

async function handleCheckoutCompleted(
  supabase: ServiceClient,
  session: Stripe.Checkout.Session
): Promise<NextResponse> {
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  // Idempotency — Stripe can deliver the same event more than once
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  // Metadata is the contract set at checkout session creation time.
  // buyer_id is intentionally optional — guest checkouts arrive with
  // an empty buyer_id and produce orders with buyer_id = null.
  const meta = session.metadata ?? {};
  const { design_id, buyer_id, creator_id, size, quantity, unit_price_cents } = meta;

  if (!design_id || !size || !quantity || !unit_price_cents) {
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

  // Select the inserted row so we have its id (used in the order URL
  // sent to the buyer) and the canonical size/quantity/totals.
  const { data: insertedOrder, error } = await supabase
    .from("orders")
    .insert({
      buyer_id: buyer_id || null,
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
    })
    .select(
      "id, size, quantity, amount_total_cents, creator_earnings_cents"
    )
    .single();

  if (error || !insertedOrder) {
    // Include enough context to distinguish guest-checkout failures
    // (where buyer_id is empty) from auth-checkout failures.
    console.error("[stripe-webhook] Failed to insert order:", {
      sessionId: session.id,
      isGuest: !buyer_id,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    // Return 500 so Stripe retries delivery
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }

  // Notifications — fired after the order is durably persisted. Failures
  // in send/lookup are swallowed inside sendEmail/getUserEmail so a
  // Resend outage can't cause Stripe to retry the webhook.
  const { data: designInfo } = await supabase
    .from("designs")
    .select("title, product_type")
    .eq("id", design_id)
    .maybeSingle();

  const designTitle =
    designInfo?.title ??
    (designInfo?.product_type
      ? `${designInfo.product_type} Design`
      : "Design");

  const siteUrl = getSiteUrl();
  const buyerEmail =
    session.customer_details?.email ?? session.customer_email ?? null;

  const emailTasks: Promise<unknown>[] = [];

  if (creator_id) {
    emailTasks.push(
      (async () => {
        const creatorEmail = await getUserEmail(creator_id);
        if (!creatorEmail) return;
        await sendEmail({
          to: creatorEmail,
          ...newSaleEmail({
            designTitle,
            size: insertedOrder.size,
            quantity: insertedOrder.quantity,
            earningsCents: insertedOrder.creator_earnings_cents,
            dashboardUrl: `${siteUrl}/account/creator`,
          }),
        });
      })()
    );
  }

  if (buyerEmail) {
    // Guest buyers (buyer_id empty) have no /account/orders page to
    // link to, so we omit the order URL for them — Stripe's automatic
    // receipt is still sent separately.
    const orderUrl = buyer_id
      ? `${siteUrl}/account/orders/${insertedOrder.id}`
      : null;
    emailTasks.push(
      sendEmail({
        to: buyerEmail,
        ...orderConfirmationEmail({
          designTitle,
          size: insertedOrder.size,
          quantity: insertedOrder.quantity,
          totalCents: insertedOrder.amount_total_cents,
          orderId: insertedOrder.id,
          orderUrl,
        }),
      })
    );
  }

  await Promise.all(emailTasks);

  return NextResponse.json({ received: true });
}

async function handleChargeRefunded(
  supabase: ServiceClient,
  charge: Stripe.Charge
): Promise<NextResponse> {
  const paymentIntentId = extractPaymentIntentId(charge.payment_intent);
  if (!paymentIntentId) {
    console.warn(
      "[stripe-webhook] charge.refunded missing payment_intent:",
      charge.id
    );
    return NextResponse.json({ received: true });
  }

  // Mark refunded unconditionally — this covers both full and partial
  // refunds. If you start supporting partial refunds with a different
  // semantic, branch on charge.refunded vs amount_refunded < amount.
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .select("id");

  if (error) {
    console.error("[stripe-webhook] Failed to mark order refunded:", {
      paymentIntentId,
      message: error.message,
      code: error.code,
    });
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    console.warn(
      "[stripe-webhook] charge.refunded: no order found for payment_intent",
      paymentIntentId
    );
  }

  return NextResponse.json({ received: true });
}

async function handleDisputeCreated(
  supabase: ServiceClient,
  dispute: Stripe.Dispute
): Promise<NextResponse> {
  const paymentIntentId = extractPaymentIntentId(dispute.payment_intent);
  if (!paymentIntentId) {
    console.warn(
      "[stripe-webhook] charge.dispute.created missing payment_intent:",
      dispute.id
    );
    return NextResponse.json({ received: true });
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "disputed" })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .select("id");

  if (error) {
    console.error("[stripe-webhook] Failed to mark order disputed:", {
      paymentIntentId,
      message: error.message,
      code: error.code,
    });
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    console.warn(
      "[stripe-webhook] charge.dispute.created: no order found for payment_intent",
      paymentIntentId
    );
  }

  return NextResponse.json({ received: true });
}

async function handleDisputeClosed(
  supabase: ServiceClient,
  dispute: Stripe.Dispute
): Promise<NextResponse> {
  const paymentIntentId = extractPaymentIntentId(dispute.payment_intent);
  if (!paymentIntentId) {
    console.warn(
      "[stripe-webhook] charge.dispute.closed missing payment_intent:",
      dispute.id
    );
    return NextResponse.json({ received: true });
  }

  if (dispute.status === "won") {
    // Only revert to 'paid' if the order is still in 'disputed'. If an
    // admin manually changed status during the dispute (e.g. marked
    // shipped), respect their state — they know more than we do.
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("status", "disputed")
      .select("id");

    if (error) {
      console.error("[stripe-webhook] Failed to revert order to paid:", {
        paymentIntentId,
        message: error.message,
      });
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }
    if (!data || data.length === 0) {
      console.info(
        "[stripe-webhook] dispute.closed (won): no order in 'disputed' status for payment_intent",
        paymentIntentId
      );
    }
    return NextResponse.json({ received: true });
  }

  if (dispute.status === "lost") {
    // Funds were returned to the customer — force refunded regardless
    // of the order's current status. Money is gone, status must reflect.
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "refunded" })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .select("id");

    if (error) {
      console.error("[stripe-webhook] Failed to mark order refunded after lost dispute:", {
        paymentIntentId,
        message: error.message,
      });
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }
    if (!data || data.length === 0) {
      console.warn(
        "[stripe-webhook] dispute.closed (lost): no order found for payment_intent",
        paymentIntentId
      );
    }
    return NextResponse.json({ received: true });
  }

  // Other terminal statuses (warning_closed, etc.) have no financial
  // impact on us — acknowledge but do nothing.
  console.info(
    "[stripe-webhook] dispute.closed with non-win/lost status, skipping:",
    { paymentIntentId, status: dispute.status }
  );
  return NextResponse.json({ received: true });
}

// ---------- Helpers ----------

/**
 * Stripe's `payment_intent` field on Charge/Dispute objects is either
 * the id string (typical for webhook payloads) or an expanded
 * PaymentIntent object. Normalise to the id, or null if absent.
 */
function extractPaymentIntentId(
  value: string | Stripe.PaymentIntent | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
