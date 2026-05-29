"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { saveDraft } from "./actions";

const PRODUCT_TYPES = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;
const STYLE_MOODS = ["Minimal", "Bold", "Vintage", "Abstract", "Graphic"] as const;
const COLOR_PALETTES = ["Monochrome", "Two-tone", "Full color"] as const;

const EXAMPLE_PROMPTS = [
  "A vintage sunset over mountains",
  "Minimal Japanese wave pattern",
  "Retro space astronaut",
  "Abstract geometric shapes",
  "Neon cyberpunk cityscape",
  "Cute cartoon bear",
] as const;

type ProductType = (typeof PRODUCT_TYPES)[number] | null;
type StyleMood = (typeof STYLE_MOODS)[number] | null;
type ColorPalette = (typeof COLOR_PALETTES)[number] | null;

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "generating"; id: string }
  | { status: "generated"; id: string; imageUrl: string }
  | { status: "generate_failed"; id: string }
  | { status: "prompt_rejected"; id: string }
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
  const [userHasTypedPrompt, setUserHasTypedPrompt] = useState(
    initialPrompt.length > 0
  );

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
    setUserHasTypedPrompt(false);
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
        } else if (errBody.error === "prompt_rejected") {
          setSaveState({ status: "prompt_rejected", id });
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
    if (saveState.status === "prompt_rejected") return "Try again";
    return "Generate";
  }

  // --- Canvas ---

  const canvas =
    saveState.status === "generating" ? (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-800 border-t-violet-500" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-zinc-300">Generating your design…</p>
            <p className="text-xs text-zinc-600">This may take a moment.</p>
          </div>
        </div>
      </div>
    ) : saveState.status === "generated" ? (
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <Image
          src={saveState.imageUrl}
          alt={productType ? `${productType} design` : "Generated design"}
          width={1024}
          height={1024}
          sizes="(min-width: 1024px) 480px, 100vw"
          className="block h-auto w-full"
        />
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-5 py-3.5">
          <div className="flex items-center gap-5">
            <Link
              href={`/account/designs/${saveState.id}${colorPalette ? `?color_palette=${encodeURIComponent(colorPalette)}` : ""}`}
              className="text-sm font-medium text-zinc-100 transition-colors hover:text-violet-400"
            >
              Open workspace →
            </Link>
            <a
              href={saveState.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Full size ↗
            </a>
            <button
              type="button"
              onClick={handleDownload}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Download ↓
            </button>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
          >
            New design
          </button>
        </div>
      </div>
    ) : saveState.status === "prompt_rejected" ? (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center">
        <p className="text-sm font-medium text-zinc-300">
          Prompt couldn&apos;t be processed
        </p>
        <p className="max-w-xs text-xs text-zinc-600">
          Your prompt was flagged by our content safety check. Please revise
          the wording and try again.
        </p>
      </div>
    ) : saveState.status === "generate_failed" ? (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center">
        <p className="text-sm font-medium text-zinc-300">Generation failed</p>
        <p className="text-xs text-zinc-600">Something went wrong. You can try again.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => handleGenerate(saveState.id)}
            className="rounded-full border border-zinc-800 px-5 py-2 text-sm font-medium text-zinc-400 transition-all duration-300 hover:border-zinc-600 hover:text-zinc-100"
          >
            Retry
          </button>
          <Link
            href={`/account/designs/${saveState.id}${colorPalette ? `?color_palette=${encodeURIComponent(colorPalette)}` : ""}`}
            className="rounded-full border border-zinc-800 px-5 py-2 text-sm font-medium text-zinc-400 transition-all duration-300 hover:border-zinc-600 hover:text-zinc-100"
          >
            Open workspace →
          </Link>
        </div>
      </div>
    ) : creditsExhausted ? (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center">
        <p className="text-sm font-medium text-zinc-500">No generation credits remaining</p>
        <p className="text-xs text-zinc-700">You&apos;ve used all your available credits.</p>
      </div>
    ) : (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950">
        <p className="text-sm font-medium text-zinc-600">Your design will appear here</p>
        <p className="text-xs text-zinc-700">Describe your vision and click Generate</p>
      </div>
    );

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-18">
      <div className="mx-auto w-full max-w-5xl">

        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            Design Studio
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-500">
            {saveState.status === "generated"
              ? "Adjust your prompt or options and regenerate."
              : saveState.status === "generate_failed"
              ? "Something went wrong. Adjust your prompt or retry."
              : "Describe your vision and generate the artwork."}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[1fr_340px] lg:gap-10">

          {/* Canvas */}
          <div className="relative lg:self-start lg:sticky lg:top-10">
            {(saveState.status === "generated" || saveState.status === "generating") && (
              <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-violet-600/[0.06] blur-2xl" />
            )}
            {canvas}
          </div>

          {/* Controls panel */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:p-7 dark:border-zinc-800 dark:bg-zinc-950">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="prompt"
                  className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
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
                    setUserHasTypedPrompt(true);
                    resetSaveState();
                  }}
                  placeholder="Describe what you want to create..."
                  className="mt-2.5 w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all duration-300 focus:border-violet-400/60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:font-mono dark:focus:border-violet-500/50"
                />
                {!userHasTypedPrompt && (
                  <div className="mt-3">
                    <p className="text-xs text-zinc-400 dark:text-zinc-600">
                      Try one of these to get started:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => {
                            setPrompt(example);
                            resetSaveState();
                          }}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 transition-all duration-300 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                        styleMood === style
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                        colorPalette === palette
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                      }`}
                    >
                      {palette}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                        productType === type
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {saveState.status === "auth_required" && (
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  <Link
                    href="/login"
                    className="text-zinc-900 underline underline-offset-2 transition-colors hover:text-violet-600 dark:text-white dark:hover:text-violet-400"
                  >
                    Sign in
                  </Link>{" "}
                  to generate and save designs.
                </p>
              )}

              {creditsExhausted && (
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  You&apos;ve used all your generation credits.
                </p>
              )}

              {saveState.status === "save_failed" && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  Something went wrong. Please try again.
                </p>
              )}

              {saveState.status === "generated" ? (
                <div className="space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
                  <div>
                    <Link
                      href={`/account/designs/${saveState.id}${colorPalette ? `?color_palette=${encodeURIComponent(colorPalette)}` : ""}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-violet-600 px-7 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                    >
                      Open in workspace →
                    </Link>
                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
                      Manage and publish this design from your workspace.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={!prompt.trim() || isWorking || creditsExhausted}
                      className="rounded-full border border-zinc-200 px-5 py-2 text-sm font-medium text-zinc-600 transition-all duration-300 hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                    >
                      {buttonLabel()}
                    </button>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      Not happy? Adjust and try again.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isWorking || creditsExhausted}
                    className="w-full rounded-full bg-violet-600 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
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
