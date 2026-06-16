"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { saveDraft, saveDetails, submitDesignForReview, type PlacementData } from "./actions";
import { createClient } from "@/utils/supabase/client";
import { DoodleStar, DoodleBolt, DoodleSwirl, DoodleSparkle } from "@/components/ui/Doodles";

const PlacementEditor = dynamic(() => import("./PlacementEditor"), {
  ssr: false,
  loading: () => (
    <div className="mt-8 border-t border-zinc-100 pt-8 dark:border-zinc-800">
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

// Which accordion panel is open: 1 = Create, 2 = Details, 3 = Mockup, 4 = Submit
type OpenStep = 1 | 2 | 3 | 4;

// Chevron icon
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
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
  // Saved placement for the loaded design, passed to the PlacementEditor so it
  // restores the creator's earlier positioning instead of a centred default.
  const [placement,        setPlacement]        = useState<PlacementData | null>(null);

  // Accordion open step
  const [openStep, setOpenStep] = useState<OpenStep>(1);

  // ── Finish-flow state ────────────────────────────────────────────────────
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

  // Completed steps
  const step1Complete = saveState.status === "generated";
  const step2Complete = detailSaveStatus === "saved";
  const step3Complete = mockupStatus === "ready";
  const step4Complete = submitStatus === "submitted";

  // Whether post-generation steps are unlocked
  const postGenUnlocked = saveState.status === "generated";

  // ── Load an existing design when arriving with ?design_id=… ───────────────
  // Lets a creator re-open a saved draft in the Studio: we restore the existing
  // image, details and placement WITHOUT regenerating (which would cost a
  // credit). The "Generate" button still works for anyone who wants to replace
  // the image — that path consumes a credit, by design.
  useEffect(() => {
    if (!initialDesignId) return;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: design } = await supabase
        .from("designs")
        .select("image_url, image_status, title, price_cents, placement, prompt, product_type, style")
        .eq("id", initialDesignId)
        .eq("creator_id", user.id)
        .maybeSingle();

      if (cancelled || !design) return;

      // Prefill the form fields from the saved design.
      setPrompt(design.prompt ?? "");
      setDetailPrompt(design.prompt ?? "");
      setDetailTitle(design.title ?? "");
      setDetailProductType(design.product_type ?? null);
      setDetailStyle(design.style ?? null);
      if (PRODUCT_TYPES.includes(design.product_type as (typeof PRODUCT_TYPES)[number])) {
        setProductType(design.product_type as ProductType);
      }
      setDetailPrice(
        design.price_cents != null ? (design.price_cents / 100).toFixed(2) : ""
      );
      setPlacement((design.placement as PlacementData | null) ?? null);

      // Restore the existing image straight into "generated" — no regeneration.
      if (design.image_status === "ready" && design.image_url) {
        setLastImageUrl(design.image_url);
        setSaveState({ status: "generated", id: initialDesignId, imageUrl: design.image_url });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialDesignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a new image is generated, sync the prompt state and open step 2
  useEffect(() => {
    if (saveState.status === "generated") {
      setDetailPrompt(prompt);
      setDetailProductType(productType);
      setOpenStep(2);
    }
  }, [saveState.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // When details saved, open step 3
  useEffect(() => {
    if (detailSaveStatus === "saved") {
      const t = setTimeout(() => setOpenStep(3), 1200);
      return () => clearTimeout(t);
    }
  }, [detailSaveStatus]);

  // When mockup ready, open step 4
  useEffect(() => {
    if (mockupStatus === "ready") {
      const t = setTimeout(() => setOpenStep(4), 600);
      return () => clearTimeout(t);
    }
  }, [mockupStatus]);

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
    setPlacement(null);
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
    setOpenStep(1);
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
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="block h-auto w-full"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="text-xs font-medium text-white/80">Generating…</span>
        </div>
      </div>
    ) : saveState.status === "generating" ? (
      <div className="flex w-full items-center justify-center rounded-2xl bg-zinc-50 aspect-square dark:bg-zinc-900">
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
          sizes="(min-width: 1024px) 45vw, 100vw"
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

  // ── Accordion step header ────────────────────────────────────────────────
  function StepHeader({
    step,
    title,
    accentColor,
    complete,
    locked,
  }: {
    step: OpenStep;
    title: string;
    accentColor: string;
    complete: boolean;
    locked?: boolean;
  }) {
    const isOpen = openStep === step;
    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => setOpenStep(isOpen ? (step === 1 ? 1 : (step - 1) as OpenStep) : step)}
        className={`flex w-full items-center gap-3 py-4 text-left transition-opacity ${locked ? "cursor-default opacity-40" : "hover:opacity-80"}`}
        aria-expanded={isOpen}
      >
        {/* Step number badge */}
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm font-bold ${accentColor}`}
        >
          {complete ? "✓" : step}
        </span>
        <span className="flex-1 font-display text-lg text-ink">{title}</span>
        {!locked && <Chevron open={isOpen} />}
      </button>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden px-4 py-10 sm:px-6 md:py-16">
      <DoodleBolt
        aria-hidden
        className="doodle-sway pointer-events-none absolute right-8 top-16 hidden h-11 w-9 -rotate-6 text-brand-orange md:block lg:right-20"
      />
      <DoodleSwirl
        aria-hidden
        className="doodle-sway pointer-events-none absolute right-24 top-40 hidden h-10 w-10 text-brand-blue/70 lg:block"
      />

      <div className="relative mx-auto w-full max-w-6xl">

        {/* ── Page heading ─────────────────────────────────────────────── */}
        <div className="relative mb-8 inline-block sm:mb-10">
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

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12">

          {/* ── LEFT: sticky image column ─────────────────────────────── */}
          <div className="lg:sticky lg:top-10">
            {/* On mobile, cap height so image doesn't dominate */}
            <div className="max-h-[60vw] overflow-hidden rounded-2xl sm:max-h-none lg:max-h-none">
              {canvas}
            </div>

            {/* Post-generation actions below image */}
            {saveState.status === "generated" && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <button
                  type="button"
                  disabled={!prompt.trim() || isWorking}
                  onClick={() => {
                    if (designId) {
                      setSaveState({ status: "saving" });
                      saveDraft({ prompt, productType, styleMood, designId }).then((result) => {
                        if (result.error === "auth_required") { setSaveState({ status: "auth_required" }); return; }
                        if (result.error === "save_failed")   { setSaveState({ status: "save_failed" });   return; }
                        if (result.id) { setDesignId(result.id); handleGenerate(result.id); }
                      });
                    }
                  }}
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

            {/* Placement editor — below image in sticky column */}
            {saveState.status === "generated" && (
              <div className="mt-6">
                <PlacementEditor
                  imageUrl={saveState.imageUrl}
                  designId={saveState.id}
                  initialPlacement={placement}
                />
              </div>
            )}
          </div>

          {/* ── RIGHT: accordion steps ─────────────────────────────────── */}
          <div className="flex flex-col divide-y-2 divide-dashed divide-ink/20 rounded-2xl border-2 border-ink/10 bg-paper px-5 dark:bg-zinc-900/60">

            {/* ── Step 1: Create ──────────────────────────────────────── */}
            <div>
              <StepHeader
                step={1}
                title="Create"
                accentColor="border-brand-orange text-brand-orange"
                complete={step1Complete}
              />
              {openStep === 1 && (
                <form onSubmit={handleSubmit} className="pb-6">
                  <div className="flex flex-col gap-6">

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
                        placeholder="Describe your design… e.g. 'vintage wolf howling at moon, gothic style'"
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
                      className="sticker w-full rounded-2xl bg-brand-orange py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {generateButtonLabel()}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* ── Step 2: Details ─────────────────────────────────────── */}
            <div>
              <StepHeader
                step={2}
                title="Details"
                accentColor="border-brand-blue text-brand-blue"
                complete={step2Complete}
                locked={!postGenUnlocked}
              />
              {openStep === 2 && postGenUnlocked && (
                <form onSubmit={handleSaveDetails} className="pb-6 space-y-5">

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
              )}
            </div>

            {/* ── Step 3: Mockup ──────────────────────────────────────── */}
            <div>
              <StepHeader
                step={3}
                title="Mockup"
                accentColor="border-brand-green text-brand-green"
                complete={step3Complete}
                locked={!postGenUnlocked}
              />
              {openStep === 3 && postGenUnlocked && (
                <div className="pb-6">
                  <p className="mb-5 font-hand text-base text-ink/70">
                    Generate a real product mockup photo for the marketplace.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
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
                        <p className="text-xs text-zinc-400">
                          Optional — buyers will see this on the product page.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Step 4: Submit ──────────────────────────────────────── */}
            <div>
              <StepHeader
                step={4}
                title="Submit"
                accentColor="border-brand-orange text-brand-orange"
                complete={step4Complete}
                locked={!postGenUnlocked}
              />
              {openStep === 4 && postGenUnlocked && (
                <div className="pb-6">
                  {submitStatus === "submitted" ? (
                    <div className="flex flex-col gap-3">
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
                    <div className="flex flex-col gap-4">
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
                        {saveState.status === "generated" && (
                          <Link
                            href={`/account/designs/${saveState.id}`}
                            className="text-center text-sm text-zinc-400 transition-colors hover:text-zinc-900 sm:text-left dark:hover:text-zinc-100"
                          >
                            Manage in workspace →
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
          {/* end accordion */}

        </div>
        {/* end two-column */}

      </div>
    </main>
  );
}
