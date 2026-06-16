/**
 * Composites a design image onto a product mockup so buyers see the design
 * on the actual product, not as raw artwork.
 *
 * Currently only the "T-shirt" product type has a mockup. Other product
 * types (Hoodie, Sweatshirt, Tote bag) fall back to the raw artwork until
 * their mockups are added.
 */

import Image from "next/image";
import MockupGallery from "./MockupGallery";

interface PlacementProps {
  x: number;
  y: number;
  scale: number;
}

interface ProductMockupProps {
  imageUrl: string | null;
  productType: string | null;
  alt: string;
  /** Saved placement data from the PlacementEditor (x, y in canvas px; scale as Fabric decimal). */
  placement?: PlacementProps | null;
  /** Hint to the browser about resource priority. Defaults to "lazy". */
  loading?: "lazy" | "eager";
  /** Optional classes applied to the outer wrapper (e.g. hover transforms). */
  className?: string;
  /** Printful-generated mockup URL. When present and status is "ready", shown directly — no SVG overlay. */
  mockupUrl?: string | null;
  /** Multiple Printful mockup style variants. When more than one is present, a thumbnail gallery is shown. */
  mockupUrls?: string[];
  mockupStatus?: string | null;
}

// The PlacementEditor's Fabric canvas is 400×480. Saved x/y are in that
// coordinate space; saved `scale` is the Fabric scaleX value — the fraction
// of the design's natural pixel size at which it's drawn on that canvas.
const CANVAS_W = 400;
// The shirt SVG (viewBox 0 0 400 400) is pinned top-left in the editor, so a
// canvas y of 0..400 maps to the top..bottom of the square mockup. The mockup
// wrapper here is aspect-square (also 400 tall), so y divides by CANVAS_H.
const CANVAS_H = 400;
// Natural pixel width of the generated design image (1024×1024). Needed to
// convert Fabric scaleX into a CSS width relative to the canvas.
const NATURAL_W = 1024;

// Fallback: when no placement data is available, the design sits centred on
// the chest region of /public/mockups/tshirt-white.svg (viewBox 0 0 400 400).
const TSHIRT_PRINT_AREA: React.CSSProperties = {
  left: "35%",
  top: "41%",
  width: "30%",
  height: "30%",
};

// Sizes hint covers the two usage contexts: marketplace card thumbnails
// (~1/4 to 1/2 of viewport) and design detail hero (~50% of viewport,
// capped near 384px in the lg split layout).
const MOCKUP_SIZES =
  "(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw";

export default function ProductMockup({
  imageUrl,
  productType,
  alt,
  placement = null,
  loading = "lazy",
  className,
  mockupUrl = null,
  mockupUrls = [],
  mockupStatus = null,
}: ProductMockupProps) {
  const wrapperClass = `relative aspect-square w-full overflow-hidden ${className ?? ""}`.trim();

  // Empty state — design has no image yet
  if (!imageUrl) {
    return (
      <div className={`${wrapperClass} bg-zinc-100 dark:bg-zinc-800`} aria-hidden />
    );
  }

  // Printful mockup: already a complete product photo, no SVG overlay needed.
  // imageUrl is guaranteed non-null past the check above.
  if (mockupStatus === "ready" && mockupUrl) {
    // Multiple style variants → interactive thumbnail gallery (client).
    if (mockupUrls.length > 1) {
      return (
        <MockupGallery
          urls={mockupUrls}
          alt={alt}
          wrapperClass={wrapperClass}
          sizes={MOCKUP_SIZES}
          loading={loading}
        />
      );
    }
    return (
      <div className={`${wrapperClass} bg-zinc-50 dark:bg-zinc-800`}>
        <Image
          src={mockupUrl}
          alt={alt}
          fill
          sizes={MOCKUP_SIZES}
          loading={loading}
          className="object-contain"
        />
      </div>
    );
  }

  const useTshirtMockup = productType === "T-shirt";

  if (!useTshirtMockup) {
    // No mockup for this product type — fall back to raw artwork
    return (
      <div className={wrapperClass}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={MOCKUP_SIZES}
          loading={loading}
          className="object-cover"
        />
      </div>
    );
  }

  // T-shirt: layer design over the chest of the t-shirt mockup.
  // When placement data is present, honour the x/y/scale from the PlacementEditor.
  const validPlacement =
    placement &&
    typeof placement.x === "number" &&
    typeof placement.y === "number" &&
    typeof placement.scale === "number"
      ? placement
      : null;

  const designStyle: React.CSSProperties = validPlacement
    ? {
        position: "absolute",
        // Fabric stores the design with originX/Y "center", so x/y are the
        // design's centre point on the canvas — pairs with translate(-50%, -50%).
        left:  `${(validPlacement.x / CANVAS_W) * 100}%`,
        top:   `${(validPlacement.y / CANVAS_H) * 100}%`,
        // Displayed width on the canvas = scale × natural width; as a fraction
        // of the mockup that's (scale × 1024 / 400). e.g. 0.08 → 20.5%.
        width: `${(validPlacement.scale * NATURAL_W / CANVAS_W) * 100}%`,
        aspectRatio: "1",
        transform: "translate(-50%, -50%)",
      }
    : { position: "absolute", ...TSHIRT_PRINT_AREA };

  return (
    <div className={`${wrapperClass} bg-zinc-50 dark:bg-zinc-800`}>
      <Image
        src="/mockups/tshirt-white.svg"
        alt=""
        aria-hidden
        fill
        unoptimized
        loading={loading}
        className="object-contain"
      />
      <div style={designStyle}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={MOCKUP_SIZES}
          loading={loading}
          className="object-contain"
        />
      </div>
    </div>
  );
}
