import Image from "next/image";

interface ProfileBannerProps {
  bannerUrl: string | null;
  displayName: string;
}

/**
 * Full-width banner at the top of a creator profile.
 * Shows a textured fallback if no image is set.
 */
export default function ProfileBanner({ bannerUrl, displayName }: ProfileBannerProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "5/2", maxHeight: "320px" }}>
      {bannerUrl ? (
        <Image
          src={bannerUrl}
          alt={`${displayName} banner`}
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover object-center"
        />
      ) : (
        /* Fallback: diagonal-stripe pattern in brand colours */
        <div
          className="h-full w-full opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, var(--blue) 0px, var(--blue) 2px, transparent 2px, transparent 20px)",
          }}
        />
      )}
    </div>
  );
}
