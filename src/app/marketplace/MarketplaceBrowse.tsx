"use client";

import { useState } from "react";

const PRODUCT_FILTERS = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;

type ProductFilter = (typeof PRODUCT_FILTERS)[number] | null;
type SortOption = "newest" | "popular";

export default function MarketplaceBrowse() {
  const [activeFilter, setActiveFilter] = useState<ProductFilter>(null);
  const [sort, setSort] = useState<SortOption>("newest");

  return (
    <main className="flex flex-1 flex-col bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Marketplace
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          Explore designs
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Discover original AI-generated apparel from independent creators.
          Every piece starts with a prompt.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === null
                  ? "border-white bg-white text-black"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
              }`}
            >
              All
            </button>
            {PRODUCT_FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === type ? null : type)
                }
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === type
                    ? "border-white bg-white text-black"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 outline-none focus:border-zinc-600"
          >
            <option value="newest">Newest</option>
            <option value="popular">Popular</option>
          </select>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center border-t border-zinc-900 py-24 text-center">
          <p className="text-sm font-medium text-zinc-500">
            No designs published yet
          </p>
          <p className="mt-2 text-sm text-zinc-700">
            Creators are just getting started — check back soon.
          </p>
        </div>
      </div>
    </main>
  );
}
