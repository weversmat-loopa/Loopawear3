import type { Metadata } from "next";
import MarketplaceBrowse from "./MarketplaceBrowse";
import { fetchDesigns } from "./queries";
import {
  isProductFilter,
  isSortOption,
  type ProductFilter,
  type SortOption,
} from "./filters";

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
  const type: ProductFilter = isProductFilter(params.type)
    ? params.type
    : null;
  const sort: SortOption = isSortOption(params.sort) ? params.sort : "newest";

  // The page always fetches the first page of results; the "Load more"
  // button on the client extends the list via /api/marketplace.
  const { designs, nextCursor } = await fetchDesigns({
    q,
    type,
    sort,
    cursor: null,
  });

  return (
    <MarketplaceBrowse
      initialDesigns={designs}
      initialCursor={nextCursor}
      initialFilter={type}
      initialQuery={q}
      initialSort={sort}
    />
  );
}
