"use client";

import { useState } from "react";
import { updateDesign } from "@/app/account/actions";

const PRODUCT_TYPES = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;
const STYLES = ["Minimal", "Bold", "Vintage", "Abstract", "Graphic"] as const;

type ProductType = (typeof PRODUCT_TYPES)[number] | null;
type Style = (typeof STYLES)[number] | null;

interface DesignEditFormProps {
  designId: string;
  initialTitle: string | null;
  initialPrompt: string;
  initialProductType: string | null;
  initialStyle: string | null;
}

export default function DesignEditForm({
  designId,
  initialTitle,
  initialPrompt,
  initialProductType,
  initialStyle,
}: DesignEditFormProps) {
  const [productType, setProductType] = useState<ProductType>(
    (initialProductType as ProductType) ?? null
  );
  const [style, setStyle] = useState<Style>(
    (initialStyle as Style) ?? null
  );

  return (
    <form action={updateDesign} className="mt-8 space-y-6">
      <input type="hidden" name="designId" value={designId} />
      <input type="hidden" name="product_type" value={productType ?? ""} />
      <input type="hidden" name="style" value={style ?? ""} />

      <div>
        <label
          htmlFor="title"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={initialTitle ?? ""}
          placeholder="Give your design a public name…"
          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-violet-400/60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>

      <div>
        <label
          htmlFor="prompt"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          Prompt
        </label>
        <textarea
          id="prompt"
          name="prompt"
          rows={4}
          defaultValue={initialPrompt}
          placeholder="Describe your design..."
          className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-violet-400/60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Product type
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRODUCT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setProductType(productType === type ? null : type)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                productType === type
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Style
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(style === s ? null : s)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                style === s
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
      >
        Save changes
      </button>
    </form>
  );
}
