"use client";

import Link from "next/link";
import { useState } from "react";
import { saveDraft } from "./actions";

const PRODUCT_TYPES = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;
const STYLE_MOODS = ["Minimal", "Bold", "Vintage", "Abstract", "Graphic"] as const;
const COLOR_PALETTES = ["Monochrome", "Two-tone", "Full color"] as const;

type ProductType = (typeof PRODUCT_TYPES)[number] | null;
type StyleMood = (typeof STYLE_MOODS)[number] | null;
type ColorPalette = (typeof COLOR_PALETTES)[number] | null;

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "generating"; id: string }
  | { status: "generated"; id: string; imageUrl: string }
  | { status: "generate_failed"; id: string }
  | { status: "credits_exhausted" }
  | { status: "auth_required" }
  | { status: "save_failed" };

interface GenerateStudioProps {
  initialPrompt?: string;
  initialProductType?: string | null;
  initialStyle?: string | null;
  initialColorPalette?: string | null;
  initialDesignId?: string | null;
}

export default function GenerateStudio({
  initialPrompt = "",
  initialProductType = null,
  initialStyle = null,
  initialColorPalette = null,
  initialDesignId = null,
}: GenerateStudioProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [productType, setProductType] = useState<ProductType>(
    PRODUCT_TYPES.includes(initialProductType as (typeof PRODUCT_TYPES)[number])
      ? (initialProductType as ProductType)
      : null
  );
  const [styleMood, setStyleMood] = useState<StyleMood>(
    STYLE_MOODS.includes(initialStyle as (typeof STYLE_MOODS)[number])
      ? (initialStyle as StyleMood)
      : null
  );
  const [colorPalette, setColorPalette] = useState<ColorPalette>(
    COLOR_PALETTES.includes(initialColorPalette as (typeof COLOR_PALETTES)[number])
      ? (initialColorPalette as ColorPalette)
      : null
  );
  const [designId, setDesignId] = useState<string | null>(initialDesignId);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const isWorking =
    saveState.status === "saving" || saveState.status === "generating";
  const creditsExhausted = saveState.status === "credits_exhausted";

  function resetSaveState() {
    if (saveState.status !== "idle" && saveState.status !== "generating") {
      setSaveState({ status: "idle" });
    }
  }

  function resetForm() {
    setPrompt("");
    setProductType(null);
    setStyleMood(null);
    setColorPalette(null);
    setDesignId(null);
    setSaveState({ status: "idle" });
  }

  async function handleGenerate(id: string) {
    setSaveState({ status: "generating", id });

    try {
      const res = await fetch(`/api/designs/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorPalette }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        if (errBody.error === "credits_exhausted") {
          setSaveState({ status: "credits_exhausted" });
        } else {
          setSaveState({ status: "generate_failed", id });
        }
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        imageUrl?: string;
      };
      if (body.imageUrl) {
        setSaveState({ status: "generated", id, imageUrl: body.imageUrl });
      } else {
        setSaveState({ status: "generate_failed", id });
      }
    } catch {
      setSaveState({ status: "generate_failed", id });
    }
  }

  async function handleDownload() {
    if (saveState.status !== "generated") return;
    try {
      const res = await fetch(saveState.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "design.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(saveState.imageUrl, "_blank");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState({ status: "saving" });

    const result = await saveDraft({ prompt, productType, styleMood, designId });

    if (result.error === "auth_required") {
      setSaveState({ status: "auth_required" });
      return;
    }
    if (result.error === "save_failed") {
      setSaveState({ status: "save_failed" });
      return;
    }
    if (result.id) {
      setDesignId(result.id);
      await handleGenerate(result.id);
    }
  }

  function buttonLabel() {
    if (saveState.status === "saving") return "Saving…";
    if (saveState.status === "generating") return "Generating…";
    if (saveState.status === "generated") return "Regenerate";
    if (saveState.status === "generate_failed") return "Retry";
    return "Generate";
  }

  // --- Canvas ---

  const canvas =
    saveState.status === "generating" ? (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-violet-100 dark:bg-violet-900/40" />
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500 dark:border-zinc-700 dark:border-t-zinc-300" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Generating your design…</p>
            <p className="text-xs text-zinc-400">This may take a moment.</p>
          </div>
        </div>
      </div>
    ) : saveState.status === "generated" ? (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
        <img
          src={saveState.imageUrl}
          alt={productType ? `${productType} design` : "Generated design"}
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
        <div className="flex items-center justify-between border-t border-zinc-100 bg-white px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-5">
            <Link
              href={`/account/designs/${saveState.id}${colorPalette ? `?color_palette=${encodeURIComponent(colorPalette)}` : ""}`}
              className="text-sm font-medium text-zinc-900 transition-colors hover:text-violet-600 dark:text-zinc-100"
            >
              Open workspace →
            </Link>
            <a
              href={saveState.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Full size ↗
            </a>
            <button
              type="button"
              onClick={handleDownload}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Download ↓
            </button>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            New design
          </button>
        </div>
      </div>
    ) : saveState.status === "generate_failed" ? (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Generation failed</p>
        <p className="text-xs text-zinc-400">Something went wrong. You can try again.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => handleGenerate(saveState.id)}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
          >
            Retry
          </button>
          <Link
            href={`/account/designs/${saveState.id}${colorPalette ? `?color_palette=${encodeURIComponent(colorPalette)}` : ""}`}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
          >
            Open workspace →
          </Link>
        </div>
      </div>
    ) : creditsExhausted ? (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No generation credits remaining</p>
        <p className="text-xs text-zinc-400">You&apos;ve used all your available credits.</p>
      </div>
    ) : (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-400">Your design will appear here</p>
        <p className="text-xs text-zinc-300 dark:text-zinc-600">Describe your vision and click Generate</p>
      </div>
    );

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-18">
      <div className="mx-auto w-full max-w-5xl">

        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Design Studio
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {saveState.status === "generated"
              ? "Adjust your prompt or options and regenerate."
              : saveState.status === "generate_failed"
              ? "Something went wrong. Adjust your prompt or retry."
              : "Describe your vision and generate the artwork."}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[1fr_340px] lg:gap-10">

          {/* Canvas — flex-col-reverse pushes it below controls on mobile; lg:grid restores left-column position on desktop */}
          <div className="lg:self-start lg:sticky lg:top-10">
            {canvas}
          </div>

          {/* Controls panel */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:p-7 dark:border-zinc-700 dark:bg-zinc-900">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="prompt"
                  className="text-xs font-medium uppercase tracking-widest text-zinc-400"
                >
                  Prompt
                </label>
                <textarea
                  id="prompt"
                  name="prompt"
                  rows={4}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    resetSaveState();
                  }}
                  placeholder="Describe what you want to create..."
                  className="mt-2.5 w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-violet-400/60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>

              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                  Style
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STYLE_MOODS.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => {
                        setStyleMood(styleMood === style ? null : style);
                        resetSaveState();
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        styleMood === style
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                  Colors
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette}
                      type="button"
                      onClick={() => {
                        setColorPalette(colorPalette === palette ? null : palette);
                        resetSaveState();
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        colorPalette === palette
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                      }`}
                    >
                      {palette}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                  Product
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRODUCT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setProductType(productType === type ? null : type);
                        resetSaveState();
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        productType === type
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {saveState.status === "auth_required" && (
                <p className="text-sm text-zinc-500">
                  <Link
                    href="/login"
                    className="text-zinc-900 underline underline-offset-2 transition-colors hover:text-violet-600 dark:text-zinc-100"
                  >
                    Sign in
                  </Link>{" "}
                  to generate and save designs.
                </p>
              )}

              {creditsExhausted && (
                <p className="text-sm text-zinc-500">
                  You&apos;ve used all your generation credits.
                </p>
              )}

              {saveState.status === "save_failed" && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  Something went wrong. Please try again.
                </p>
              )}

              {saveState.status === "generated" ? (
                <div className="space-y-4 border-t border-zinc-100 pt-6">
                  <div>
                    <Link
                      href={`/account/designs/${saveState.id}${colorPalette ? `?color_palette=${encodeURIComponent(colorPalette)}` : ""}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                      Open in workspace →
                    </Link>
                    <p className="mt-2 text-xs text-zinc-400">
                      Manage and publish this design from your workspace.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={!prompt.trim() || isWorking || creditsExhausted}
                      className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
                    >
                      {buttonLabel()}
                    </button>
                    <span className="text-xs text-zinc-400">
                      Not happy? Adjust and try again.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isWorking || creditsExhausted}
                    className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    {buttonLabel()}
                  </button>
                </div>
              )}
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
