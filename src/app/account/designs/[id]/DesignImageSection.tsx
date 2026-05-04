"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface DesignImageSectionProps {
  designId: string;
  imageStatus: string | null;
  imageUrl: string | null;
  productType: string | null;
  colorPalette: string | null;
  refineHref: string;
}

export default function DesignImageSection({
  designId,
  imageStatus,
  imageUrl,
  productType,
  colorPalette,
  refineHref,
}: DesignImageSectionProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serverGenerating = imageStatus === "generating";
  const anyGenerating = isGenerating || serverGenerating;

  const canGenerate =
    !isGenerating &&
    !serverGenerating &&
    (imageStatus === "none" ||
      imageStatus === null ||
      imageStatus === "failed" ||
      imageStatus === "ready");

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/designs/${designId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorPalette }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error === "already_generating"
            ? "Generation already in progress."
            : body.error === "credits_exhausted"
            ? "You've used all your generation credits."
            : "Generation failed. Please try again."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  // --- Image area ---

  // Client-side generating with existing image: dim + spinner overlay
  if (isGenerating && imageUrl) {
    return (
      <div>
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/60">
          {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
          <img
            src={imageUrl}
            alt={productType ? `${productType} design` : "Generated design"}
            className="block h-auto w-full opacity-25"
            decoding="async"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200" />
            <p className="text-sm font-medium text-zinc-300">Generating new image…</p>
            <p className="text-xs text-zinc-600">This may take a moment.</p>
          </div>
        </div>
        <div className="mt-4" />
      </div>
    );
  }

  // Client-side generating without an existing image: animated placeholder
  if (isGenerating) {
    return (
      <div>
        <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-950 to-black">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
            <p className="text-sm font-medium text-zinc-400">Generating image…</p>
            <p className="text-xs text-zinc-600">This may take a moment.</p>
          </div>
        </div>
        <div className="mt-4" />
      </div>
    );
  }

  // Server state: ready with image
  const imageArea =
    imageStatus === "ready" && imageUrl ? (
      <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
        {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
        <img
          src={imageUrl}
          alt={productType ? `${productType} design` : "Generated design"}
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      </div>
    ) : serverGenerating ? (
      <div className="flex aspect-square w-full animate-pulse items-center justify-center rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-950 to-black">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">Generating image…</p>
          <p className="mt-1 text-xs text-zinc-600">This may take a moment.</p>
        </div>
      </div>
    ) : imageStatus === "failed" ? (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-950 to-black">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-500">Generation failed</p>
          <p className="mt-1 text-xs text-zinc-700">
            Something went wrong. You can try again below.
          </p>
        </div>
      </div>
    ) : imageStatus === "ready" && !imageUrl ? (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-zinc-800/60 bg-gradient-to-b from-zinc-950 to-black">
        <p className="text-sm text-zinc-600">Image unavailable</p>
      </div>
    ) : (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-zinc-800/60 bg-gradient-to-b from-zinc-950 to-black">
        <p className="text-sm text-zinc-600">No image generated yet</p>
      </div>
    );

  // --- Action row ---

  const actionRow = anyGenerating ? null : imageStatus === "ready" ? (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Regenerate
      </button>
      <Link
        href={refineHref}
        className="text-sm text-zinc-500 transition-colors hover:text-white"
      >
        Refine in studio →
      </Link>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  ) : (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity ${
            canGenerate ? "hover:opacity-75" : "cursor-not-allowed opacity-40"
          }`}
        >
          {imageStatus === "failed" ? "Retry generation" : "Generate image"}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {canGenerate && !error && (
          <p className="text-xs text-zinc-600">
            Generates a unique AI image for this design based on your prompt,
            product type, and style.
          </p>
        )}
      </div>
      <p className="text-xs text-zinc-700">
        Want to change the prompt first?{" "}
        <Link
          href={refineHref}
          className="text-zinc-500 underline underline-offset-2 transition-colors hover:text-white"
        >
          Refine in studio →
        </Link>
      </p>
    </div>
  );

  return (
    <div>
      {imageArea}
      {actionRow && <div className="mt-4">{actionRow}</div>}
    </div>
  );
}
