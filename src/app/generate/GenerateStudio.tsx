"use client";

import Link from "next/link";
import { useState } from "react";
import { saveDraft } from "./actions";

const PRODUCT_TYPES = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;
const STYLE_MOODS = ["Minimal", "Bold", "Vintage", "Abstract", "Graphic"] as const;

type ProductType = (typeof PRODUCT_TYPES)[number] | null;
type StyleMood = (typeof STYLE_MOODS)[number] | null;

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; id: string }
  | { status: "auth_required" }
  | { status: "save_failed" };

export default function GenerateStudio() {
  const [prompt, setPrompt] = useState("");
  const [productType, setProductType] = useState<ProductType>(null);
  const [styleMood, setStyleMood] = useState<StyleMood>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  function resetSaveState() {
    if (saveState.status !== "idle") setSaveState({ status: "idle" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState({ status: "saving" });

    const result = await saveDraft({ prompt, productType, styleMood });

    if (result.error === "auth_required") {
      setSaveState({ status: "auth_required" });
    } else if (result.error === "save_failed") {
      setSaveState({ status: "save_failed" });
    } else {
      setSaveState({ status: "success", id: result.id });
    }
  }

  return (
    <main className="flex flex-1 flex-col bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Design Studio
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Describe your design and let AI bring it to life.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
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
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    productType === type
                      ? "border-white bg-white text-black"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
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
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    styleMood === style
                      ? "border-white bg-white text-black"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="prompt"
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
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
              placeholder="Describe the design you want to create — style, colors, motifs, mood..."
              className="mt-2 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!prompt.trim() || saveState.status === "saving"}
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saveState.status === "saving" ? "Saving…" : "Generate"}
            </button>
          </div>
        </form>

        <div className="mt-10 min-h-[320px] rounded-xl border border-dashed border-zinc-800">
          {saveState.status === "success" ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm font-medium text-white">Draft saved</p>
              <p className="text-xs text-zinc-500">
                Your design is ready. Go to your draft to generate an image.
              </p>
              <Link
                href={`/account/designs/${saveState.id}`}
                className="mt-3 rounded-full border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                View draft →
              </Link>
            </div>
          ) : saveState.status === "auth_required" ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm font-medium text-zinc-400">
                Sign in to save your design
              </p>
              <p className="text-sm text-zinc-600">
                <Link
                  href="/login"
                  className="text-zinc-400 underline underline-offset-2 hover:text-white"
                >
                  Log in
                </Link>{" "}
                or{" "}
                <Link
                  href="/signup"
                  className="text-zinc-400 underline underline-offset-2 hover:text-white"
                >
                  Sign up
                </Link>{" "}
                — your inputs will still be here.
              </p>
            </div>
          ) : saveState.status === "save_failed" ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-1 p-6 text-center">
              <p className="text-sm font-medium text-zinc-500">
                Something went wrong
              </p>
              <p className="mt-1 text-xs text-zinc-700">
                Your design could not be saved. Please try again.
              </p>
            </div>
          ) : prompt.trim() ? (
            <div className="p-6">
              {(productType || styleMood) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {productType && (
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                      {productType}
                    </span>
                  )}
                  {styleMood && (
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                      {styleMood}
                    </span>
                  )}
                </div>
              )}
              <p className="line-clamp-4 text-sm leading-relaxed text-zinc-300">
                &ldquo;{prompt.trim()}&rdquo;
              </p>
              <p className="mt-6 text-xs text-zinc-700">Ready to generate</p>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-1">
              <p className="text-sm text-zinc-600">
                Your design will appear here
              </p>
              <p className="text-xs text-zinc-700">
                Fill in the form above and hit Generate
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
