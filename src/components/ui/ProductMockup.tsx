/**
 * Composites a design image onto a product mockup so buyers see the design
 * on the actual product, not as raw artwork.
 *
 * Currently only the "T-shirt" product type has a mockup. Other product
 * types (Hoodie, Sweatshirt, Tote bag) fall back to the raw artwork until
 * their mockups are added.
 */

import Image from "next/image";

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
}

// Canvas dimensions used by PlacementEditor. x coordinates are in a 400px
// wide space; y coordinates are in a 480px tall space. The mockup wrapper is
// square (aspect-square), so x and y are divided by their respective canvas
// dimensions to produce correct percentage positions.
const CANVAS_W = 400;
const CANVAS_H = 480;

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
}: ProductMockupProps) {
  const wrapperClass = `relative aspect-square w-full overflow-hidden ${className ?? ""}`.trim();

  // Empty state — design has no image yet
  if (!imageUrl) {
    return (
      <div className={`${wrapperClass} bg-zinc-100 dark:bg-zinc-800`} aria-hidden />
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
        left:  `${(validPlacement.x / CANVAS_W) * 100}%`,
        top:   `${(validPlacement.y / CANVAS_H) * 100}%`,
        width: `${(validPlacement.scale * CANVAS_W) / 1024 * 100}%`,
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
