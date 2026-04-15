"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GenerateImageButtonProps {
  designId: string;
  imageStatus: string | null;
}

export default function GenerateImageButton({
  designId,
  imageStatus,
}: GenerateImageButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGenerating = imageStatus === "generating";
  const canGenerate =
    !isLoading &&
    !isGenerating &&
    (imageStatus === "none" || imageStatus === null || imageStatus === "failed");

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/designs/${designId}/generate`, {
        method: "POST",
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

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={`rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity ${
          canGenerate ? "hover:opacity-75" : "cursor-not-allowed opacity-40"
        }`}
      >
        {isLoading
          ? "Starting…"
          : isGenerating
            ? "Generating…"
            : imageStatus === "failed"
              ? "Retry generation"
              : "Generate image"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {canGenerate && !error && (
        <p className="text-xs text-zinc-600">
          Generates a unique AI image for this design based on your prompt,
          product type, and style.
        </p>
      )}
    </div>
  );
}
