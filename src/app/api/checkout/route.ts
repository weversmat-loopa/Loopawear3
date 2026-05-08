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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

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

  const { data: design } = await supabase
    .from("designs")
    .select("id, title, product_type, image_url, price_cents, creator_id")
    .eq("id", design_id)
    .eq("status", "published")
    .maybeSingle();

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

  const session = await stripe.checkout.sessions.create({
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
    // Show a "I agree to the Terms of Service" checkbox in Checkout.
    // The link target is the Terms of Service URL configured in
    // Stripe Dashboard → Settings → Public Details. That must be set
    // to https://<your-domain>/terms for this to render.
    consent_collection: { terms_of_service: "required" },
    metadata: {
      design_id: design.id,
      buyer_id: user.id,
      creator_id: design.creator_id ?? "",
      size,
      quantity: String(qty),
      unit_price_cents: String(design.price_cents),
    },
    customer_email: user.email ?? undefined,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/marketplace/${design.id}`,
  });

  return NextResponse.json({ url: session.url });
}
