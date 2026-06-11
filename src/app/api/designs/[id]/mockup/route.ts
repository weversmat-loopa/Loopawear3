import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 120;

const PRINTFUL_API = "https://api.printful.com/v2";

// Phase 1 — Bella + Canvas 3001 (product 71), Black / M (variant 4017), DTG front.
// Replace variant id when multi-colour support is added.
const PRINTFUL_CATALOG_PRODUCT_ID = 71;
const PRINTFUL_CATALOG_VARIANT_ID = 4017;
// Men's Lifestyle 3 › Front (style 758) — real model wearing the shirt.
const PRINTFUL_MOCKUP_STYLE_ID = 758;

// Printful front print area for product 71: 12 × 16 inches at 150 DPI.
const PRINT_AREA_W = 1800; // 12 * 150
const PRINT_AREA_H = 2400; // 16 * 150

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS  = 60_000;

type Params = { id: string };

// Shape of the placement JSONB column saved by PlacementEditor.
interface SavedPlacement {
  side?: unknown;
  x?: unknown;
  y?: unknown;
  scale?: unknown;
  rotation?: unknown;
  shirtColor?: unknown;
  size?: unknown;
  canvasW?: unknown;
  canvasH?: unknown;
}

// Printful position object sent inside a layer.
interface PrintfulPosition {
  area_width: number;
  area_height: number;
  width: number;
  height: number;
  left: number;
  top: number;
  rotation?: number;
}

/**
 * Convert a PlacementEditor canvas-space placement into a Printful pixel-space
 * position object. Returns null if the placement data is missing or invalid so
 * the caller can fall back to Printful's default centering.
 *
 * Canvas coordinate system: x/y is the design's CENTER in canvas pixels.
 * scale is the fraction of canvasW that the design occupies (its rendered width).
 * Printful position system: left/top is the design's TOP-LEFT in print pixels.
 */
function buildPrintfulPosition(raw: unknown): PrintfulPosition | null {
  if (!raw || typeof raw !== "object") return null;

  const p = raw as SavedPlacement;

  const x       = typeof p.x       === "number" ? p.x       : null;
  const y       = typeof p.y       === "number" ? p.y       : null;
  const scale   = typeof p.scale   === "number" ? p.scale   : null;
  const canvasW = typeof p.canvasW === "number" ? p.canvasW : null;
  const canvasH = typeof p.canvasH === "number" ? p.canvasH : null;

  // All five fields must be finite non-zero numbers.
  if (
    x === null || y === null || scale === null ||
    canvasW === null || canvasH === null ||
    !isFinite(x) || !isFinite(y) || !isFinite(scale) ||
    !isFinite(canvasW) || !isFinite(canvasH) ||
    canvasW <= 0 || canvasH <= 0 || scale <= 0
  ) {
    return null;
  }

  // Design footprint as a fraction of canvas width — scale IS that fraction.
  const footprintFraction = scale;
  const designPx = Math.round(footprintFraction * PRINT_AREA_W);
  const width  = Math.max(1, designPx);
  const height = width; // keep square

  // Convert center coords to top-left in print space.
  let left = Math.round((x / canvasW) * PRINT_AREA_W - width / 2);
  let top  = Math.round((y / canvasH) * PRINT_AREA_H - height / 2);

  // Clamp so the design never bleeds outside the print area.
  left = Math.max(0, Math.min(left, PRINT_AREA_W - width));
  top  = Math.max(0, Math.min(top,  PRINT_AREA_H - height));

  const position: PrintfulPosition = {
    area_width:  PRINT_AREA_W,
    area_height: PRINT_AREA_H,
    width,
    height,
    left,
    top,
  };

  const rotation = typeof p.rotation === "number" ? p.rotation : null;
  if (rotation !== null && isFinite(rotation) && rotation !== 0) {
    position.rotation = rotation;
  }

  return position;
}

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
    .select("id, creator_id, image_status, image_url, mockup_status, placement")
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

  // Build Printful position from saved placement, falling back to centered.
  const printfulPosition = buildPrintfulPosition(design.placement);

  try {
    // ── 1. Create Printful v2 mockup task ──────────────────────────────
    const layer: Record<string, unknown> = {
      type: "file",
      url: design.image_url,
    };
    if (printfulPosition) {
      layer.position = printfulPosition;
    }

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
                layers: [layer],
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
