"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/app/marketplace/like-actions";

interface LikeButtonProps {
  designId: string;
  initialLiked: boolean;
  initialCount: number;
  /** "card" = compact icon+count, "detail" = larger pill on the product page */
  variant?: "card" | "detail";
}

export default function LikeButton({
  designId,
  initialLiked,
  initialCount,
  variant = "card",
}: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();

  // Optimistic state: flip liked + ±1 count immediately
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (_current, next: { liked: boolean; count: number }) => next,
  );

  function handleClick(e: React.MouseEvent) {
    e.preventDefault(); // card is often inside a <Link>
    e.stopPropagation();

    const nextLiked = !optimistic.liked;
    const nextCount = optimistic.count + (nextLiked ? 1 : -1);

    startTransition(async () => {
      setOptimistic({ liked: nextLiked, count: nextCount });
      await toggleLike(designId);
      // On error the optimistic value snaps back automatically when the
      // transition settles — useOptimistic resets to the current real state.
    });
  }

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={optimistic.liked ? "Unlike this design" : "Like this design"}
        className={`
          group flex items-center gap-2 rounded-full border-2 px-5 py-2.5
          text-sm font-extrabold transition-all duration-150
          disabled:cursor-not-allowed
          ${optimistic.liked
            ? "border-brand-orange bg-brand-orange text-white"
            : "border-ink bg-paper text-ink hover:border-brand-orange hover:text-brand-orange dark:bg-zinc-900"
          }
        `}
      >
        <HeartIcon filled={optimistic.liked} className="h-4 w-4 transition-transform duration-150 group-active:scale-125" />
        <span>{optimistic.count > 0 ? optimistic.count : ""}</span>
        <span>{optimistic.liked ? "Liked" : "Like"}</span>
      </button>
    );
  }

  // card variant — compact, sits in the corner of a product card
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={optimistic.liked ? "Unlike" : "Like"}
      className={`
        group flex items-center gap-1 rounded-full px-2 py-1
        text-xs font-semibold transition-all duration-150
        disabled:cursor-not-allowed
        ${optimistic.liked
          ? "text-brand-orange"
          : "text-zinc-400 hover:text-brand-orange dark:text-zinc-500"
        }
      `}
    >
      <HeartIcon
        filled={optimistic.liked}
        className="h-3.5 w-3.5 transition-transform duration-150 group-active:scale-125"
      />
      {optimistic.count > 0 && <span>{optimistic.count}</span>}
    </button>
  );
}

/* ── Heart SVG ── */

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      style={{ transition: "transform 0.12s cubic-bezier(.34,1.56,.64,1)" }}
    >
      {filled ? (
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        />
      )}
    </svg>
  );
}
