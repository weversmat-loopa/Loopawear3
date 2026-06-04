export const PRODUCT_FILTERS = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;
export type ProductFilter = (typeof PRODUCT_FILTERS)[number] | null;

export const SORT_OPTIONS = ["newest", "price-asc", "price-desc", "most-liked"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "most-liked": "Most liked",
};

export function isProductFilter(value: unknown): value is Exclude<ProductFilter, null> {
  return (
    typeof value === "string" &&
    (PRODUCT_FILTERS as readonly string[]).includes(value)
  );
}

export function isSortOption(value: unknown): value is SortOption {
  return (
    typeof value === "string" &&
    (SORT_OPTIONS as readonly string[]).includes(value)
  );
}
