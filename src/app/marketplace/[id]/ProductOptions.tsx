"use client";

import { useState } from "react";
import Link from "next/link";

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const QUANTITIES = [1, 2, 3, 4, 5] as const;

interface ProductOptionsProps {
  priceCents: number;
  designId: string;
  isAuthenticated: boolean;
}

export default function ProductOptions({
  priceCents,
  designId,
  isAuthenticated,
}: ProductOptionsProps) {
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCents = priceCents * quantity;
  const canCheckout = !!size && !loading;

  async function handleCheckout() {
    if (!canCheckout) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design_id: designId, size, quantity }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok) {
        if (data.error === "design_not_found") {
          setError("This design is no longer available.");
        } else if (data.error === "design_not_priced") {
          setError("This design doesn't have a price set yet.");
        } else {
          setError("Something went wrong. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        // Keep loading=true — page is navigating away
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

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

        {!isAuthenticated ? (
          <Link
            href={`/login?redirect=/marketplace/${designId}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Sign in to buy
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!canCheckout}
            className={`mt-3 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              canCheckout
                ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                : "cursor-not-allowed border border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
            }`}
          >
            {loading
              ? "Redirecting to checkout…"
              : !size
              ? "Select a size to continue"
              : `Buy now — €${(totalCents / 100).toFixed(2)}`}
          </button>
        )}

        {error && (
          <p className="mt-2 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
