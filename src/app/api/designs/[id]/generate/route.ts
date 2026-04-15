import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { createClient } from "@/utils/supabase/server";

fal.config({ credentials: process.env.FAL_KEY });

type Params = { id: string };

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
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
    .select("id, prompt, product_type, style, image_status")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!design) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (
    design.image_status !== "none" &&
    design.image_status !== null &&
    design.image_status !== "failed"
  ) {
    return NextResponse.json({ error: "already_generating" }, { status: 409 });
  }

  await supabase
    .from("designs")
    .update({ image_status: "generating" })
    .eq("id", id)
    .eq("creator_id", user.id);

  let prompt = design.prompt.trim();
  if (design.product_type) prompt = `${design.product_type} design: ${prompt}`;
  if (design.style) prompt = `${prompt}, ${design.style.toLowerCase()} style`;

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
