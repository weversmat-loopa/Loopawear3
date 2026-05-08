import { NextRequest, NextResponse } from "next/server";
import { fetchDesigns } from "@/app/marketplace/queries";
import {
  isProductFilter,
  isSortOption,
  type ProductFilter,
  type SortOption,
} from "@/app/marketplace/filters";

/**
 * Marketplace search/pagination endpoint used by the "Load more"
 * button. The initial page render goes through the page component,
 * not this route, so changing this URL only affects pagination.
 *
 * Query params: q, type, sort, cursor — all optional. Invalid type
 * or sort values are silently coerced to defaults rather than 400'd
 * so a URL with stale params still renders something sensible.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const q = url.searchParams.get("q")?.trim() ?? "";

  const typeRaw = url.searchParams.get("type");
  const type: ProductFilter = isProductFilter(typeRaw) ? typeRaw : null;

  const sortRaw = url.searchParams.get("sort");
  const sort: SortOption = isSortOption(sortRaw) ? sortRaw : "newest";

  const cursor = url.searchParams.get("cursor") || null;

  const result = await fetchDesigns({ q, type, sort, cursor });
  return NextResponse.json(result);
}
