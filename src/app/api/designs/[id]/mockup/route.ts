import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
// Print-zone geometry (in editor canvas pixels) is the single source of truth
// shared with the PlacementEditor. We need it here to translate a saved
// placement (canvas-space) into the Printful print area (inches).
import { ZONES, type Side } from "@/app/generate/printful";
import { getVariantId } from "@/lib/printfulVariants";

export const maxDuration = 120;

const PRINTFUL_API = "https://api.printful.com/v2";

// Phase 1 — Bella + Canvas 3001 (product 71), DTG front.
const PRINTFUL_CATALOG_PRODUCT_ID = 71;

// Men's Lifestyle 3 › Front (style 758) — real model wearing the shirt.
// In Printful v2 a style id is only valid for the variants that support it, so
// we verify availability per-variant at request time (see isStyleAvailable) and
// fall back to Printful's default style when 758 isn't offered for the variant.
// Styles we request for the multi-mockup gallery, in display order:
//   758   — Men's Lifestyle Front
//   849   — Flat Front
//   22145 — Zoomed In
// Each style that Printful actually produces becomes one stored mockup URL.
const PRINTFUL_MOCKUP_STYLE_IDS = [758, 849, 22145] as const;

// Shape of the /v2/catalog-products/{id}/mockup-styles response we inspect.
// Styles are nested per placement: data[].mockup_styles[]. Each style is
// restricted to a set of variant ids via `restricted_to_variants` (null/empty
// means it applies to all variants).
type MockupStylesResponse = {
  data?: Array<{
    placement?: string;
    mockup_styles?: Array<{
      id?: number;
      restricted_to_variants?: number[] | null;
    }>;
  }>;
};

/**
 * Returns true when mockup style `styleId` is offered for `variantId` on the
 * given product. Any failure (network, parse, unexpected shape) returns false
 * so the caller falls back to Printful's default style rather than risking a
 * create-task error for an unsupported style/variant pairing.
 */
