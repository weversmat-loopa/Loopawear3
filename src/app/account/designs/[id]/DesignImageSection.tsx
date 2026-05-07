"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelStuckGeneration } from "@/app/account/actions";

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
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <Image
            src={imageUrl}
            alt={productType ? `${productType} design` : "Generated design"}
            width={1024}
            height={1024}
            sizes="(min-width: 768px) 480px, 100vw"
            className="block h-auto w-full opacity-25"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Generating new image…</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">This may take a moment.</p>
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
        <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Generating image…</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">This may take a moment.</p>
          </div>
        </div>
        <div className="mt-4" />
      </div>
    );
  }

  // Server state: ready with image
  const imageArea =
    imageStatus === "ready" && imageUrl ? (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
        <Image
          src={imageUrl}
          alt={productType ? `${productType} design` : "Generated design"}
          width={1024}
          height={1024}
          sizes="(min-width: 768px) 480px, 100vw"
          className="block h-auto w-full"
        />
      </div>
    ) : serverGenerating ? (
      <div className="flex aspect-square w-full animate-pulse items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Generating image…</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">This may take a moment.</p>
        </div>
      </div>
    ) : imageStatus === "failed" ? (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Generation failed</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Something went wrong. You can try again below.
          </p>
        </div>
      </div>
    ) : imageStatus === "ready" && !imageUrl ? (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-400">Image unavailable</p>
      </div>
    ) : (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-400">No image generated yet</p>
      </div>
    );

  // --- Action row ---

  const actionRow = anyGenerating ? null : imageStatus === "ready" ? (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="rounded-full border border-zinc-200 px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
      >
        Regenerate
      </button>
      <Link
        href={refineHref}
        className="text-sm text-zinc-500 transition-colors hover:text-violet-600"
      >
        Refine in studio →
      </Link>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  ) : (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors dark:bg-white dark:text-zinc-900 ${
            canGenerate ? "hover:bg-zinc-700 dark:hover:bg-zinc-100" : "cursor-not-allowed opacity-40"
          }`}
        >
          {imageStatus === "failed" ? "Retry generation" : "Generate image"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {canGenerate && !error && (
          <p className="text-xs text-zinc-400">
            Generates a unique AI image for this design based on your prompt,
            product type, and style.
          </p>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Want to change the prompt first?{" "}
        <Link
          href={refineHref}
          className="text-zinc-500 underline underline-offset-2 transition-colors hover:text-violet-600"
        >
          Refine in studio →
        </Link>
      </p>
    </div>
  );

  // Recovery row: shown when the server reports generating but nothing is
  // actively running client-side — lets the user escape a stuck state.
  const stuckRecoveryRow = serverGenerating && !isGenerating ? (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <p className="text-xs text-zinc-400">Taking longer than expected?</p>
      <form action={cancelStuckGeneration}>
        <input type="hidden" name="designId" value={designId} />
        <button
          type="submit"
          className="text-xs text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Cancel and retry
        </button>
      </form>
    </div>
  ) : null;

  return (
    <div>
      {imageArea}
      {actionRow && <div className="mt-4">{actionRow}</div>}
      {stuckRecoveryRow}
    </div>
  );
}
