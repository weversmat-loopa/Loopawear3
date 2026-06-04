import { createClient } from "@/utils/supabase/server";
import type { ProductFilter, SortOption } from "./filters";

/**
 * Server-side marketplace queries: filtering, sorting, and keyset
 * pagination. Used by both the marketplace page (initial render) and
 * the /api/marketplace route handler (Load more).
 *
 * Pagination is keyset on (sortValue, id) tuples so it stays correct
 * across price ties (e.g. many designs at €29.99). Cursors encode the
 * last-seen sort value and id, both of which are required.
 *
 * For optimal performance with non-trivial dataset sizes, ensure the
 * designs table has indexes covering each sort:
 *   - (status, created_at DESC, id DESC)
 *   - (status, price_cents, id) WHERE status = 'published'
 * Text search uses ilike with a leading wildcard, which can't use a
 * btree index. For >10k rows, add a pg_trgm GIN index on prompt/title.
 *
 * most-liked sort: fetches like counts from the likes table, sorts
 * in JS, then paginates by offset (keyset niet mogelijk zonder een
 * count-kolom). At large scale, replace with a materialized view.
 */

export const PAGE_SIZE = 12;

export type DesignPlacement = { x: number; y: number; scale: number } | null;

export type MarketplaceDesign = {
  id: string;
  title: string | null;
  prompt: string;
  product_type: string | null;
  style: string | null;
  image_url: string | null;
  mockup_url: string | null;
  mockup_status: string | null;
  placement: DesignPlacement;
  created_at: string;
  creator_id: string | null;
  creator_name: string | null;
  price_cents: number | null;
  like_count: number;
};

export type FetchDesignsParams = {
  q: string;
  type: ProductFilter;
  sort: SortOption;
  cursor: string | null;
};

export type FetchDesignsResult = {
  designs: MarketplaceDesign[];
  nextCursor: string | null;
};

function encodeCursor(sortValue: string, id: string): string {
  return `${sortValue}~${id}`;
}

function decodeCursor(cursor: string): { value: string; id: string } | null {
  const idx = cursor.lastIndexOf("~");
  if (idx === -1) return null;
  return { value: cursor.slice(0, idx), id: cursor.slice(idx + 1) };
}

// ── Shared helper: enrich items with creator names + like counts ──

async function enrichDesigns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: {
    id: string;
    title: string | null;
    prompt: string;
    product_type: string | null;
    style: string | null;
    image_url: string | null;
    mockup_url: string | null;
    mockup_status: string | null;
    placement: unknown;
    created_at: string;
    creator_id: string | null;
    price_cents: number | null;
  }[],
): Promise<MarketplaceDesign[]> {
  const creatorIds = [
    ...new Set(items.map((d) => d.creator_id).filter((id): id is string => Boolean(id))),
  ];

  let creatorNames: Record<string, string | null> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    creatorNames = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? null])
    );
  }

  // Fetch like counts for these designs in one query
  const designIds = items.map((d) => d.id);
  const { data: likesRows } = await supabase
    .from("likes")
    .select("design_id")
    .in("design_id", designIds);

  const likeCounts: Record<string, number> = {};
  for (const row of likesRows ?? []) {
    likeCounts[row.design_id] = (likeCounts[row.design_id] ?? 0) + 1;
  }

  return items.map((d) => {
    const raw = d.placement as { x?: unknown; y?: unknown; scale?: unknown } | null;
    const placement: DesignPlacement =
      raw &&
      typeof raw.x === "number" &&
      typeof raw.y === "number" &&
      typeof raw.scale === "number"
        ? { x: raw.x, y: raw.y, scale: raw.scale }
        : null;
    return {
      ...d,
      placement,
      creator_id: d.creator_id ?? null,
      creator_name: d.creator_id ? (creatorNames[d.creator_id] ?? null) : null,
      price_cents: d.price_cents ?? null,
      like_count: likeCounts[d.id] ?? 0,
    };
  });
}

