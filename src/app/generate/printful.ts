/**
 * ============================================================================
 *  PRINTFUL INTEGRATION POINT
 * ============================================================================
 *  This module is the single place where the print-zone geometry and the shirt
 *  mockup live. Today everything here is hard-coded against the local SVG
 *  mockup (`/public/mockups/tshirt-white.svg`, viewBox 0 0 400 400).
 *
 *  When we wire up Printful later, ONLY this file needs to change:
 *    1. Replace `MOCKUP` with the Printful product/variant mockup URLs.
 *    2. Replace the static `ZONES` with Printful's print-area data
 *       (`/mockup-generator/printfiles/{id}` → `print_areas`), converted into
 *       this same { x, y, w, h } shape in CANVAS_W × CANVAS_H space.
 *    3. Map `SHIRT_COLOURS` keys to Printful variant IDs.
 *
 *  The editor (`PlacementEditor.tsx`) and the read-only renderer
 *  (`components/ui/ProductMockup.tsx`) both consume these values, so keeping
 *  the shape stable keeps the rest of the app untouched.
 * ============================================================================
 */

// ── Canvas dimensions ────────────────────────────────────────────────────────
// The editor canvas and the saved placement coordinates both live in this
// space. The mockup SVG (viewBox 0 0 400 400) is pinned top-left, so y 0..400
// maps to the top..bottom of the square shirt and the extra height below is
// blank working room.
export const CANVAS_W = 400;
export const CANVAS_H = 480;

// ── Print zones ──────────────────────────────────────────────────────────────
// Printful front/back DTG area is ~30 cm × 36 cm on a ~50 cm wide shirt.
// Scale: CANVAS_W / 50 cm ≈ 8 px/cm → 30 × 8 = 240 px, 36 × 8 = 288 px.
// TODO(printful): replace with per-variant print_areas from the Printful API.
export const ZONES = {
  front: { x: 80, y: 92, w: 240, h: 288 },
  back: { x: 80, y: 80, w: 240, h: 288 },
} as const;

export type Side = keyof typeof ZONES;

// ── Mockup ───────────────────────────────────────────────────────────────────
// TODO(printful): swap for Printful's generated mockup image URLs per
// colour/side. The CSS `filter` is a stop-gap to preview colours on the single
// white SVG and should be dropped once real coloured mockups exist.
export const MOCKUP = {
  src: "/mockups/tshirt-white.svg",
} as const;

export const SHIRT_COLOURS = {
  white: { label: "White", hex: "#f3efe3", filter: "" },
  black: { label: "Black", hex: "#1a1a1a", filter: "brightness(0.12)" },
  sand: { label: "Sand", hex: "#cdbf9f", filter: "sepia(0.4) brightness(0.92) saturate(1.3)" },
  blue: { label: "Blue", hex: "#2b4bd6", filter: "brightness(0.45) saturate(3) hue-rotate(205deg)" },
} as const;

export type ShirtColor = keyof typeof SHIRT_COLOURS;

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];
