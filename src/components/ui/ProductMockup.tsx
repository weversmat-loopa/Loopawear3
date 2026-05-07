/**
 * Composites a design image onto a product mockup so buyers see the design
 * on the actual product, not as raw artwork.
 *
 * Currently only the "T-shirt" product type has a mockup. Other product
 * types (Hoodie, Sweatshirt, Tote bag) fall back to the raw artwork until
 * their mockups are added.
 */

import Image from "next/image";

interface ProductMockupProps {
  imageUrl: string | null;
  productType: string | null;
  alt: string;
  /** Hint to the browser about resource priority. Defaults to "lazy". */
  loading?: "lazy" | "eager";
  /** Optional classes applied to the outer wrapper (e.g. hover transforms). */
  className?: string;
}

// Print area expressed as percentages of the wrapper, aligned to the chest
// region of /public/mockups/tshirt-white.svg (viewBox 0 0 400 400).
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

  // T-shirt: layer design over the chest of the t-shirt mockup
  return (
    <div className={`${wrapperClass} bg-zinc-50 dark:bg-zinc-800`}>
      <Image
        src="/mockups/tshirt-white.svg"
        alt=""
        aria-hidden
        fill
        // The mockup SVG is a tiny local asset; skip the optimizer rather
        // than enabling dangerouslyAllowSVG globally for one file.
        unoptimized
        loading={loading}
        className="object-contain"
      />
      <div className="absolute" style={TSHIRT_PRINT_AREA}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={MOCKUP_SIZES}
          loading={loading}
          className="object-cover"
        />
      </div>
    </div>
  );
}
