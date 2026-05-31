"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { saveDraft } from "./actions";

const PlacementEditor = dynamic(() => import("./PlacementEditor"), {
  ssr: false,
  loading: () => (
    <div className="mt-12 border-t border-zinc-100 pt-12 dark:border-zinc-800">
      <div className="h-6 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mt-4 h-[480px] w-[400px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
    </div>
  ),
});

const PRODUCT_TYPES = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;
const STYLE_MOODS   = ["Minimal", "Bold", "Vintage", "Abstract", "Graphic"] as const;
const COLOR_PALETTES = ["Monochrome", "Two-tone", "Full color"] as const;

const EXAMPLE_PROMPTS = [
  "Vintage wolf howling at moon, gothic style",
  "Minimal Japanese wave pattern",
  "Retro space astronaut, 70s poster",
  "Abstract geometric shapes",
  "Neon cyberpunk cityscape",
  "Cute cartoon bear with sunglasses",
] as const;

type ProductType  = (typeof PRODUCT_TYPES)[number]  | null;
type StyleMood    = (typeof STYLE_MOODS)[number]    | null;
type ColorPalette = (typeof COLOR_PALETTES)[number] | null;

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "generating";     id: string }
  | { status: "generated";      id: string; imageUrl: string }
  | { status: "generate_failed"; id: string }
  | { status: "prompt_rejected"; id: string }
  | { status: "credits_exhausted" }
  | { status: "auth_required" }
  | { status: "save_failed" };

interface GenerateStudioProps {
  initialPrompt?:       string;
  initialProductType?:  string | null;
  initialStyle?:        string | null;
  initialColorPalette?: string | null;
  initialDesignId?:     string | null;
}

