"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// ----------------------------------------------------------------
// Validation helpers
// ----------------------------------------------------------------

const MAX_BIO_LENGTH = 300;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB — phone photos can be 3-8 MB
// HEIC/HEIF added for iOS camera roll; canvas-converted files arrive as image/jpeg
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

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
// updateProfile — saves all editable profile fields in one shot
// ----------------------------------------------------------------

export async function updateProfile(formData: FormData): Promise<{ success?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const display_name = String(formData.get("display_name") ?? "").trim() || null;

  const rawBio = String(formData.get("bio") ?? "").trim();
  if (rawBio.length > MAX_BIO_LENGTH) {
    return { error: `Bio is too long (max ${MAX_BIO_LENGTH} characters).` };
  }
  const bio = rawBio || null;

  const rawWebsite   = String(formData.get("website_url")   ?? "").trim();
  const rawInstagram = String(formData.get("instagram_url") ?? "").trim();
  const rawTiktok    = String(formData.get("tiktok_url")    ?? "").trim();

  if (rawWebsite   && !isValidUrl(rawWebsite))   return { error: "Website URL is invalid." };
  if (rawInstagram && !isValidUrl(rawInstagram)) return { error: "Instagram URL is invalid." };
  if (rawTiktok    && !isValidUrl(rawTiktok))    return { error: "TikTok URL is invalid." };

  const website_url   = rawWebsite   || null;
  const instagram_url = rawInstagram || null;
  const tiktok_url    = rawTiktok    || null;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, bio, website_url, instagram_url, tiktok_url })
    .eq("id", user.id);

  if (error) return { error: "Could not save profile. Please try again." };

  return { success: "Profile saved." };
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
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: "Only JPEG, PNG, WebP, GIF, or HEIC images are allowed." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "File is too large (max 10 MB)." };

  // Derive extension from mime type so HEIC files get the right path
  const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "image/heif": "heif" };
  const ext = extMap[file.type] ?? file.name.split(".").pop() ?? "jpg";
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
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: "Only JPEG, PNG, WebP, GIF, or HEIC images are allowed." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "File is too large (max 10 MB)." };

  // Derive extension from mime type so HEIC files get the right path
  const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "image/heif": "heif" };
  const ext = extMap[file.type] ?? file.name.split(".").pop() ?? "jpg";
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
