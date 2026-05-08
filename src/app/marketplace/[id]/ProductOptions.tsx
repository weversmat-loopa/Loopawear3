"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

// Approximate unisex t-shirt measurements. Real fit varies by
// manufacturer; the disclaimer in the modal sets buyer expectations.
const SIZE_GUIDE = [
  { size: "S", eu: "46–48", chest: "88–94 cm", length: "68–70 cm" },
  { size: "M", eu: "48–50", chest: "94–100 cm", length: "70–72 cm" },
  { size: "L", eu: "50–52", chest: "100–106 cm", length: "72–74 cm" },
  { size: "XL", eu: "54–56", chest: "106–112 cm", length: "74–76 cm" },
  { size: "XXL", eu: "56–58", chest: "112–118 cm", length: "76–78 cm" },
] as const;

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
  const [quantity, setQuantity] = useState<number>(MIN_QUANTITY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sizeGuideRef = useRef<HTMLDialogElement>(null);

  const totalCents = priceCents * quantity;
  const canCheckout = !!size && !loading;

  function openSizeGuide() {
    sizeGuideRef.current?.showModal();
  }

  function closeSizeGuide() {
    sizeGuideRef.current?.close();
  }

  // Native <dialog> reports the dialog itself as the click target when
  // the user clicks the backdrop region; clicks on inner content
  // bubble with those nodes as targets, so this fires only on
  // backdrop clicks.
  function handleDialogBackdropClick(
    e: React.MouseEvent<HTMLDialogElement>
  ) {
    if (e.target === sizeGuideRef.current) {
      sizeGuideRef.current.close();
    }
  }

  function setQuantityClamped(next: number) {
    if (Number.isNaN(next)) {
      setQuantity(MIN_QUANTITY);
      return;
    }
    setQuantity(Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, next)));
  }

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

      const data = (await res.json()) as { url?: string; error?: string };

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
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Size</p>
          <button
            type="button"
            onClick={openSizeGuide}
            className="text-xs text-zinc-500 underline underline-offset-2 transition-colors hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400"
          >
            Size guide
          </button>
        </div>
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
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Quantity
        </p>
        <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setQuantityClamped(quantity - 1)}
            disabled={quantity <= MIN_QUANTITY}
            aria-label="Decrease quantity"
            className="flex h-9 w-9 items-center justify-center rounded-l-full text-base font-medium text-zinc-600 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-100 dark:disabled:text-zinc-700"
          >
            −
          </button>
          <input
            type="number"
            min={MIN_QUANTITY}
            max={MAX_QUANTITY}
            value={quantity}
            onChange={(e) =>
              setQuantityClamped(parseInt(e.target.value, 10))
            }
            aria-label="Quantity"
            className="h-9 w-12 border-x border-zinc-200 bg-transparent text-center text-sm font-medium tabular-nums text-zinc-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:border-zinc-700 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => setQuantityClamped(quantity + 1)}
            disabled={quantity >= MAX_QUANTITY}
            aria-label="Increase quantity"
            className="flex h-9 w-9 items-center justify-center rounded-r-full text-base font-medium text-zinc-600 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-100 dark:disabled:text-zinc-700"
          >
            +
          </button>
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

      {/* Size guide modal — native <dialog> for built-in backdrop, ESC,
          and focus trap via showModal(). */}
      <dialog
        ref={sizeGuideRef}
        onClick={handleDialogBackdropClick}
        aria-labelledby="size-guide-title"
        className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-2xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-900/40 backdrop:backdrop-blur-sm dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 id="size-guide-title" className="text-base font-semibold">
            T-shirt size guide
          </h2>
          <button
            type="button"
            onClick={closeSizeGuide}
            aria-label="Close size guide"
            className="text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 font-medium">Size</th>
                <th className="py-2 font-medium">EU</th>
                <th className="py-2 font-medium">Chest</th>
                <th className="py-2 font-medium">Length</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700 dark:text-zinc-300">
              {SIZE_GUIDE.map((row, i) => (
                <tr
                  key={row.size}
                  className={
                    i < SIZE_GUIDE.length - 1
                      ? "border-b border-zinc-100 dark:border-zinc-800"
                      : ""
                  }
                >
                  <td className="py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    {row.size}
                  </td>
                  <td className="py-2 tabular-nums">{row.eu}</td>
                  <td className="py-2 tabular-nums">{row.chest}</td>
                  <td className="py-2 tabular-nums">{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
            Measurements are unisex t-shirt approximations and may vary by
            ±2 cm. For the closest fit, measure a t-shirt you already own
            and compare.
          </p>
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              How to measure
            </p>
            <p className="mt-1.5">
              <span className="font-medium">Chest:</span> measure straight
              across, from one armpit seam to the other, then double the
              number.
            </p>
            <p className="mt-1">
              <span className="font-medium">Length:</span> measure from the
              highest point of the shoulder seam straight down to the hem.
            </p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
