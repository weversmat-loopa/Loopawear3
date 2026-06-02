import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 120;

const PRINTFUL_API = "https://api.printful.com/v2";

// Phase 1 — Bella + Canvas 3001, DTG front, Black / M.
// Replace variant id when multi-colour support is added.
const PRINTFUL_CATALOG_PRODUCT_ID = 71;
const PRINTFUL_CATALOG_VARIANT_ID = 4017;
// Men's Lifestyle 3 (front view) — tested against product 71.
const PRINTFUL_MOCKUP_STYLE_ID = 758;

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS  = 60_000;

type Params = { id: string };

// Minimal shapes for the Printful v2 responses we actually inspect.
// Both endpoints return results wrapped in a `data` array.
type PrintfulCreateResponse = {
  data?: Array<{ id?: number; status?: string }>;
};

type PrintfulPollResponse = {
  data?: Array<{
    status?: string;
    failure_reasons?: string[];
    catalog_variant_mockups?: Array<{
      mockups?: Array<{ mockup_url?: string }>;
    }>;
  }>;
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  if (!process.env.PRINTFUL_API_TOKEN) {
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
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
    // ── 1. Create Printful v2 mockup task ──────────────────────────────
    const createRes = await fetch(`${PRINTFUL_API}/mockup-tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format: "jpg",
        products: [
          {
            source: "catalog",
            catalog_product_id: PRINTFUL_CATALOG_PRODUCT_ID,
            catalog_variant_ids: [PRINTFUL_CATALOG_VARIANT_ID],
            mockup_style_ids: [PRINTFUL_MOCKUP_STYLE_ID],
            placements: [
              {
                placement: "front",
                technique: "dtg",
                layers: [
                  {
                    type: "file",
                    url: design.image_url,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => "");
      console.error("[mockup] Printful create-task failed:", createRes.status, errText);
      throw new Error("printful_create_failed");
    }

    const createData = (await createRes.json()) as PrintfulCreateResponse;
    const taskId = createData.data?.[0]?.id;

    if (!taskId) {
      console.error("[mockup] Printful returned no task id:", createData);
      throw new Error("printful_no_task_id");
    }

    // ── 2. Poll until completed or timeout ────────────────────────────
    let mockupCdnUrl: string | null = null;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const pollRes = await fetch(
        `${PRINTFUL_API}/mockup-tasks?id=${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
          },
        }
      );

      if (!pollRes.ok) {
        console.error("[mockup] Printful poll failed:", pollRes.status);
        throw new Error("printful_poll_failed");
      }

      const pollData = (await pollRes.json()) as PrintfulPollResponse;
      const task = pollData.data?.[0];

      if (task?.failure_reasons && task.failure_reasons.length > 0) {
        console.error("[mockup] Printful task failed:", task.failure_reasons);
        throw new Error("printful_task_failed");
      }

      if (task?.status === "completed") {
        mockupCdnUrl =
          task.catalog_variant_mockups?.[0]?.mockups?.[0]?.mockup_url ?? null;
        break;
      }
      // status === "pending" — keep polling
    }

    if (!mockupCdnUrl) {
      throw new Error("mockup_timeout");
    }

    // ── 3. Download from Printful CDN and persist in Supabase Storage ──
    // Printful CDN URLs are temporary — we must store a permanent copy.
    let publicUrl: string;
    try {
      const imgRes = await fetch(mockupCdnUrl);
      if (!imgRes.ok) throw new Error("download_failed");
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      const storagePath = `designs/${id}_mockup.jpg`;
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
      console.error("[mockup] Storage error:", err);
      throw new Error("storage_failed");
    }

    // ── 4. Persist URL in DB ───────────────────────────────────────────
    const { error: dbError } = await supabase
      .from("designs")
      .update({ mockup_status: "ready", mockup_url: publicUrl })
      .eq("id", id)
      .eq("creator_id", user.id);

    if (dbError) {
      console.error("[mockup] DB update failed:", dbError);
      throw new Error("db_failed");
    }

    return NextResponse.json({ mockupUrl: publicUrl });
  } catch (err) {
    // Always release the generating lock so the user can retry.
    console.error("[mockup]", err);
    await supabase
      .from("designs")
      .update({ mockup_status: "failed" })
      .eq("id", id)
      .eq("creator_id", user.id);

    return NextResponse.json({ error: "mockup_failed" }, { status: 500 });
  }
}
