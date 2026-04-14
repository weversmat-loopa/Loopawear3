"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function publishDraft(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(
      `/account?error=${encodeURIComponent("Invalid design.")}`
    );
  }

  const { error } = await supabase
    .from("designs")
    .update({ status: "published" })
    .eq("id", designId)
    .eq("creator_id", user.id)
    .eq("status", "draft");

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent("Could not publish design. Please try again.")}`
    );
  }

  redirect(
    `/account?success=${encodeURIComponent("Design published to the marketplace.")}`
  );
}

export async function unpublishDesign(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(
      `/account?error=${encodeURIComponent("Invalid design.")}`
    );
  }

  const { error } = await supabase
    .from("designs")
    .update({ status: "draft" })
    .eq("id", designId)
    .eq("creator_id", user.id)
    .eq("status", "published");

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent("Could not unpublish design. Please try again.")}`
    );
  }

  redirect(
    `/account?success=${encodeURIComponent("Design moved back to drafts.")}`
  );
}

export async function updateDesign(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const designId = String(formData.get("designId") ?? "").trim();
  if (!designId) {
    redirect(`/account?error=${encodeURIComponent("Invalid design.")}`);
  }

  const prompt = String(formData.get("prompt") ?? "").trim();
  const productType = String(formData.get("product_type") ?? "").trim() || null;
  const style = String(formData.get("style") ?? "").trim() || null;

  if (!prompt) {
    redirect(
      `/account/designs/${designId}?error=${encodeURIComponent("Prompt cannot be empty.")}`
    );
  }

  const { error } = await supabase
    .from("designs")
    .update({ prompt, product_type: productType, style })
    .eq("id", designId)
    .eq("creator_id", user.id);

  if (error) {
    redirect(
      `/account/designs/${designId}?error=${encodeURIComponent("Could not save changes. Please try again.")}`
    );
  }

  redirect(
    `/account/designs/${designId}?success=${encodeURIComponent("Changes saved.")}`
  );
}

export async function updateDisplayName(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent("Could not update name. Please try again.")}`
    );
  }

  redirect(`/account?success=${encodeURIComponent("Name updated.")}`);
}
