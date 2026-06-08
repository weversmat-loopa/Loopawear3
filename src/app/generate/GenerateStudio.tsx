"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { saveDraft, saveDetails, submitDesignForReview } from "./actions";
import { DoodleStar, DoodleBolt, DoodleSwirl, DoodleSparkle } from "@/components/ui/Doodles";

const PlacementEditor = dynamic(() => import("./PlacementEditor"), {
  ssr: false,
  loading: () => (
    <div className="mt-12 border-t border-zinc-100 pt-12 dark:border-zinc-800">
      <div className="h-6 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mt-4 w-full max-w-[400px] aspect-[400/480] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
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

  const [designId,         setDesignId]         = useState<string | null>(initialDesignId);
  const [saveState,        setSaveState]        = useState<SaveState>({ status: "idle" });
  const [removeBackground, setRemoveBackground] = useState(true);
  const [lastImageUrl,     setLastImageUrl]     = useState<string | null>(null);
  const [imgLoaded,        setImgLoaded]        = useState(false);

  // ── Finish-flow state ────────────────────────────────────────────────────
  // Metadata form
  const [detailTitle,       setDetailTitle]       = useState("");
  const [detailPrompt,      setDetailPrompt]      = useState(initialPrompt);
  const [detailProductType, setDetailProductType] = useState<string | null>(initialProductType ?? null);
  const [detailStyle,       setDetailStyle]       = useState<string | null>(initialStyle ?? null);
  const [detailPrice,       setDetailPrice]       = useState("");
  const [detailSaveStatus,  setDetailSaveStatus]  = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [detailError,       setDetailError]       = useState<string | null>(null);

  // Mockup
  const [mockupStatus,  setMockupStatus]  = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [mockupUrl,     setMockupUrl]     = useState<string | null>(null);
  const [mockupError,   setMockupError]   = useState<string | null>(null);

  // Submit
  const [submitStatus,  setSubmitStatus]  = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [submitError,   setSubmitError]   = useState<string | null>(null);

  // Refs for smooth scroll-to-section
  const finishSectionRef = useRef<HTMLDivElement>(null);
  const submitSectionRef = useRef<HTMLDivElement>(null);

  // When a new image is generated, sync the prompt state with the active prompt
  // so the details form is pre-filled correctly.
  useEffect(() => {
    if (saveState.status === "generated") {
      setDetailPrompt(prompt);
      setDetailProductType(productType);
      // Scroll to the finish section after a short delay to let the
      // PlacementEditor mount and lay out first.
      const t = setTimeout(() => {
        finishSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 600);
      return () => clearTimeout(t);
    }
  }, [saveState.status]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setDetailTitle("");
    setDetailPrompt("");
    setDetailProductType(null);
    setDetailStyle(null);
    setDetailPrice("");
    setDetailSaveStatus("idle");
    setDetailError(null);
    setMockupStatus("idle");
    setMockupUrl(null);
    setMockupError(null);
    setSubmitStatus("idle");
    setSubmitError(null);
  }

  // ── Finish-flow handlers ─────────────────────────────────────────────────

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!designId) return;
    setDetailSaveStatus("saving");
    setDetailError(null);
    const result = await saveDetails({
      designId,
      title: detailTitle,
      prompt: detailPrompt,
      productType: detailProductType,
      style: detailStyle,
      priceEuros: detailPrice,
    });
    if (result.error) {
      setDetailError(result.error);
      setDetailSaveStatus("error");
    } else {
      setDetailSaveStatus("saved");
      setTimeout(() => setDetailSaveStatus("idle"), 3000);
    }
  }

  async function handleGenerateMockup() {
    if (!designId) return;
    setMockupStatus("generating");
    setMockupError(null);
    try {
      const res = await fetch(`/api/designs/${designId}/mockup`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setMockupError(
          body.error === "already_generating"
            ? "Mockup generation already in progress."
            : "Mockup generation failed. Please try again."
        );
        setMockupStatus("error");
        return;
      }
      const body = await res.json() as { mockupUrl?: string };
      setMockupUrl(body.mockupUrl ?? null);
      setMockupStatus("ready");
    } catch {
      setMockupError("Something went wrong. Please try again.");
      setMockupStatus("error");
    }
  }

  async function handleSubmitForReview() {
    if (!designId) return;
    setSubmitStatus("submitting");
    setSubmitError(null);
    const result = await submitDesignForReview(designId);
    if (result.error) {
      setSubmitError(result.error);
      setSubmitStatus("error");
    } else {
      setSubmitStatus("submitted");
      // Scroll to the submitted confirmation
      setTimeout(() => {
        submitSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }

  async function handleGenerate(id: string) {
    setImgLoaded(false);
    setSaveState({ status: "generating", id });

    try {
      const res = await fetch(`/api/designs/${id}/generate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ colorPalette, removeBackground }),
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
      <div className="flex w-full items-center justify-center rounded-2xl bg-zinc-50 aspect-square max-h-[72vw] sm:max-h-none dark:bg-zinc-900">
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
      <div className="flex aspect-square w-full max-h-[72vw] sm:max-h-none flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-50 p-8 text-center dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Prompt couldn&apos;t be processed
        </p>
        <p className="max-w-xs text-xs text-zinc-400">
          Your prompt was flagged by our content safety check. Please revise
          the wording and try again.
        </p>
      </div>
    ) : saveState.status === "generate_failed" ? (
      <div className="flex aspect-square w-full max-h-[72vw] sm:max-h-none flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-50 p-8 text-center dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Generation failed</p>
        <p className="text-xs text-zinc-400">
          Something went wrong. Adjust your prompt or click Retry.
        </p>
      </div>
    ) : creditsExhausted ? (
      <div className="flex aspect-square w-full max-h-[72vw] sm:max-h-none flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-50 p-8 text-center dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          No generation credits remaining
        </p>
        <p className="text-xs text-zinc-400">You&apos;ve used all your available credits.</p>
      </div>
    ) : (
      <div className="flex aspect-square w-full max-h-[72vw] sm:max-h-none flex-col items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900">
        <p className="text-sm text-zinc-300 dark:text-zinc-700">
          Your design will appear here
        </p>
      </div>
    );

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden px-4 py-10 sm:px-6 md:py-20">
      <DoodleBolt
        aria-hidden
        className="doodle-sway pointer-events-none absolute right-8 top-16 hidden h-11 w-9 -rotate-6 text-brand-orange md:block lg:right-20"
      />
      <DoodleSwirl
        aria-hidden
        className="doodle-sway pointer-events-none absolute right-24 top-40 hidden h-10 w-10 text-brand-blue/70 lg:block"
      />
      <div className="relative mx-auto w-full max-w-6xl">

        <div className="relative mb-8 inline-block sm:mb-12">
          <span className="mb-2 inline-flex -rotate-1 items-center gap-2 rounded-full border-2 border-ink bg-brand-yellow px-3 py-0.5 font-hand text-base font-bold text-ink">
            ✦ Make something one-of-a-kind
          </span>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">
            Design Studio
            <DoodleStar className="doodle-twinkle ml-2 inline-block h-6 w-6 -rotate-12 align-middle text-brand-orange" />
          </h1>
          <p className="mt-2 font-hand text-xl text-zinc-500">
            Type a prompt, hit Generate. Your design is ready in seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-16">

            {/* ── Left: controls ────────────────────────────────── */}
            <div className="flex flex-col gap-7">

              {/* Prompt textarea */}
              <div className="rounded-2xl border-2 border-ink bg-paper transition-shadow focus-within:shadow-[3px_3px_0_0_var(--ink)] dark:bg-zinc-900">
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
                      className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        productType === type
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-zinc-100 dark:text-zinc-900"
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

              {/* Background toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Remove background
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={removeBackground}
                  onClick={() => setRemoveBackground((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${
                    removeBackground
                      ? "bg-zinc-900 dark:bg-paper"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-paper shadow transition-transform dark:bg-zinc-900 ${
                      removeBackground ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Generate button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isWorking || creditsExhausted || authRequired}
                className="sticker w-full rounded-2xl bg-brand-orange py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generateButtonLabel()}
              </button>
            </div>

            {/* ── Right: image preview ───────────────────────────── */}
            {/* On mobile, cap height so the canvas doesn't dominate the screen
                and the Generate button + finish sections stay reachable. */}
            <div className="lg:sticky lg:top-10">

              {canvas}

              {saveState.status === "generated" && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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
                  <Link
                    href={`/account/designs/${saveState.id}${colorPalette ? `?color_palette=${encodeURIComponent(colorPalette)}` : ""}`}
                    className="text-sm text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Manage in workspace →
                  </Link>
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

        {/* ── Finish flow — shown after a successful generation ────────── */}
        {saveState.status === "generated" && (
          <div ref={finishSectionRef} className="mt-16 space-y-10">

            {/* ── Section A: Design details ──────────────────────────────── */}
            <section className="border-t-2 border-dashed border-ink/30 pt-10">
              <div className="flex items-center gap-3">
                <span className="font-marker text-2xl text-brand-blue">②</span>
                <h2 className="font-display text-2xl text-ink">Finish your design</h2>
              </div>
              <p className="mt-2 font-hand text-lg text-ink/70">
                Give it a name, set a price, and save the details.
              </p>

              <form onSubmit={handleSaveDetails} className="mt-8 w-full max-w-lg space-y-5">
                {/* Title */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Title
                  </label>
                  <input
                    type="text"
                    value={detailTitle}
                    onChange={(e) => setDetailTitle(e.target.value)}
                    placeholder="Give your design a public name…"
                    className="mt-2 w-full rounded-xl border-2 border-ink/10 bg-paper px-4 py-3.5 text-base text-ink placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-blue/40 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Prompt */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={detailPrompt}
                    onChange={(e) => setDetailPrompt(e.target.value)}
                    className="mt-2 w-full resize-none rounded-xl border-2 border-ink/10 bg-paper px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-blue/40 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Product type */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Product type
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRODUCT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDetailProductType(detailProductType === type ? null : type)}
                        className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          detailProductType === type
                            ? "border-ink bg-ink text-paper dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                            : "border-zinc-200 text-zinc-500 hover:border-ink hover:text-ink dark:border-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Style
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STYLE_MOODS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDetailStyle(detailStyle === s ? null : s)}
                        className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          detailStyle === s
                            ? "border-ink bg-ink text-paper dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                            : "border-zinc-200 text-zinc-500 hover:border-ink hover:text-ink dark:border-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Price (€)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={detailPrice}
                    onChange={(e) => setDetailPrice(e.target.value)}
                    placeholder="e.g. 29.99 — leave empty to skip"
                    className="mt-2 w-full rounded-xl border-2 border-ink/10 bg-paper px-4 py-3.5 text-base text-ink placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-blue/40 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <p className="mt-1.5 text-xs text-zinc-400">
                    Optional — does not affect publishing.
                  </p>
                </div>

                {detailError && (
                  <p className="text-sm text-red-500 dark:text-red-400">{detailError}</p>
                )}

                <button
                  type="submit"
                  disabled={detailSaveStatus === "saving"}
                  className="sticker w-full rounded-full bg-brand-blue px-6 py-3.5 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5 sm:text-sm"
                >
                  {detailSaveStatus === "saving"
                    ? "Saving…"
                    : detailSaveStatus === "saved"
                    ? "Details saved ✓"
                    : "Save details"}
                </button>
              </form>
            </section>

            {/* ── Section B: Printful mockup ─────────────────────────────── */}
            <section className="border-t-2 border-dashed border-ink/30 pt-10">
              <div className="flex items-center gap-3">
                <span className="font-marker text-2xl text-brand-green">③</span>
                <h2 className="font-display text-2xl text-ink">Printful mockup</h2>
              </div>
              <p className="mt-2 font-hand text-lg text-ink/70">
                Generate a real product mockup photo for the marketplace.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                {mockupStatus === "ready" ? (
                  <>
                    {mockupUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mockupUrl}
                        alt="Printful mockup"
                        className="ink-card h-40 w-40 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex flex-col gap-2">
                      <p className="font-hand text-lg text-brand-green">Mockup ready ✓</p>
                      <button
                        type="button"
                        onClick={handleGenerateMockup}
                        className="min-h-[44px] w-fit rounded-full border-2 border-ink/20 px-4 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:border-ink hover:text-ink"
                      >
                        Regenerate mockup
                      </button>
                    </div>
                  </>
                ) : mockupStatus === "generating" ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
                    <p className="text-sm text-zinc-500">Generating mockup…</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateMockup}
                      className="sticker w-full rounded-full bg-brand-green px-6 py-3.5 text-base font-extrabold text-white sm:w-fit sm:py-2.5 sm:text-sm"
                    >
                      Generate Printful mockup
                    </button>
                    {mockupError && (
                      <p className="text-xs text-red-500">{mockupError}</p>
                    )}
                    <p className="text-xs text-zinc-400">Optional — buyers will see this on the product page.</p>
                  </div>
                )}
              </div>
            </section>

            {/* ── Section C: Submit for review ───────────────────────────── */}
            <section ref={submitSectionRef} className="border-t-2 border-dashed border-ink/30 pt-10 pb-20">
              <div className="flex items-center gap-3">
                <span className="font-marker text-2xl text-brand-orange">④</span>
                <h2 className="font-display text-2xl text-ink">Submit for review</h2>
              </div>

              {submitStatus === "submitted" ? (
                <div className="mt-6 flex flex-col gap-3">
                  <div className="ink-card inline-flex items-center gap-3 rounded-xl bg-brand-green/10 px-5 py-4 dark:bg-brand-green/20">
                    <DoodleSparkle className="h-5 w-5 text-brand-green" />
                    <p className="font-hand text-xl font-bold text-brand-green">
                      Submitted for review ✓
                    </p>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    We&apos;ll notify you by email when your design is approved and goes live on the marketplace.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <Link
                      href="/account"
                      className="text-sm font-medium text-brand-blue transition-opacity hover:opacity-70"
                    >
                      View in your account →
                    </Link>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-sm text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      Create another design
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-4">
                  <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                    Once submitted, your design will be reviewed by our team. You&apos;ll receive an email when it&apos;s approved and live on the marketplace.
                  </p>
                  {submitError && (
                    <p className="text-sm text-red-500 dark:text-red-400">{submitError}</p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                    <button
                      type="button"
                      onClick={handleSubmitForReview}
                      disabled={submitStatus === "submitting"}
                      className="sticker w-full rounded-full bg-brand-orange px-8 py-3 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {submitStatus === "submitting" ? "Submitting…" : "Submit for review →"}
                    </button>
                    <Link
                      href={`/account/designs/${saveState.id}`}
                      className="text-center text-sm text-zinc-400 transition-colors hover:text-zinc-900 sm:text-left dark:hover:text-zinc-100"
                    >
                      Manage in workspace →
                    </Link>
                  </div>
                </div>
              )}
            </section>

          </div>
        )}

      </div>
    </main>
  );
}
