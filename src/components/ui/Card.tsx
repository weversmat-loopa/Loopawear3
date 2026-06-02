/**
 * Generic content card with the Loopawear hard-ink border. Straight by
 * default (no skew) so it stays clean for product-adjacent content.
 */
export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`ink-card rounded-2xl bg-paper p-6 ${className}`.trim()}>
      {children}
    </div>
  );
}
