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
  // '~' is URL-safe and never appears in ISO 8601 timestamps, integer
  // strings, or UUIDs — safe as a separator without escaping.
  return `${sortValue}~${id}`;
}

function decodeCursor(
  cursor: string
): { value: string; id: string } | null {
  const idx = cursor.lastIndexOf("~");
  if (idx === -1) return null;
  return { value: cursor.slice(0, idx), id: cursor.slice(idx + 1) };
}

export async function fetchDesigns({
  q,
  type,
  sort,
  cursor,
}: FetchDesignsParams): Promise<FetchDesignsResult> {
  const supabase = await createClient();

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
    // Escape PostgREST ilike wildcards in user input so users can't
    // inject '%' to widen searches. Backslash-escape '%' and '_'.
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
    // Sorting by price only makes sense for designs that have one set.
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

  // Fetch one extra row to detect "has more" without a separate count.
  const { data: rows } = await query.limit(PAGE_SIZE + 1);
  const designsData = rows ?? [];
  const hasMore = designsData.length > PAGE_SIZE;
  const items = hasMore ? designsData.slice(0, PAGE_SIZE) : designsData;

  // Look up creator display names for the items we're returning.
  const creatorIds = [
    ...new Set(
      items
        .map((d) => d.creator_id)
        .filter((id): id is string => Boolean(id))
    ),
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

  const designs: MarketplaceDesign[] = items.map((d) => {
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
    };
  });

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    const sortValue =
      sort === "newest" ? last.created_at : String(last.price_cents);
    nextCursor = encodeCursor(sortValue, last.id);
  }

  return { designs, nextCursor };
}
