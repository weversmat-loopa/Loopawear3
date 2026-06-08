import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { fal } from "@fal-ai/client";

export const maxDuration = 120;

fal.config({ credentials: process.env.FAL_KEY });

type Params = { id: string };

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "configuration_error", detail: "FAL_KEY is not set" },
      { status: 500 }
    );
  }

  const modelImageUrl = process.env.FASHN_MODEL_IMAGE_URL;
  if (!modelImageUrl) {
    return NextResponse.json(
      {
        error: "configuration_error",
        detail:
          "FASHN_MODEL_IMAGE_URL is not set. Add a public URL to a model photo in your .env.local.",
      },
      { status: 500 }
    );
  }

  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const { data: design } = await supabase
    .from("designs")
    .select("id, creator_id, image_status, image_url, mockup_status")
    .eq("id", id)
    .maybeSingle();

  if (!design) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (design.creator_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (design.image_status !== "ready" || !design.image_url) {
    return NextResponse.json({ error: "image_not_ready" }, { status: 400 });
  }

  // Atomically claim the slot — only succeeds when not already generating.
  const { data: claimed } = await supabase
    .from("designs")
    .update({ mockup_status: "generating" })
    .eq("id", id)
    .eq("creator_id", user.id)
    .neq("mockup_status", "generating")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    return NextResponse.json({ error: "already_generating" }, { status: 409 });
  }

  try {
    // ── 1. Call fal.ai FASHN try-on ────────────────────────────────────
    const result = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
      input: {
        model_image: modelImageUrl,
        garment_image: design.image_url,
        garment_photo_type: "flat-lay",
        category: "tops",
      },
      logs: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const falImageUrl = (result as any).data?.images?.[0]?.url as string | undefined;

    if (!falImageUrl) {
      console.error("[ai-mockup] fal.ai returned no image url:", result);
      throw new Error("fal_no_image_url");
    }

    // ── 2. Download from fal CDN and persist in Supabase Storage ───────
    // fal CDN URLs are temporary — we must store a permanent copy.
    let publicUrl: string;
    try {
      const imgRes = await fetch(falImageUrl);
      if (!imgRes.ok) throw new Error("download_failed");
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      const storagePath = `designs/${id}_ai_mockup.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("design-images")
        .upload(storagePath, imgBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw new Error("upload_failed");

      const {
        data: { publicUrl: baseUrl },
      } = supabase.storage.from("design-images").getPublicUrl(storagePath);

      // Cache-bust so the browser never serves a stale mockup after regeneration.
      publicUrl = `${baseUrl}?t=${Date.now()}`;
    } catch (err) {
      console.error("[ai-mockup] Storage error:", err);
      throw new Error("storage_failed");
    }

    // ── 3. Persist URL in DB ───────────────────────────────────────────
    const { error: dbError } = await supabase
      .from("designs")
      .update({ mockup_status: "ready", mockup_url: publicUrl })
      .eq("id", id)
      .eq("creator_id", user.id);

    if (dbError) {
      console.error("[ai-mockup] DB update failed:", dbError);
      throw new Error("db_failed");
    }

    return NextResponse.json({ mockupUrl: publicUrl });
  } catch (err) {
    // Always release the generating lock so the user can retry.
    console.error("[ai-mockup]", err);
    await supabase
      .from("designs")
      .update({ mockup_status: "failed" })
      .eq("id", id)
      .eq("creator_id", user.id);

    return NextResponse.json({ error: "mockup_failed" }, { status: 500 });
  }
}
