"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function submitForReview(formData: FormData) {
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
    .update({ status: "pending_review" })
    .eq("id", designId)
    .eq("creator_id", user.id)
    .eq("status", "draft");

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent("Could not submit design for review. Please try again.")}`
    );
  }

  redirect(
    `/account/designs/${designId}?success=${encodeURIComponent("Design submitted for review.")}`
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
    `/account/designs/${designId}?success=${encodeURIComponent("Design moved back to drafts.")}`
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

  const title = String(formData.get("title") ?? "").trim() || null;
  const prompt = String(formData.get("prompt") ?? "").trim();
  const productType = String(formData.get("product_type") ?? "").trim() || null;
  const style = String(formData.get("style") ?? "").trim() || null;
  const priceEurosRaw = String(formData.get("price_euros") ?? "").trim();

  if (!prompt) {
    redirect(
      `/account/designs/${designId}?error=${encodeURIComponent("Prompt cannot be empty.")}`
    );
  }

  let priceCents: number | null = null;
  if (priceEurosRaw !== "") {
    const parsed = parseFloat(priceEurosRaw);
    if (isNaN(parsed) || parsed < 0) {
      redirect(
        `/account/designs/${designId}?error=${encodeURIComponent("Price must be a valid positive amount (e.g. 29.99).")}`
      );
    }
    priceCents = Math.round(parsed * 100);
  }

  const { error } = await supabase
    .from("designs")
    .update({ title, prompt, product_type: productType, style, price_cents: priceCents })
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

// DEV ONLY — remove when real image generation is wired up
export async function devMarkGenerationReady(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/account");
  }

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

  await supabase
    .from("designs")
    .update({ image_status: "ready" })
    .eq("id", designId)
    .eq("creator_id", user.id)
    .eq("image_status", "generating");

  redirect(`/account/designs/${designId}`);
}

// DEV ONLY — remove when real image generation is wired up
export async function devMarkGenerationFailed(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/account");
  }

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

  await supabase
    .from("designs")
    .update({ image_status: "failed" })
    .eq("id", designId)
    .eq("creator_id", user.id)
    .eq("image_status", "generating");

  redirect(`/account/designs/${designId}`);
}

// DEV ONLY — remove when real image generation is wired up
export async function devSetTestImageUrl(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/account");
  }

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

  const imageUrl = String(formData.get("image_url") ?? "").trim();
  if (!imageUrl) {
    redirect(
      `/account/designs/${designId}?error=${encodeURIComponent("Image URL cannot be empty.")}`
    );
  }

  const { error } = await supabase
    .from("designs")
    .update({ image_url: imageUrl, image_status: "ready" })
    .eq("id", designId)
    .eq("creator_id", user.id);

  if (error) {
    redirect(
      `/account/designs/${designId}?error=${encodeURIComponent("Could not set image URL. Please try again.")}`
    );
  }

  redirect(`/account/designs/${designId}`);
}

// DEV ONLY — remove when real image generation is wired up
export async function devClearImageUrl(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/account");
  }

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

  const { error } = await supabase
    .from("designs")
    .update({ image_url: null, image_status: "none" })
    .eq("id", designId)
    .eq("creator_id", user.id);

  if (error) {
    redirect(
      `/account/designs/${designId}?error=${encodeURIComponent("Could not clear image URL. Please try again.")}`
    );
  }

  redirect(`/account/designs/${designId}`);
}

export async function deleteDesign(formData: FormData) {
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

  // Verify ownership exists before deleting
  const { data: design } = await supabase
    .from("designs")
    .select("id")
    .eq("id", designId)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!design) {
    redirect(`/account?error=${encodeURIComponent("Design not found.")}`);
  }

  // Designs with existing orders cannot be deleted — orders reference this row
  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("design_id", designId);

  if ((orderCount ?? 0) > 0) {
    redirect(
      `/account/designs/${designId}?error=${encodeURIComponent(
        "This design has existing orders and cannot be deleted."
      )}`
    );
  }

  const { error } = await supabase
    .from("designs")
    .delete()
    .eq("id", designId)
    .eq("creator_id", user.id);

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent("Could not delete design. Please try again.")}`
    );
  }

  // Best-effort Storage cleanup — orphaned files are acceptable if this fails
  await supabase.storage
    .from("design-images")
    .remove([`designs/${designId}.png`]);

  redirect("/account");
}

export async function cancelStuckGeneration(formData: FormData) {
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

  // Conditional update — only resets if status is exactly "generating".
  // Safe to call even if the generation completed concurrently; the condition
  // simply matches zero rows without touching any other state.
  await supabase
    .from("designs")
    .update({ image_status: "failed" })
    .eq("id", designId)
    .eq("creator_id", user.id)
    .eq("image_status", "generating");

  redirect(`/account/designs/${designId}`);
}

export async function updateBio(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const raw = String(formData.get("bio") ?? "").trim();
  const bio = raw.slice(0, 300) || null;

  const { error } = await supabase
    .from("profiles")
    .update({ bio })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent("Could not update bio. Please try again.")}`
    );
  }

  redirect(`/account?success=${encodeURIComponent("Bio updated.")}`);
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
