/**
 * A highlight block styled like a scrap of ruled/grid paper held down with
 * a strip of washi tape. Used sparingly for callouts and brand moments —
 * never around product cards.
 */
export default function TapeBlock({
  children,
  className = "",
  rotate = "-1deg",
}: {
  children: React.ReactNode;
  className?: string;
  /** Slight skew to keep it looking hand-placed. */
  rotate?: string;
}) {
  return (
    <div
      className={`tape ink-card relative rounded-xl p-6 ${className}`.trim()}
      style={{ transform: `rotate(${rotate})` }}
    >
      {children}
    </div>
  );
}
