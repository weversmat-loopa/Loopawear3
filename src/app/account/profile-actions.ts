"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// ----------------------------------------------------------------
// Validation helpers
// ----------------------------------------------------------------

const MAX_BIO_LENGTH = 300;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitiseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!isValidUrl(trimmed)) return null;
  return trimmed;
}

// ----------------------------------------------------------------
// updateSocialLinks
// ----------------------------------------------------------------

export async function updateSocialLinks(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const website_url   = sanitiseUrl(String(formData.get("website_url")   ?? ""));
  const instagram_url = sanitiseUrl(String(formData.get("instagram_url") ?? ""));
  const tiktok_url    = sanitiseUrl(String(formData.get("tiktok_url")    ?? ""));

  // Validate that whatever was entered is a real URL (non-null means it passed validation)
  const rawWebsite   = String(formData.get("website_url")   ?? "").trim();
  const rawInstagram = String(formData.get("instagram_url") ?? "").trim();
  const rawTiktok    = String(formData.get("tiktok_url")    ?? "").trim();

  if (rawWebsite   && !isValidUrl(rawWebsite))   redirect(`/account?error=${encodeURIComponent("Website URL is invalid.")}`);
  if (rawInstagram && !isValidUrl(rawInstagram)) redirect(`/account?error=${encodeURIComponent("Instagram URL is invalid.")}`);
  if (rawTiktok    && !isValidUrl(rawTiktok))    redirect(`/account?error=${encodeURIComponent("TikTok URL is invalid.")}`);

  const { error } = await supabase
    .from("profiles")
    .update({ website_url, instagram_url, tiktok_url })
    .eq("id", user.id);

  if (error) redirect(`/account?error=${encodeURIComponent("Could not update social links.")}`);

  redirect(`/account?success=${encodeURIComponent("Social links updated.")}`);
}

// ----------------------------------------------------------------
// updateBio (extended — replaces the one in actions.ts)
// Kept here so the account page can import from one place;
// the old actions.ts version is still intact for backwards compat.
// ----------------------------------------------------------------

export async function updateProfileText(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = String(formData.get("bio") ?? "").trim();
  if (raw.length > MAX_BIO_LENGTH) {
    redirect(`/account?error=${encodeURIComponent(`Bio is too long (max ${MAX_BIO_LENGTH} characters).`)}`);
  }
  const bio = raw || null;

  const { error } = await supabase
    .from("profiles")
    .update({ bio })
    .eq("id", user.id);

  if (error) redirect(`/account?error=${encodeURIComponent("Could not update bio.")}`);

  redirect(`/account?success=${encodeURIComponent("Bio updated.")}`);
}

// ----------------------------------------------------------------
// uploadAvatar  — client should POST a FormData with field "file"
// Returns { url } on success, { error } on failure.
// Called from a client component via fetch, NOT as a form action.
// ----------------------------------------------------------------

export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided." };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "File is too large (max 5 MB)." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `avatars/${user.id}/${user.id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-media")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
  const avatar_url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url })
    .eq("id", user.id);

  if (dbError) return { error: dbError.message };

  return { url: avatar_url };
}

// ----------------------------------------------------------------
// uploadBanner
// ----------------------------------------------------------------

export async function uploadBanner(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided." };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "File is too large (max 5 MB)." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `banners/${user.id}/${user.id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-media")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
  const banner_url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ banner_url })
    .eq("id", user.id);

  if (dbError) return { error: dbError.message };

  return { url: banner_url };
}
