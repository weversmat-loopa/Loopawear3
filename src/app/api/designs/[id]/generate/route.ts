import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 300;

fal.config({ credentials: process.env.FAL_KEY });

const STYLE_KEYWORDS: Record<string, string> = {
  Minimal: "clean minimal lines, flat design, limited color palette",
  Bold: "bold shapes, high contrast, strong graphic composition",
  Vintage: "retro vintage aesthetic, worn texture, faded palette",
  Abstract: "abstract geometric shapes, non-representational, artistic",
  Graphic: "graphic illustration, sharp lines, vector-art style",
};

const COLOR_PALETTE_KEYWORDS: Record<string, string> = {
  Monochrome: "strictly monochrome, single ink color, black and white only",
  "Two-tone": "exactly two colors, two-tone color scheme, duotone",
  "Full color": "full color illustration, rich vibrant color palette",
};

function buildGenerationPrompt(
  userPrompt: string,
  _productType: string | null,
  style: string | null,
  colorPalette: string | null
): string {
  const parts: string[] = [];

  // Establish output format first so the model generates a graphic design, not a photo
  parts.push(
    "Flat graphic illustration, t-shirt print design, isolated on a plain white background, sharp clean artwork, no gradients, print-ready."
  );

  if (style && STYLE_KEYWORDS[style]) {
    parts.push(STYLE_KEYWORDS[style] + ".");
  }

  if (colorPalette && COLOR_PALETTE_KEYWORDS[colorPalette]) {
    parts.push(COLOR_PALETTE_KEYWORDS[colorPalette] + ".");
  }

  parts.push(userPrompt.trim() + ".");

  parts.push("No people. No human figures. No faces.");

  return parts.join(" ");
}

type Params = { id: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { colorPalette?: string };
  const colorPalette = typeof body.colorPalette === "string" ? body.colorPalette : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  // Fetch design including image_status so we can restore it if credits are exhausted
  const { data: design } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style, image_status")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!design) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!design.prompt.trim()) {
    return NextResponse.json({ error: "invalid_design" }, { status: 422 });
  }

  // Atomically claim the generation slot — only succeeds if not already generating.
  const { data: claimed } = await supabase
    .from("designs")
    .update({ image_status: "generating" })
    .eq("id", id)
    .eq("creator_id", user.id)
    .neq("image_status", "generating")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    return NextResponse.json({ error: "already_generating" }, { status: 409 });
  }

  // Decrement credits after slot is claimed — a request blocked by already_generating
  // does not cost the user a credit. Returns -1 if balance is zero.
  const { data: newCredits } = await supabase.rpc("decrement_generation_credits", {
    user_id: user.id,
  });

  if (newCredits === -1) {
    // Restore the previous image_status before returning
    await supabase
      .from("designs")
      .update({ image_status: design.image_status ?? "none" })
      .eq("id", id)
      .eq("creator_id", user.id);
    return NextResponse.json({ error: "credits_exhausted" }, { status: 402 });
  }

  const prompt = buildGenerationPrompt(
    design.prompt,
    design.product_type,
    design.style,
    colorPalette
  );

  try {
    const result = await fal.run("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: "square_hd",
        num_images: 1,
        num_inference_steps: 8,
      },
    });

    const falImageUrl = result.data.images?.[0]?.url;

    if (!falImageUrl) {
      await supabase
        .from("designs")
        .update({ image_status: "failed" })
        .eq("id", id)
        .eq("creator_id", user.id);
      return NextResponse.json({ error: "no_image_url" }, { status: 500 });
    }

    // Persist to Supabase Storage so we're not dependent on temporary fal CDN URLs.
    let imageUrl: string;
    try {
      const imageRes = await fetch(falImageUrl);
      if (!imageRes.ok) throw new Error("download_failed");
      const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

      const storagePath = `designs/${id}.png`;
      const { error: uploadError } = await supabase.storage
        .from("design-images")
        .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true });

      if (uploadError) throw new Error("upload_failed");

      const { data: { publicUrl } } = supabase.storage
        .from("design-images")
        .getPublicUrl(storagePath);

      // Append a timestamp so the CDN never serves a stale cached version
      // after regeneration. The underlying storage path stays stable.
      imageUrl = `${publicUrl}?t=${Date.now()}`;
    } catch {
      await Promise.all([
        supabase
          .from("designs")
          .update({ image_status: "failed" })
          .eq("id", id)
          .eq("creator_id", user.id),
        supabase.rpc("increment_generation_credits", { user_id: user.id }),
      ]);
      return NextResponse.json({ error: "storage_failed" }, { status: 500 });
    }

    const { error: dbError } = await supabase
      .from("designs")
      .update({ image_status: "ready", image_url: imageUrl })
      .eq("id", id)
      .eq("creator_id", user.id);

    if (dbError) {
      await supabase.rpc("increment_generation_credits", { user_id: user.id });
      return NextResponse.json({ error: "storage_failed" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch {
    // fal API failure — mark failed and refund the credit
    await Promise.all([
      supabase
        .from("designs")
        .update({ image_status: "failed" })
        .eq("id", id)
        .eq("creator_id", user.id),
      supabase.rpc("increment_generation_credits", { user_id: user.id }),
    ]);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
