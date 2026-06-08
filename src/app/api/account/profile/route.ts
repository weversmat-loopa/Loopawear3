import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const MAX_BIO_LENGTH = 300;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json();

  const display_name = String(body.display_name ?? "").trim() || null;

  const rawBio = String(body.bio ?? "").trim();
  if (rawBio.length > MAX_BIO_LENGTH) {
    return NextResponse.json(
      { error: `Bio is too long (max ${MAX_BIO_LENGTH} characters).` },
      { status: 400 }
    );
  }
  const bio = rawBio || null;

  const rawWebsite   = String(body.website_url   ?? "").trim();
  const rawInstagram = String(body.instagram_url ?? "").trim();
  const rawTiktok    = String(body.tiktok_url    ?? "").trim();

  if (rawWebsite   && !isValidUrl(rawWebsite))   return NextResponse.json({ error: "Website URL is invalid." },   { status: 400 });
  if (rawInstagram && !isValidUrl(rawInstagram)) return NextResponse.json({ error: "Instagram URL is invalid." }, { status: 400 });
  if (rawTiktok    && !isValidUrl(rawTiktok))    return NextResponse.json({ error: "TikTok URL is invalid." },    { status: 400 });

  const website_url   = rawWebsite   || null;
  const instagram_url = rawInstagram || null;
  const tiktok_url    = rawTiktok    || null;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, bio, website_url, instagram_url, tiktok_url })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not save profile. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: "Profile saved." });
}
