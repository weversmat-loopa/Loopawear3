"use client";

import { useState } from "react";
import { updateDesign } from "@/app/account/actions";

const PRODUCT_TYPES = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;
const STYLES = ["Minimal", "Bold", "Vintage", "Abstract", "Graphic"] as const;

type ProductType = (typeof PRODUCT_TYPES)[number] | null;
type Style = (typeof STYLES)[number] | null;

interface DesignEditFormProps {
  designId: string;
  initialPrompt: string;
  initialProductType: string | null;
  initialStyle: string | null;
}

export default function DesignEditForm({
  designId,
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
          htmlFor="prompt"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Prompt
        </label>
        <textarea
          id="prompt"
          name="prompt"
          rows={4}
          defaultValue={initialPrompt}
          placeholder="Describe your design..."
          className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
        />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
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
        <div className="mt-2 flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(style === s ? null : s)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                style === s
                  ? "border-white bg-white text-black"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
      >
        Save changes
      </button>
    </form>
  );
}