export default function GenerateStudio({
  initialPrompt       = "",
  initialProductType  = null,
  initialStyle        = null,
  initialColorPalette = null,
  initialDesignId     = null,
}: GenerateStudioProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [productType, setProductType] = useState<ProductType>(
    PRODUCT_TYPES.includes(initialProductType as (typeof PRODUCT_TYPES)[number])
      ? (initialProductType as ProductType)
      : null
  );

  // Style and colour palette are kept for API compatibility with existing
  // designs but are not exposed in the UI — the AI handles them implicitly.
  const styleMood: StyleMood = STYLE_MOODS.includes(
    initialStyle as (typeof STYLE_MOODS)[number]
  )
    ? (initialStyle as StyleMood)
    : null;

  const colorPalette: ColorPalette = COLOR_PALETTES.includes(
    initialColorPalette as (typeof COLOR_PALETTES)[number]
  )
    ? (initialColorPalette as ColorPalette)
    : null;

  const [designId,  setDesignId]  = useState<string | null>(initialDesignId);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);
  const [imgLoaded,    setImgLoaded]    = useState(false);

  const isWorking =
    saveState.status === "saving" || saveState.status === "generating";
  const creditsExhausted = saveState.status === "credits_exhausted";
  const authRequired     = saveState.status === "auth_required";

  function resetSaveState() {
    if (saveState.status !== "idle" && saveState.status !== "generating") {
      setSaveState({ status: "idle" });
    }
  }

  function resetForm() {
    setPrompt("");
    setProductType(null);
    setDesignId(null);
    setSaveState({ status: "idle" });
  }

  async function handleGenerate(id: string) {
    setImgLoaded(false);
    setSaveState({ status: "generating", id });

    try {
      const res = await fetch(`/api/designs/${id}/generate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ colorPalette }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        if      (errBody.error === "credits_exhausted") setSaveState({ status: "credits_exhausted" });
        else if (errBody.error === "prompt_rejected")   setSaveState({ status: "prompt_rejected", id });
        else                                             setSaveState({ status: "generate_failed", id });
        return;
      }

      const body = await res.json().catch(() => ({})) as { imageUrl?: string };
      if (body.imageUrl) {
        setLastImageUrl(body.imageUrl);
        setSaveState({ status: "generated", id, imageUrl: body.imageUrl });
      } else {
        setSaveState({ status: "generate_failed", id });
      }
    } catch {
      setSaveState({ status: "generate_failed", id });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState({ status: "saving" });

    const result = await saveDraft({ prompt, productType, styleMood, designId });

    if (result.error === "auth_required") { setSaveState({ status: "auth_required" }); return; }
    if (result.error === "save_failed")   { setSaveState({ status: "save_failed" });   return; }
    if (result.id) {
      setDesignId(result.id);
      await handleGenerate(result.id);
    }
  }

  function generateButtonLabel() {
    if (saveState.status === "saving")           return "Saving…";
    if (saveState.status === "generating")       return "Generating…";
    if (saveState.status === "generate_failed")  return "Retry";
    if (saveState.status === "prompt_rejected")  return "Try again";
    return "Generate";
  }

  // ── Canvas ──────────────────────────────────────────────────────────
  const isRegenerating =
    (saveState.status === "saving" || saveState.status === "generating") &&
    lastImageUrl !== null;

  const canvas =
    isRegenerating ? (
      <div className="relative overflow-hidden rounded-2xl">
        <Image
          src={lastImageUrl}
          alt={productType ? `${productType} design` : "Previous design"}
          width={1024}
          height={1024}
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="block h-auto w-full"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="text-xs font-medium text-white/80">Generating…</span>
        </div>
      </div>
    ) : saveState.status === "generating" ? (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-sm text-zinc-400">Generating your design…</p>
        </div>
      </div>
    ) : saveState.status === "generated" ? (
      <div className="overflow-hidden rounded-2xl">
        <Image
          src={saveState.imageUrl}
          alt={productType ? `${productType} design` : "Generated design"}
          width={1024}
          height={1024}
          sizes="(min-width: 1024px) 60vw, 100vw"
          onLoad={() => setImgLoaded(true)}
          className={`block h-auto w-full transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    ) : saveState.status === "prompt_rejected" ? (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-50 p-8 text-center dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Prompt couldn&apos;t be processed
        </p>
        <p className="max-w-xs text-xs text-zinc-400">
          Your prompt was flagged by our content safety check. Please revise
          the wording and try again.
        </p>
      </div>
    ) : saveState.status === "generate_failed" ? (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-50 p-8 text-center dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Generation failed</p>
        <p className="text-xs text-zinc-400">
          Something went wrong. Adjust your prompt or click Retry.
        </p>
      </div>
    ) : creditsExhausted ? (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-50 p-8 text-center dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          No generation credits remaining
        </p>
        <p className="text-xs text-zinc-400">You&apos;ve used all your available credits.</p>
      </div>
    ) : (
      <div className="flex aspect-square w-full flex-col items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900">
        <p className="text-sm text-zinc-300 dark:text-zinc-700">
          Your design will appear here
        </p>
      </div>
    );

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <main className="flex flex-1 flex-col px-6 py-16 md:py-20">
      <div className="mx-auto w-full max-w-6xl">

        <div className="mb-12">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            Design Studio
          </h1>
          <p className="mt-2 text-base text-zinc-400 dark:text-zinc-500">
            Type a prompt, hit Generate. Your design is ready in seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-16">

            {/* ── Left: controls ────────────────────────────────── */}
            <div className="flex flex-col gap-7">

              {/* Prompt textarea */}
              <div className="rounded-2xl border border-zinc-200 transition-colors focus-within:border-zinc-400 dark:border-zinc-800 dark:focus-within:border-zinc-600">
                <textarea
                  id="prompt"
                  name="prompt"
                  rows={5}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    resetSaveState();
                  }}
                  placeholder="Describe your design... e.g. 'vintage wolf howling at moon, gothic style'"
                  className="w-full resize-none bg-transparent px-5 py-5 text-base leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                />
              </div>

              {/* Example prompt chips */}
              <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setPrompt(example);
                      resetSaveState();
                    }}
                    className="flex-none rounded-full border border-zinc-200 px-3.5 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                  >
                    {example}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

              {/* Product type */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                  Product
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setProductType(productType === type ? null : type);
                        resetSaveState();
                      }}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                        productType === type
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status messages */}
              {authRequired && (
                <p className="text-sm text-zinc-500">
                  <Link
                    href="/login"
                    className="text-zinc-900 underline underline-offset-2 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
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
                  Something went wrong saving your draft. Please try again.
                </p>
              )}

              {/* Generate button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isWorking || creditsExhausted || authRequired}
                className="w-full rounded-2xl bg-zinc-900 py-4 text-base font-bold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                {generateButtonLabel()}
              </button>
            </div>

            {/* ── Right: image preview ───────────────────────────── */}
            <div className="lg:sticky lg:top-10">
              {canvas}

              {saveState.status === "generated" && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  <Link
                    href={`/account/designs/${saveState.id}${colorPalette ? `?color_palette=${encodeURIComponent(colorPalette)}` : ""}`}
                    className="text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-500 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    Open in workspace →
                  </Link>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isWorking}
                    className="text-sm text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-40 dark:hover:text-zinc-100"
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    New design
                  </button>
                </div>
              )}
            </div>

          </div>
        </form>

        {/* Placement editor — shown after a successful generation */}
        {saveState.status === "generated" && (
          <PlacementEditor
            imageUrl={saveState.imageUrl}
            designId={saveState.id}
          />
        )}

      </div>
    </main>
  );
}
