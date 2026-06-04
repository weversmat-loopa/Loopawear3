import Image from "next/image";

interface ProfileAvatarProps {
  avatarUrl: string | null;
  displayName: string;
  /** Size in pixels (square). Default: 64 */
  size?: number;
  className?: string;
}

/**
 * Round avatar with fallback initials.
 * Pure display component — no upload logic here.
 */
export default function ProfileAvatar({
  avatarUrl,
  displayName,
  size = 64,
  className = "",
}: ProfileAvatarProps) {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizeClass = `h-[${size}px] w-[${size}px]`;

  return (
    <div
      className={`ink-card relative shrink-0 overflow-hidden rounded-full bg-brand-blue ${className}`}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`${displayName} avatar`}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-display text-white select-none"
          style={{ fontSize: Math.round(size * 0.38) }}
          aria-hidden="true"
        >
          {initials || "?"}
        </span>
      )}
    </div>
  );
}
