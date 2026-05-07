/**
 * Composites a design image onto a product mockup so buyers see the design
 * on the actual product, not as raw artwork.
 *
 * Currently only the "T-shirt" product type has a mockup. Other product
 * types (Hoodie, Sweatshirt, Tote bag) fall back to the raw artwork until
 * their mockups are added.
 */

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
        {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
        <img
          src={imageUrl}
          alt={alt}
          className="block h-full w-full object-cover"
          loading={loading}
          decoding="async"
        />
      </div>
    );
  }

  // T-shirt: layer design over the chest of the t-shirt mockup
  return (
    <div className={`${wrapperClass} bg-zinc-50 dark:bg-zinc-800`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local static SVG asset */}
      <img
        src="/mockups/tshirt-white.svg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full"
        loading={loading}
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
      <img
        src={imageUrl}
        alt={alt}
        className="absolute object-cover"
        style={TSHIRT_PRINT_AREA}
        loading={loading}
        decoding="async"
      />
    </div>
  );
}