async function isStyleAvailable(
  productId: number,
  variantId: number,
  styleId: number,
  token: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${PRINTFUL_API}/catalog-products/${productId}/mockup-styles`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return false;

    const json = (await res.json()) as MockupStylesResponse;
    // Styles are nested inside data[].mockup_styles[] — flatten across all
    // placement entries into one list before looking up by id.
    const allStyles = (json.data ?? []).flatMap((d) => d.mockup_styles ?? []);
    const style = allStyles.find((s) => s.id === styleId);
    if (!style) return false;
    // null/empty restriction list means the style applies to all variants.
    if (!style.restricted_to_variants || style.restricted_to_variants.length === 0) {
      return true;
    }
    return style.restricted_to_variants.includes(variantId);
  } catch {
    return false;
  }
}

// Printful front print area for product 71: 12 × 16 inches.
// The v2 position object expects inch values, not pixels.
const PRINT_AREA_W = 12; // inches
const PRINT_AREA_H = 16; // inches

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS  = 60_000;

type Params = { id: string };

// Shape of the placement JSONB column saved by PlacementEditor.
interface SavedPlacement {
  side?: unknown;
  x?: unknown;
  y?: unknown;
  scale?: unknown;
  widthFraction?: unknown;
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
 * Convert a PlacementEditor placement into a Printful print-area position.
 *
 * THREE coordinate spaces are involved — getting the bug right means mapping
 * between them correctly:
 *
 *  1. Editor canvas space (pixels, 400 × 480). `x`/`y` are the design's
 *     CENTER in these pixels (Fabric originX/originY = "center").
 *  2. Print ZONE — a sub-rectangle of the canvas, e.g. front =
 *     { x:80, y:92, w:240, h:288 }. The dashed print zone the user sees is
 *     this rectangle, NOT the whole canvas. The Printful print area maps onto
 *     THIS zone, so all positions must be expressed relative to the zone's
 *     origin (zone.x, zone.y) and size (zone.w, zone.h) — not the canvas.
 *  3. Printful print area (inches, 12 × 16). left/top is the design's
 *     TOP-LEFT in inches from the print-area origin.
 *
 * The previous implementation divided x/y by the full canvas width/height,
 * which ignored the zone offset/size and pulled every design toward the canvas
 * centre — horizontal offset was effectively lost. We now convert the center
 * to a fraction of the ZONE, then scale by the inch dimensions of the print area.
 *
 * `widthFraction` is already saved as (design width / zone width), so it maps
 * directly onto the 12-inch print width.
 *
 * Returns null if the placement data is missing or invalid so the caller can
 * fall back to Printful's default centering.
 */
function buildPrintfulPosition(raw: unknown): PrintfulPosition | null {
  if (!raw || typeof raw !== "object") return null;

  const p = raw as SavedPlacement;

  const x            = typeof p.x            === "number" ? p.x            : null;
  const y            = typeof p.y            === "number" ? p.y            : null;
  const widthFraction = typeof p.widthFraction === "number" ? p.widthFraction : null;
  const canvasW      = typeof p.canvasW      === "number" ? p.canvasW      : null;
  const canvasH      = typeof p.canvasH      === "number" ? p.canvasH      : null;

  // All five fields must be finite positive numbers.
  // widthFraction is required — old designs without it fall back to centered.
  if (
    x === null || y === null || widthFraction === null ||
    canvasW === null || canvasH === null ||
    !isFinite(x) || !isFinite(y) || !isFinite(widthFraction) ||
    !isFinite(canvasW) || !isFinite(canvasH) ||
    canvasW <= 0 || canvasH <= 0 || widthFraction <= 0
  ) {
    return null;
  }

  // Resolve the print zone the placement was made against. Default to front
  // (the only side currently sent to Printful) for unknown/missing sides.
  const side: Side = p.side === "back" ? "back" : "front";
  const zone = ZONES[side];

  const round2 = (v: number) => Math.round(v * 100) / 100;

  // widthFraction = rendered design width / zone width (saved by PlacementEditor).
  // Multiply by 12 inches to get the design's print width in inches.
  let width  = round2(Math.min(widthFraction * PRINT_AREA_W, PRINT_AREA_W));
  let height = width; // keep square, cap to 16 if somehow larger
  if (height > PRINT_AREA_H) height = PRINT_AREA_H;

  // Convert the design CENTER from canvas pixels → fraction of the print ZONE,
  // then scale by the print area's inch dimensions and shift to TOP-LEFT.
  // A design at the zone's top-left corner (x≈zone.x, y≈zone.y) now maps to
  // ~0 inches left/top instead of being pulled toward the canvas centre.
  const zoneFracX = (x - zone.x) / zone.w;
  const zoneFracY = (y - zone.y) / zone.h;

  let left = round2(zoneFracX * PRINT_AREA_W - width / 2);
  let top  = round2(zoneFracY * PRINT_AREA_H - height / 2);

  // Clamp so the design never bleeds outside the print area.
  left = Math.max(0, Math.min(left, round2(PRINT_AREA_W - width)));
  top  = Math.max(0, Math.min(top,  round2(PRINT_AREA_H - height)));

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
      mockups?: Array<{ mockup_url?: string; style_id?: number }>;
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

  // Pick the catalog variant that matches the shirt colour the user chose.
  const placement = design.placement as SavedPlacement | null;
  const catalogVariantId = getVariantId(placement?.shirtColor);

  try {
    // ── 1. Create Printful v2 mockup task ──────────────────────────────
    const layer: Record<string, unknown> = {
      type: "file",
      url: design.image_url,
    };
    if (printfulPosition) {
      layer.position = printfulPosition;
    }

    // Request all gallery styles that are actually offered for this variant.
    // Unsupported styles are filtered out so the task never fails on a bad
    // style/variant pairing; if none survive, omit mockup_style_ids entirely
    // and let Printful pick a default style.
    const product: Record<string, unknown> = {
      source: "catalog",
      catalog_product_id: PRINTFUL_CATALOG_PRODUCT_ID,
      catalog_variant_ids: [catalogVariantId],
      placements: [
        {
          placement: "front",
          technique: "dtg",
          layers: [layer],
        },
      ],
    };

    const availableStyleIds: number[] = [];
    for (const styleId of PRINTFUL_MOCKUP_STYLE_IDS) {
      const ok = await isStyleAvailable(
        PRINTFUL_CATALOG_PRODUCT_ID,
        catalogVariantId,
        styleId,
        process.env.PRINTFUL_API_TOKEN!
      );
      if (ok) availableStyleIds.push(styleId);
    }
    if (availableStyleIds.length > 0) {
      product.mockup_style_ids = availableStyleIds;
    }

    const createRes = await fetch(`${PRINTFUL_API}/mockup-tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format: "jpg",
        products: [product],
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
    // Collect every produced mockup (one per requested style) with its
    // style_id so we can name the stored files deterministically.
    type CdnMockup = { url: string; styleId: number | null };
    let cdnMockups: CdnMockup[] = [];
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
        // Flatten all mockups across every catalog_variant_mockups entry.
        cdnMockups = (task.catalog_variant_mockups ?? []).flatMap((cvm) =>
          (cvm.mockups ?? [])
            .filter((m) => typeof m.mockup_url === "string")
            .map((m) => ({
              url: m.mockup_url as string,
              styleId: typeof m.style_id === "number" ? m.style_id : null,
            }))
        );
        break;
      }
      // status === "pending" — keep polling
    }

    if (cdnMockups.length === 0) {
      throw new Error("mockup_timeout");
    }

    // ── 3. Download each from Printful CDN and persist in Supabase Storage ──
    // Printful CDN URLs are temporary — we must store permanent copies.
    // Files are named by style_id when available, falling back to the index
    // so two styles never collide on the same storage path.
    let publicUrls: string[];
    try {
      publicUrls = await Promise.all(
        cdnMockups.map(async (m, idx) => {
          const imgRes = await fetch(m.url);
          if (!imgRes.ok) throw new Error("download_failed");
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

          const styleKey = m.styleId ?? `idx${idx}`;
          const storagePath = `designs/${id}_mockup_${styleKey}.jpg`;
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

          // Cache-bust so the browser never serves a stale mockup after regen.
          return `${baseUrl}?t=${Date.now()}`;
        })
      );
    } catch (err) {
      console.error("[mockup] Storage error:", err);
      throw new Error("storage_failed");
    }

    // First URL doubles as the legacy single mockup_url for backwards compat.
    const primaryUrl = publicUrls[0];

    // ── 4. Persist URLs in DB ──────────────────────────────────────────
    const { error: dbError } = await supabase
      .from("designs")
      .update({
        mockup_status: "ready",
        mockup_url: primaryUrl,
        mockup_urls: publicUrls,
      })
      .eq("id", id)
      .eq("creator_id", user.id);

    if (dbError) {
      console.error("[mockup] DB update failed:", dbError);
      throw new Error("db_failed");
    }

    return NextResponse.json({ mockupUrl: primaryUrl, mockupUrls: publicUrls });
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
