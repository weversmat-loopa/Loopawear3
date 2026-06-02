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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Explore designs
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Discover original AI-generated apparel from independent creators.
          Every piece starts with a prompt.{" "}
          <Link
            href="/generate"
            className="text-zinc-900 underline underline-offset-2 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
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
            className="w-full rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
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
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                initialFilter === null
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              All
            </button>
            {PRODUCT_FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(initialFilter === type ? null : type)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  initialFilter === type
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            Sort
            <select
              value={initialSort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none transition-colors focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
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
          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
            Showing {allDesigns.length}
            {cursor ? "+" : ""}{" "}
            {allDesigns.length === 1 ? "design" : "designs"}
          </p>
        )}

        {allDesigns.length > 0 ? (
          <>
            <ul
              className={`mt-6 grid grid-cols-2 gap-x-4 gap-y-8 border-t border-zinc-100 pt-8 transition-opacity md:grid-cols-3 lg:grid-cols-4 dark:border-zinc-800 ${
                isPending ? "opacity-50" : ""
              }`}
            >
              {allDesigns.map((design) => (
                <li key={design.id}>
                  <Link
                    href={`/marketplace/${design.id}`}
                    className="group flex flex-col"
                  >
                    <div className="overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <ProductMockup
                        imageUrl={design.image_url}
                        productType={design.product_type}
                        placement={design.placement}
                        alt={
                          design.product_type
                            ? `${design.product_type} design`
                            : "Design"
                        }
                        loading="lazy"
                        className="transition-transform duration-300 group-hover:scale-[1.02]"
                        mockupUrl={design.mockup_url}
                        mockupStatus={design.mockup_status}
                      />
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {design.title ??
                          (design.product_type
                            ? `${design.product_type} Design`
                            : "Design")}
                      </p>
                      {design.creator_name && (
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          by {design.creator_name}
                        </p>
                      )}
                      {design.price_cents !== null && (
                        <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          €{(design.price_cents / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {cursor && (
              <div className="mt-12 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
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
          <div className="mt-6 flex flex-col items-center justify-center border-t border-zinc-100 py-24 text-center dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {isFiltering ? "No designs match" : "No designs published yet"}
            </p>
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
              {isFiltering
                ? "Try a different search term, sort, or product filter."
                : "Creators are just getting started — check back soon."}
            </p>
            {isFiltering && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-xs text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
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
