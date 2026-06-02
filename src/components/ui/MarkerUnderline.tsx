/**
 * Wraps text in a hand-drawn marker highlight. Use for emphasising a
 * single word or short phrase inside a heading.
 *
 *   Wear what <MarkerUnderline>you imagine</MarkerUnderline>.
 */
export default function MarkerUnderline({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`marker-underline ${className}`.trim()}>{children}</span>
  );
}
