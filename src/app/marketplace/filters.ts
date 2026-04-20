export const PRODUCT_FILTERS = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;

export type ProductFilter = (typeof PRODUCT_FILTERS)[number] | null;
