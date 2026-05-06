"use client";

import { useState } from "react";

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const QUANTITIES = [1, 2, 3, 4, 5] as const;

interface ProductOptionsProps {
  priceCents: number;
}

export default function ProductOptions({ priceCents }: ProductOptionsProps) {
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  const totalCents = priceCents * quantity;

  return (
    <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Product options
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Size</p>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(size === s ? null : s)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                size === s
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Quantity</p>
        <div className="flex flex-wrap gap-2">
          {QUANTITIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuantity(q)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                quantity === q
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Total{quantity > 1 ? ` (${quantity}×)` : ""}
          </p>
          <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            €{(totalCents / 100).toFixed(2)}
          </p>
        </div>
        <button
          disabled
          className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
        >
          Checkout coming soon
        </button>
        <p className="mt-1.5 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Purchase will be available in a future update.
        </p>
      </div>
    </div>
  );
}
