import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

type AllowedCountry = NonNullable<
  Stripe.Checkout.Session["shipping_address_collection"]
>["allowed_countries"][number];

const EU27: AllowedCountry[] = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
  "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK",
];

const VALID_SIZES = new Set(["S", "M", "L", "XL", "XXL"]);

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
  }

  const supabase = await createClient();
  // user is optional here — guest checkout is supported. When the user
  // is signed in we still want to associate the order with their
  // account; otherwise the order is created with buyer_id = null.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { design_id, size, quantity } = body;

  if (typeof design_id !== "string" || !design_id) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (typeof size !== "string" || !VALID_SIZES.has(size)) {
    return NextResponse.json({ error: "invalid_size" }, { status: 400 });
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
    return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
  }

  const { data: design, error: designError } = await supabase
    .from("designs")
    .select("id, title, product_type, image_url, price_cents, creator_id")
    .eq("id", design_id)
    .eq("status", "published")
    .maybeSingle();

  if (designError) {
    console.error("[checkout] Design lookup error:", {
      isGuest: !user,
      designId: design_id,
      message: designError.message,
      code: designError.code,
    });
    return NextResponse.json({ error: "design_not_found" }, { status: 404 });
  }

  if (!design) {
    return NextResponse.json({ error: "design_not_found" }, { status: 404 });
  }
  if (!design.price_cents) {
    return NextResponse.json({ error: "design_not_priced" }, { status: 422 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });

  const productName =
    design.title ??
    (design.product_type ? `${design.product_type} Design` : "Design");

  const origin = req.nextUrl.origin;

  // Build the session params with customer_email omitted entirely for
  // guests — explicit omission rather than relying on the SDK to strip
  // undefined removes a class of "did Stripe see undefined as a string"
  // questions when debugging guest-only failures.
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: design.price_cents,
          product_data: {
            name: productName,
            ...(design.image_url ? { images: [design.image_url] } : {}),
          },
        },
        quantity: qty,
      },
    ],
    shipping_address_collection: { allowed_countries: EU27 },
    // TODO before going live: re-enable the Terms-of-Service consent
    // checkbox. Requires setting Stripe Dashboard → Settings → Public
    // Details → Terms of Service URL to https://<your-domain>/terms,
    // then adding back:
    //   consent_collection: { terms_of_service: "required" },
    // Without that URL set, including consent_collection makes
    // sessions.create() throw and breaks all checkouts.
    metadata: {
      design_id: design.id,
      buyer_id: user?.id ?? "",
      creator_id: design.creator_id ?? "",
      size,
      quantity: String(qty),
      unit_price_cents: String(design.price_cents),
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/marketplace/${design.id}`,
  };

  // Pre-fill email only when signed in. For guests, Stripe Checkout
  // collects it during the session.
  if (user?.email) {
    sessionParams.customer_email = user.email;
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err) {
    // Surface the actual Stripe error in logs — this is the most
    // common failure point and was previously falling through to a
    // generic 500 with no diagnostic information.
    const isStripeErr = err instanceof Stripe.errors.StripeError;
    console.error("[checkout] Stripe session creation failed:", {
      isGuest: !user,
      hasEmail: !!user?.email,
      designId: design.id,
      qty,
      size,
      type: isStripeErr ? err.type : "unknown",
      code: isStripeErr ? err.code : undefined,
      param: isStripeErr ? err.param : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "stripe_error" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
