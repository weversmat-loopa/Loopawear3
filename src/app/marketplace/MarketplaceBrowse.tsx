"use client";

import Link from "next/link";
import { useState } from "react";

import { PRODUCT_FILTERS } from "./filters";
import type { ProductFilter } from "./filters";

export type MarketplaceDesign = {
  id: string;
  title: string | null;
  prompt: string;
  product_type: string | null;
  style: string | null;
  image_url: string | null;
  created_at: string;
  creator_id: string | null;
  creator_name: string | null;
};

interface MarketplaceBrowseProps {
  designs: MarketplaceDesign[];
  initialFilter?: ProductFilter;
}

export default function MarketplaceBrowse({ designs, initialFilter = null }: MarketplaceBrowseProps) {
  const [activeFilter, setActiveFilter] = useState<ProductFilter>(initialFilter);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toLowerCase();

  const results = designs
    .filter((d) => !activeFilter || d.product_type === activeFilter)
    .filter((d) => {
      if (!trimmedQuery) return true;
      return (
        d.prompt.toLowerCase().includes(trimmedQuery) ||
        (d.creator_name?.toLowerCase().includes(trimmedQuery) ?? false) ||
        (d.style?.toLowerCase().includes(trimmedQuery) ?? false) ||
        (d.product_type?.toLowerCase().includes(trimmedQuery) ?? false)
      );
    });

  const isFiltering = activeFilter !== null || trimmedQuery !== "";

  function emptyHeading() {
    if (designs.length === 0) return "No designs published yet";
    return "No designs match";
  }

  function emptySubtext() {
    if (designs.length === 0) return "Creators are just getting started — check back soon.";
    if (trimmedQuery && activeFilter) return "Try a different search term or product filter.";
    if (trimmedQuery) return "Try a different search term.";
    return "Try selecting a different product type.";
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Marketplace
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900">
          Explore designs
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Discover original AI-generated apparel from independent creators.
          Every piece starts with a prompt.{" "}
          <Link
            href="/generate"
            className="text-zinc-500 underline underline-offset-2 transition-colors hover:text-violet-600"
          >
            Create your own →
          </Link>
        </p>

        {/* Search */}
        <div className="relative mt-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword, style, or creator…"
            className="w-full rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-violet-400/60"
          />
          {trimmedQuery && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Product type filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === null
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
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
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Count — total when browsing, result count when filtering */}
        {results.length > 0 && (
          <p className="mt-4 text-xs text-zinc-400">
            {isFiltering
              ? `${results.length} of ${designs.length} ${designs.length === 1 ? "design" : "designs"}`
              : `${designs.length} ${designs.length === 1 ? "design" : "designs"} published`}
          </p>
        )}

        {results.length > 0 ? (
          <ul className="mt-6 grid grid-cols-1 gap-4 border-t border-zinc-200 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((design) => (
              <li key={design.id}>
                <Link
                  href={`/marketplace/${design.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md"
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
                    <div className="aspect-square w-full bg-zinc-100" />
                  )}
                  <div className="flex flex-col gap-1 p-4">
                    <p className="text-sm font-medium text-zinc-900">
                      {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
                    </p>
                    {design.creator_name && (
                      <p className="text-xs text-zinc-500">
                        by {design.creator_name}
                      </p>
                    )}
                    {design.style && (
                      <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500">
                        {design.style}
                      </span>
                    )}
                    <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-zinc-400">
                      {design.prompt}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center border-t border-zinc-200 py-24 text-center">
            <p className="text-sm font-medium text-zinc-600">{emptyHeading()}</p>
            <p className="mt-2 text-sm text-zinc-400">{emptySubtext()}</p>
            {isFiltering && (
              <button
                type="button"
                onClick={() => { setQuery(""); setActiveFilter(null); }}
                className="mt-4 text-xs text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-900"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
