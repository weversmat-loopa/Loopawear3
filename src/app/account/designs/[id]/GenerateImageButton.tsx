"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GenerateImageButtonProps {
  designId: string;
  imageStatus: string | null;
  colorPalette?: string | null;
  secondary?: boolean;
}

export default function GenerateImageButton({
  designId,
  imageStatus,
  colorPalette = null,
  secondary = false,
}: GenerateImageButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGenerating = imageStatus === "generating";
  const canGenerate =
    !isLoading &&
    !isGenerating &&
    (imageStatus === "none" ||
      imageStatus === null ||
      imageStatus === "failed" ||
      imageStatus === "ready");

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/designs/${designId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorPalette }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          body.error === "already_generating"
            ? "Generation already in progress."
            : "Generation failed. Please try again.";
        setError(msg);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const label = isLoading
    ? "Starting…"
    : isGenerating
      ? "Generating…"
      : imageStatus === "failed"
        ? "Retry generation"
        : imageStatus === "ready"
          ? "Regenerate"
          : "Generate image";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={
          secondary
            ? `rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                canGenerate
                  ? "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                  : "cursor-not-allowed border-zinc-800 text-zinc-600"
              }`
            : `rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity ${
                canGenerate ? "hover:opacity-75" : "cursor-not-allowed opacity-40"
              }`
        }
      >
        {label}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!secondary && canGenerate && !error && (
        <p className="text-xs text-zinc-600">
          Generates a unique AI image for this design based on your prompt,
          product type, and style.
        </p>
      )}
    </div>
  );
}
