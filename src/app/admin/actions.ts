"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getSiteUrl, getUserEmail, sendEmail, sendOrderShippedEmail } from "@/lib/email/send";
import {
  designApprovedEmail,
  designRejectedEmail,
} from "@/lib/email/templates";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  // Use the service-role client for the actual mutations. The user
  // client above is only for verifying the caller is an admin. Order
  // rows belonging to guests (buyer_id = null) are not visible/updatable
  // under the RLS policies bound to the user client, so admin actions on
  // guest orders would silently match zero rows and surface as
  // "Could not update order." The admin identity is already verified, so
  // bypassing RLS here is safe.
  const service = createServiceClient();

  return { supabase, service };
}

export async function approveDesign(formData: FormData) {
  const { supabase } = await requireAdmin();

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(`/admin/review?error=${encodeURIComponent("Invalid design.")}`);
  }

  // Select enough columns to compose the notification email without a
  // second round trip. title and product_type drive the display name;
  // creator_id is the recipient.
  const { data, error } = await supabase
    .from("designs")
    .update({ status: "published" })
    .eq("id", designId)
    .eq("status", "pending_review")
    .select("id, title, product_type, creator_id");

  if (error || !data || data.length === 0) {
    redirect(
      `/admin/review?error=${encodeURIComponent("Could not approve design. Please try again.")}`
    );
  }

  // Notify the creator. Awaited before redirect so the email is
  // actually sent before the serverless function returns. sendEmail
  // swallows its own errors, so this can't fail the admin action.
  const updated = data[0];
  if (updated.creator_id) {
    const email = await getUserEmail(updated.creator_id);
    if (email) {
      const designTitle =
        updated.title ??
        (updated.product_type
          ? `${updated.product_type} Design`
          : "Design");
      await sendEmail({
        to: email,
        ...designApprovedEmail({
          designTitle,
          designUrl: `${getSiteUrl()}/marketplace/${updated.id}`,
        }),
      });
    }
  }

  redirect("/admin/review");
}

export async function rejectDesign(formData: FormData) {
  const { supabase } = await requireAdmin();

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(`/admin/review?error=${encodeURIComponent("Invalid design.")}`);
  }

  const { data, error } = await supabase
    .from("designs")
    .update({ status: "draft" })
    .eq("id", designId)
    .eq("status", "pending_review")
    .select("id, title, product_type, creator_id");

  if (error || !data || data.length === 0) {
    redirect(
      `/admin/review?error=${encodeURIComponent("Could not reject design. Please try again.")}`
    );
  }

  const updated = data[0];
  if (updated.creator_id) {
    const email = await getUserEmail(updated.creator_id);
    if (email) {
      const designTitle =
        updated.title ??
        (updated.product_type
          ? `${updated.product_type} Design`
          : "Design");
      await sendEmail({
        to: email,
        ...designRejectedEmail({
          designTitle,
          workspaceUrl: `${getSiteUrl()}/account/designs/${updated.id}`,
        }),
      });
    }
  }

  redirect("/admin/review");
}

// ── Printful fulfillment ─────────────────────────────────────────────────

// Black M = 4017, White M = 4012 (Bella+Canvas 3001)
function getPrintfulVariantId(placement: unknown): number {
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

export async function sendToPrintful(formData: FormData) {
  const { service } = await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders?error=${encodeURIComponent("Invalid order.")}`);
  }

  // Fetch order
  const { data: order, error: orderError } = await service
    .from("orders")
    .select(
      "id, status, design_id, size, quantity, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    redirect(`/admin/orders?error=${encodeURIComponent("Order not found.")}`);
  }

  if (order.status !== "paid") {
    redirect(
      `/admin/orders?error=${encodeURIComponent(`Order status is '${order.status}', expected 'paid'.`)}`
    );
  }

  // Fetch design
  const { data: design, error: designError } = await service
    .from("designs")
    .select("id, image_url, placement")
    .eq("id", order.design_id)
    .maybeSingle();

  if (designError || !design) {
    redirect(`/admin/orders?error=${encodeURIComponent("Design not found.")}`);
  }

  const catalogVariantId = getPrintfulVariantId(design.placement);

  // Submit to Printful
  let pfData: Record<string, unknown>;
  try {
    const pfRes = await fetch("https://api.printful.com/v2/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
        "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID!,
      },
      body: JSON.stringify({ draft: true,
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
            source: "catalog",
            catalog_variant_id: catalogVariantId,
            quantity: order.quantity ?? 1,
            placements: [
              {
                placement: "front",
                technique: "dtg",
                layers: [{ type: "file", url: design.image_url }],
              },
            ],
          },
        ],
      }),
    });

    if (!pfRes.ok) {
      const body = await pfRes.text().catch(() => "");
      redirect(
        `/admin/orders?error=${encodeURIComponent(`Printful error ${pfRes.status}${body ? `: ${body.slice(0, 120)}` : "."}.`)}`
      );
    }

    pfData = await pfRes.json();
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    redirect(
      `/admin/orders?error=${encodeURIComponent("Failed to reach Printful. Please try again.")}`
    );
  }

  const printfulOrderId: number = (pfData?.data as Record<string, unknown>)?.id as number ?? pfData?.id as number;

  // Update order in DB
  const { error: updateError } = await service
    .from("orders")
    .update({ status: "fulfillment_pending", printful_order_id: printfulOrderId })
    .eq("id", orderId);

  if (updateError) {
    redirect(
      `/admin/orders?error=${encodeURIComponent("Printful order created but DB update failed. Please check manually.")}`
    );
  }

  redirect(`/admin/orders?success=${encodeURIComponent("Order sent to Printful.")}`);
}

export async function markFulfillmentPending(formData: FormData) {
  const { service } = await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders?error=${encodeURIComponent("Invalid order.")}`);
  }

  const { data, error } = await service
    .from("orders")
    .update({ status: "fulfillment_pending" })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("id");

  if (error || !data || data.length === 0) {
    redirect(
      `/admin/orders?error=${encodeURIComponent("Could not update order. Please try again.")}`
    );
  }

  redirect(`/admin/orders?success=${encodeURIComponent("Order marked as in fulfillment.")}`);
}

