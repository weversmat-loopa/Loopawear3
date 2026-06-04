import type { Metadata } from "next";
import MarketplaceBrowse from "./MarketplaceBrowse";
import { fetchDesigns } from "./queries";
import {
  isProductFilter,
  isSortOption,
  type ProductFilter,
  type SortOption,
} from "./filters";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Discover and shop original AI-generated apparel from independent creators on Loopawear.",
};

type Props = {
  searchParams?: Promise<{ q?: string; type?: string; sort?: string }>;
};

export default async function MarketplacePage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};

  const q = params.q?.trim() ?? "";
  const type: ProductFilter = isProductFilter(params.type) ? params.type : null;
  const sort: SortOption = isSortOption(params.sort) ? params.sort : "newest";

  const { designs, nextCursor } = await fetchDesigns({
    q,
    type,
    sort,
    cursor: null,
  });

  // Fetch current user's liked design IDs so the client shows correct
  // initial heart state without an extra round-trip.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let likedIds: string[] = [];
  if (user && designs.length > 0) {
    const designIds = designs.map((d) => d.id);
    const { data: liked } = await supabase
      .from("likes")
      .select("design_id")
      .eq("user_id", user.id)
      .in("design_id", designIds);
    likedIds = (liked ?? []).map((r) => r.design_id);
  }

  return (
    <MarketplaceBrowse
      initialDesigns={designs}
      initialCursor={nextCursor}
      initialFilter={type}
      initialQuery={q}
      initialSort={sort}
      likedIds={likedIds}
    />
  );
}
