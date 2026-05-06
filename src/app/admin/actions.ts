"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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

  return { supabase };
}

export async function approveDesign(formData: FormData) {
  const { supabase } = await requireAdmin();

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(`/admin/review?error=${encodeURIComponent("Invalid design.")}`);
  }

  const { error } = await supabase
    .from("designs")
    .update({ status: "published" })
    .eq("id", designId)
    .eq("status", "pending_review");

  if (error) {
    redirect(
      `/admin/review?error=${encodeURIComponent("Could not approve design. Please try again.")}`
    );
  }

  redirect("/admin/review");
}

export async function rejectDesign(formData: FormData) {
  const { supabase } = await requireAdmin();

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(`/admin/review?error=${encodeURIComponent("Invalid design.")}`);
  }

  const { error } = await supabase
    .from("designs")
    .update({ status: "draft" })
    .eq("id", designId)
    .eq("status", "pending_review");

  if (error) {
    redirect(
      `/admin/review?error=${encodeURIComponent("Could not reject design. Please try again.")}`
    );
  }

  redirect("/admin/review");
}

export async function markFulfillmentPending(formData: FormData) {
  const { supabase } = await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders?error=${encodeURIComponent("Invalid order.")}`);
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "fulfillment_pending" })
    .eq("id", orderId)
    .eq("status", "paid");

  if (error) {
    redirect(
      `/admin/orders?error=${encodeURIComponent("Could not update order. Please try again.")}`
    );
  }

  redirect(`/admin/orders?success=${encodeURIComponent("Order marked as in fulfillment.")}`);
}

export async function markShipped(formData: FormData) {
  const { supabase } = await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders?error=${encodeURIComponent("Invalid order.")}`);
  }

  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim() || null;

  const { error } = await supabase
    .from("orders")
    .update({ status: "shipped", tracking_number: trackingNumber })
    .eq("id", orderId)
    .eq("status", "fulfillment_pending");

  if (error) {
    redirect(
      `/admin/orders?error=${encodeURIComponent("Could not update order. Please try again.")}`
    );
  }

  redirect(`/admin/orders?success=${encodeURIComponent("Order marked as shipped.")}`);
}

export async function cancelOrder(formData: FormData) {
  const { supabase } = await requireAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders?error=${encodeURIComponent("Invalid order.")}`);
  }

  const { error } = await supabase
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
