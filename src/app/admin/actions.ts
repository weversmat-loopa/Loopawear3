"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getSiteUrl, getUserEmail, sendEmail } from "@/lib/email/send";
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
    .select("id");

  if (error || !data || data.length === 0) {
    redirect(
      `/admin/orders?error=${encodeURIComponent("Could not update order. Please try again.")}`
    );
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
