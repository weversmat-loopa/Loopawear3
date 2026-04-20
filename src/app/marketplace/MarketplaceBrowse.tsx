"use client";

import Link from "next/link";
import { useState } from "react";

const PRODUCT_FILTERS = ["T-shirt", "Hoodie", "Sweatshirt", "Tote bag"] as const;

type ProductFilter = (typeof PRODUCT_FILTERS)[number] | null;

export type MarketplaceDesign = {
  id: string;
  prompt: string;
  product_type: string | null;
  style: string | null;
  image_url: string | null;
  created_at: string;
  creator_name: string | null;
};

interface MarketplaceBrowseProps {
  designs: MarketplaceDesign[];
}

export default function MarketplaceBrowse({ designs }: MarketplaceBrowseProps) {
  const [activeFilter, setActiveFilter] = useState<ProductFilter>(null);

  const filtered = activeFilter
    ? designs.filter((d) => d.product_type === activeFilter)
    : designs;

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

        <div className="mt-8 flex flex-wrap gap-2">
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

        {filtered.length > 0 ? (
          <ul className="mt-6 grid grid-cols-1 gap-4 border-t border-zinc-900 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((design) => (
              <li key={design.id}>
                <Link
                  href={`/marketplace/${design.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-600"
                >
                  {design.image_url ? (
                    <div className="aspect-square w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element -- remotePatterns cannot be configured until AI provider is chosen */}
                      <img
                        src={design.image_url}
                        alt={
                          design.product_type
                            ? `${design.product_type} design`
                            : "Design"
                        }
                        className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square w-full bg-zinc-900" />
                  )}
                  <div className="flex flex-col gap-1 p-4">
                    <p className="text-sm font-medium text-white">
                      {design.product_type
                        ? `${design.product_type} Design`
                        : "Design"}
                    </p>
                    {design.creator_name && (
                      <p className="text-xs text-zinc-500">
                        by {design.creator_name}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-zinc-600">
                      {design.prompt}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center border-t border-zinc-900 py-24 text-center">
            <p className="text-sm font-medium text-zinc-500">
              {designs.length === 0
                ? "No designs published yet"
                : "No designs match this filter"}
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              {designs.length === 0
                ? "Creators are just getting started — check back soon."
                : "Try selecting a different product type."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