export async function markShipped(formData: FormData) {
  const { service } = await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders?error=${encodeURIComponent("Invalid order.")}`);
  }

  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim() || null;

  const { data, error } = await service
    .from("orders")
    .update({ status: "shipped", tracking_number: trackingNumber })
    .eq("id", orderId)
    .eq("status", "fulfillment_pending")
    .select("id, buyer_id, design_id, size, quantity, amount_total_cents");

  if (error || !data || data.length === 0) {
    redirect(
      `/admin/orders?error=${encodeURIComponent("Could not update order. Please try again.")}`
    );
  }

  // Non-blocking: send shipping notification to buyer.
  // Failure here must never prevent the redirect below.
  const order = data[0];
  if (order.buyer_id) {
    const { data: design } = await service
      .from("designs")
      .select("title, product_type")
      .eq("id", order.design_id)
      .maybeSingle();

    const designTitle =
      design?.title ??
      (design?.product_type ? `${design.product_type} Design` : "Design");

    sendOrderShippedEmail({
      buyerId: order.buyer_id,
      orderId: order.id,
      designTitle,
      size: order.size,
      quantity: order.quantity,
      totalCents: order.amount_total_cents,
      trackingNumber,
    }).catch(() => {});
  }

  redirect(`/admin/orders?success=${encodeURIComponent("Order marked as shipped.")}`);
}

export async function cancelOrder(formData: FormData) {
  const { service } = await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders?error=${encodeURIComponent("Invalid order.")}`);
  }

  const { error } = await service
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .neq("status", "cancelled");

  if (error) {
    redirect(
      `/admin/orders?error=${encodeURIComponent("Could not cancel order. Please try again.")}`
    );
  }

  redirect(`/admin/orders?success=${encodeURIComponent("Order cancelled.")}`);
}

// ── Design management ────────────────────────────────────────

export async function archiveDesign(formData: FormData) {
  const { supabase } = await requireAdmin();

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(`/admin/designs?error=${encodeURIComponent("Invalid design.")}`);
  }

  const { error } = await supabase
    .from("designs")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", designId)
    .is("archived_at", null);

  if (error) {
    redirect(
      `/admin/designs?error=${encodeURIComponent("Could not archive design. Please try again.")}`
    );
  }

  redirect(`/admin/designs?success=${encodeURIComponent("Design archived.")}`);
}

export async function unarchiveDesign(formData: FormData) {
  const { supabase } = await requireAdmin();

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(`/admin/designs?error=${encodeURIComponent("Invalid design.")}`);
  }

  const { error } = await supabase
    .from("designs")
    .update({ archived_at: null })
    .eq("id", designId)
    .not("archived_at", "is", null);

  if (error) {
    redirect(
      `/admin/designs?error=${encodeURIComponent("Could not unarchive design. Please try again.")}`
    );
  }

  redirect(`/admin/designs?success=${encodeURIComponent("Design restored.")}`);
}

export async function deleteDesignPermanently(formData: FormData) {
  const { supabase } = await requireAdmin();

  const designId = String(formData.get("designId") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (!designId) {
    redirect(`/admin/designs?error=${encodeURIComponent("Invalid design.")}`);
  }

  // Double confirmation: the form must include confirm=DELETE
  if (confirm !== "DELETE") {
    redirect(
      `/admin/designs?error=${encodeURIComponent("Confirmation required. Type DELETE to permanently remove a design.")}`
    );
  }

  const { error } = await supabase
    .from("designs")
    .delete()
    .eq("id", designId)
    .not("archived_at", "is", null); // only allow deleting archived designs

  if (error) {
    redirect(
      `/admin/designs?error=${encodeURIComponent("Could not delete design. Please try again.")}`
    );
  }

  redirect(`/admin/designs?success=${encodeURIComponent("Design permanently deleted.")}`);
}

// ── User management ──────────────────────────────────────────

export async function updateUserCredits(formData: FormData) {
  const { service } = await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const creditsRaw = String(formData.get("credits") ?? "").trim();

  if (!userId) {
    redirect(`/admin/users?error=${encodeURIComponent("Invalid user.")}`);
  }

  const credits = parseInt(creditsRaw, 10);
  if (isNaN(credits) || credits < 0) {
    redirect(
      `/admin/users?error=${encodeURIComponent("Credits must be a non-negative number.")}`
    );
  }

  const { error } = await service
    .from("profiles")
    .update({ generation_credits: credits })
    .eq("id", userId);

  if (error) {
    redirect(
      `/admin/users?error=${encodeURIComponent("Could not update credits. Please try again.")}`
    );
  }

  redirect(`/admin/users?success=${encodeURIComponent("Credits updated.")}`);
}