export async function fetchDesigns({
  q,
  type,
  sort,
  cursor,
}: FetchDesignsParams): Promise<FetchDesignsResult> {
  const supabase = await createClient();

  // ── most-liked: separate path (no keyset pagination possible without
  //    a stored count; use offset-based pagination instead) ──
  if (sort === "most-liked") {
    const offset = cursor ? parseInt(cursor, 10) : 0;

    let baseQuery = supabase
      .from("designs")
      .select("id, title, prompt, product_type, style, image_url, mockup_url, mockup_status, placement, created_at, creator_id, price_cents")
      .eq("status", "published");

    if (type) baseQuery = baseQuery.eq("product_type", type);
    if (q) {
      const escaped = q.replace(/[%_]/g, "\\$&");
      const term = `%${escaped}%`;
      baseQuery = baseQuery.or(
        `prompt.ilike.${term},title.ilike.${term},style.ilike.${term},product_type.ilike.${term}`
      );
    }

    const { data: allDesigns } = await baseQuery;
    const allItems = allDesigns ?? [];

    // Count all likes for these designs
    const allIds = allItems.map((d) => d.id);
    const { data: likesRows } = allIds.length > 0
      ? await supabase.from("likes").select("design_id").in("design_id", allIds)
      : { data: [] };

    const countMap: Record<string, number> = {};
    for (const row of likesRows ?? []) {
      countMap[row.design_id] = (countMap[row.design_id] ?? 0) + 1;
    }

    // Sort by like count desc, then by newest for ties
    const sorted = [...allItems].sort((a, b) => {
      const diff = (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0);
      if (diff !== 0) return diff;
      return a.created_at < b.created_at ? 1 : -1;
    });

    const page = sorted.slice(offset, offset + PAGE_SIZE);
    const hasMore = sorted.length > offset + PAGE_SIZE;

    const designs = await enrichDesigns(supabase, page);
    const nextCursor = hasMore ? String(offset + PAGE_SIZE) : null;
    return { designs, nextCursor };
  }

  // ── Standard sorts (newest, price-asc, price-desc) ──

  let query = supabase
    .from("designs")
    .select(
      "id, title, prompt, product_type, style, image_url, mockup_url, mockup_status, placement, created_at, creator_id, price_cents"
    )
    .eq("status", "published");

  if (type) {
    query = query.eq("product_type", type);
  }

  if (q) {
    const escaped = q.replace(/[%_]/g, "\\$&");
    const term = `%${escaped}%`;
    query = query.or(
      `prompt.ilike.${term},title.ilike.${term},style.ilike.${term},product_type.ilike.${term}`
    );
  }

  const decoded = cursor ? decodeCursor(cursor) : null;

  if (sort === "newest") {
    if (decoded) {
      query = query.or(
        `created_at.lt.${decoded.value},and(created_at.eq.${decoded.value},id.lt.${decoded.id})`
      );
    }
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  } else if (sort === "price-asc") {
    query = query.not("price_cents", "is", null);
    if (decoded) {
      query = query.or(
        `price_cents.gt.${decoded.value},and(price_cents.eq.${decoded.value},id.gt.${decoded.id})`
      );
    }
    query = query
      .order("price_cents", { ascending: true })
      .order("id", { ascending: true });
  } else {
    // price-desc
    query = query.not("price_cents", "is", null);
    if (decoded) {
      query = query.or(
        `price_cents.lt.${decoded.value},and(price_cents.eq.${decoded.value},id.lt.${decoded.id})`
      );
    }
    query = query
      .order("price_cents", { ascending: false })
      .order("id", { ascending: false });
  }

  const { data: rows } = await query.limit(PAGE_SIZE + 1);
  const designsData = rows ?? [];
  const hasMore = designsData.length > PAGE_SIZE;
  const items = hasMore ? designsData.slice(0, PAGE_SIZE) : designsData;

  const designs = await enrichDesigns(supabase, items);

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    const sortValue = sort === "newest" ? last.created_at : String(last.price_cents);
    nextCursor = encodeCursor(sortValue, last.id);
  }

  return { designs, nextCursor };
}
