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

  const { data: design } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style")
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
  // This collapses the status check and update into one operation, eliminating the
  // race window between a separate read and write.
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

  const prompt = buildGenerationPrompt(
    design.prompt,
    design.product_type,
    design.style,
    colorPalette
  );

  try {
    const result = await fal.run("fal-ai/flux/dev", {
      input: {
        prompt,
        image_size: "square_hd",
        num_images: 1,
      },
    });

    const imageUrl = result.data.images?.[0]?.url;

    if (!imageUrl) {
      await supabase
        .from("designs")
        .update({ image_status: "failed" })
        .eq("id", id)
        .eq("creator_id", user.id);
      return NextResponse.json({ error: "no_image_url" }, { status: 500 });
    }

    await supabase
      .from("designs")
      .update({ image_status: "ready", image_url: imageUrl })
      .eq("id", id)
      .eq("creator_id", user.id);

    return NextResponse.json({ imageUrl });
  } catch {
    await supabase
      .from("designs")
      .update({ image_status: "failed" })
      .eq("id", id)
      .eq("creator_id", user.id);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
