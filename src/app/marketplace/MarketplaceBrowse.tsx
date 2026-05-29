"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  PRODUCT_FILTERS,
  SORT_LABELS,
  SORT_OPTIONS,
  type ProductFilter,
  type SortOption,
} from "./filters";
import type { MarketplaceDesign } from "./queries";
import ProductMockup from "@/components/ui/ProductMockup";

interface MarketplaceBrowseProps {
  initialDesigns: MarketplaceDesign[];
  initialCursor: string | null;
  initialFilter: ProductFilter;
  initialQuery: string;
  initialSort: SortOption;
}

export default function MarketplaceBrowse({
  initialDesigns,
  initialCursor,
  initialFilter,
  initialQuery,
  initialSort,
}: MarketplaceBrowseProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [extraDesigns, setExtraDesigns] = useState<MarketplaceDesign[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    setExtraDesigns([]);
    setCursor(initialCursor);
    setLoadMoreError(null);
  }, [initialQuery, initialFilter, initialSort, initialCursor]);

  useEffect(() => {
    setSearchInput(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (searchInput === initialQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) {
        params.set("q", searchInput);
      } else {
        params.delete("q");
      }
      const queryStr = params.toString();
      startTransition(() => {
        router.push(queryStr ? `${pathname}?${queryStr}` : pathname);
      });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, initialQuery]);

  function pushParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    const queryStr = params.toString();
    startTransition(() => {
      router.push(queryStr ? `${pathname}?${queryStr}` : pathname);
    });
  }

  function setFilter(filter: ProductFilter) {
    pushParam("type", filter);
  }

  function setSort(s: SortOption) {
    pushParam("sort", s === "newest" ? null : s);
  }

  function clearFilters() {
    setSearchInput("");
    startTransition(() => router.push(pathname));
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", cursor);
      const res = await fetch(`/api/marketplace?${params.toString()}`);
      if (!res.ok) {
        setLoadMoreError("Couldn't load more designs.");
        return;
      }
      const data = (await res.json()) as {
        designs: MarketplaceDesign[];
        nextCursor: string | null;
      };
      setExtraDesigns((prev) => [...prev, ...data.designs]);
      setCursor(data.nextCursor);
    } catch {
      setLoadMoreError("Couldn't load more designs.");
    } finally {
      setLoadingMore(false);
    }
  }

  const allDesigns = [...initialDesigns, ...extraDesigns];
  const isFiltering =
    initialFilter !== null || initialQuery !== "" || initialSort !== "newest";

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-1.5 dark:border-violet-500/20 dark:bg-violet-500/5">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <span className="text-xs font-medium uppercase tracking-widest text-violet-500 dark:text-violet-400">
            Marketplace
          </span>
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
          Explore designs
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Discover original AI-generated apparel from independent creators.
          Every piece starts with a prompt.{" "}
          <Link
            href="/generate"
            className="text-zinc-500 underline underline-offset-2 transition-colors hover:text-violet-500 dark:hover:text-violet-400"
          >
            Create your own →
          </Link>
        </p>

        {/* Search */}
        <div className="relative mt-8">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by keyword, style, or product…"
            className="w-full rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all duration-300 focus:border-violet-400/60 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-violet-500/50"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters + sort */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                initialFilter === null
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-400 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-400"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
              }`}
            >
              All
            </button>
            {PRODUCT_FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(initialFilter === type ? null : type)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                  initialFilter === type
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-400 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-400"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            Sort
            <select
              value={initialSort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Count */}
        {allDesigns.length > 0 && (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-600">
            Showing {allDesigns.length}
            {cursor ? "+" : ""}{" "}
            {allDesigns.length === 1 ? "design" : "designs"}
          </p>
        )}

        {allDesigns.length > 0 ? (
          <>
            <ul
              className={`mt-6 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 dark:border-zinc-900 ${
                isPending ? "opacity-50" : ""
              }`}
            >
              {allDesigns.map((design) => (
                <li key={design.id}>
                  <Link
                    href={`/marketplace/${design.id}`}
                    className="group relative block overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 transition-all duration-300 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-500/30 dark:hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]"
                  >
                    <ProductMockup
                      imageUrl={design.image_url}
                      productType={design.product_type}
                      alt={
                        design.product_type
                          ? `${design.product_type} design`
                          : "Design"
                      }
                      loading="lazy"
                      className="transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight text-white">
                          {design.title ??
                            (design.product_type
                              ? `${design.product_type} Design`
                              : "Design")}
                        </p>
                        {design.price_cents !== null && (
                          <span className="shrink-0 text-xs font-medium text-violet-400">
                            €{(design.price_cents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {design.creator_name && (
                        <p className="mt-0.5 text-xs text-zinc-400">
                          by {design.creator_name}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {cursor && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 transition-all duration-300 hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
                {loadMoreError && (
                  <p className="text-xs text-red-500">{loadMoreError}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center border-t border-zinc-100 py-24 text-center dark:border-zinc-900">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {isFiltering ? "No designs match" : "No designs published yet"}
            </p>
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-600">
              {isFiltering
                ? "Try a different search term, sort, or product filter."
                : "Creators are just getting started — check back soon."}
            </p>
            {isFiltering && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-xs text-zinc-400 underline underline-offset-2 transition-colors hover:text-violet-500 dark:text-zinc-600 dark:hover:text-violet-400"
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
