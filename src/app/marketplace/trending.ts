import { createClient } from "@/utils/supabase/server";
import type { DesignPlacement } from "./queries";

export type TrendingDesign = {
  id: string;
  title: string | null;
  product_type: string | null;
  image_url: string | null;
  mockup_url: string | null;
  mockup_status: string | null;
  placement: DesignPlacement;
  price_cents: number | null;
  creator_id: string | null;
  creator_name: string | null;
  like_count: number;
};

/**
 * Fetch designs trending in the past 7 days.
 *
 * Strategy: count likes created in the last 7 days per design,
 * then join with the designs table and filter to published ones.
 * Uses a Supabase RPC call to avoid needing a complex PostgREST
 * join — the query runs as a single indexed scan.
 *
 * Falls back to most-liked-all-time if fewer than `limit` designs
 * have recent likes (keeps the section populated while the platform
 * is still early).
 */
export async function fetchTrending(limit = 6): Promise<TrendingDesign[]> {
  const supabase = await createClient();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get design IDs sorted by recent like count
  const { data: recentLikes } = await supabase
    .from("likes")
    .select("design_id")
    .gte("created_at", since);

  // Count per design_id in JS (avoids needing a GROUP BY RPC)
  const countMap: Record<string, number> = {};
  for (const row of recentLikes ?? []) {
    countMap[row.design_id] = (countMap[row.design_id] ?? 0) + 1;
  }

  let rankedIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // Fallback: if fewer than limit designs have recent likes, pad with
  // all-time most liked
  if (rankedIds.length < limit) {
    const { data: allLikes } = await supabase
      .from("likes")
      .select("design_id");

    const allCount: Record<string, number> = {};
    for (const row of allLikes ?? []) {
      allCount[row.design_id] = (allCount[row.design_id] ?? 0) + 1;
    }

    const allRanked = Object.entries(allCount)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    // Merge: keep existing order, append any not yet present
    for (const id of allRanked) {
      if (!rankedIds.includes(id)) rankedIds.push(id);
    }
  }

  if (rankedIds.length === 0) return [];

  const topIds = rankedIds.slice(0, limit);

  // Fetch the actual designs
  const { data: designs } = await supabase
    .from("designs")
    .select("id, title, product_type, image_url, mockup_url, mockup_status, placement, price_cents, creator_id")
    .eq("status", "published")
    .is("archived_at", null)
    .in("id", topIds);

  if (!designs || designs.length === 0) return [];

  // Preserve the like-count order (Supabase .in() doesn't guarantee order)
  const designMap = new Map(designs.map((d) => [d.id, d]));
  const ordered = topIds
    .map((id) => designMap.get(id))
    .filter((d): d is NonNullable<typeof d> => !!d);

  // Fetch creator names
  const creatorIds = [...new Set(ordered.map((d) => d.creator_id).filter(Boolean))] as string[];
  let nameMap: Record<string, string | null> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name ?? null]));
  }

  return ordered.map((d) => {
    const raw = d.placement as { x?: unknown; y?: unknown; scale?: unknown } | null;
    const placement: DesignPlacement =
      raw && typeof raw.x === "number" && typeof raw.y === "number" && typeof raw.scale === "number"
        ? { x: raw.x, y: raw.y, scale: raw.scale }
        : null;

    return {
      id: d.id,
      title: d.title ?? null,
      product_type: d.product_type ?? null,
      image_url: d.image_url ?? null,
      mockup_url: d.mockup_url ?? null,
      mockup_status: d.mockup_status ?? null,
      placement,
      price_cents: d.price_cents ?? null,
      creator_id: d.creator_id ?? null,
      creator_name: d.creator_id ? (nameMap[d.creator_id] ?? null) : null,
      like_count: countMap[d.id] ?? 0,
    };
  });
}
