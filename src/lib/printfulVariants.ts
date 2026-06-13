// Central source of truth for Printful catalog variant IDs.
// Product 71 = Bella + Canvas 3001, size M only.
// Extend here when adding new colors or sizes; all mockup/fulfillment
// code imports from this file so you only need to change one place.

export const PRINTFUL_VARIANTS_M = {
  white: 4012,
  black: 4017,
  sand: 14675,  // Tan
  blue: 4172,   // True Royal
} as const;

export type ShirtColor = keyof typeof PRINTFUL_VARIANTS_M;

export function getVariantId(shirtColor: unknown): number {
  if (typeof shirtColor === 'string' && shirtColor in PRINTFUL_VARIANTS_M) {
    return PRINTFUL_VARIANTS_M[shirtColor as ShirtColor];
  }
  return PRINTFUL_VARIANTS_M.black; // safe fallback
}
