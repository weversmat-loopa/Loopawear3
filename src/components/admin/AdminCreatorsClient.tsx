"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { DoodleSparkle, DoodleStar } from "@/components/ui/Doodles";

// ── Types ──────────────────────────────────────────────────────────────────

export type AdminCreator = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
  // Design counts
  designs_total: number;
  designs_published: number;
  designs_archived: number;
  designs_draft: number;
  // Sales (paid + fulfillment_pending + shipped only)
  earnings_cents: number;
  items_sold: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function euros(cents: number) {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type SortKey = "earnings_desc" | "designs_desc" | "name_asc" | "joined_desc";

// ── Row ────────────────────────────────────────────────────────────────────

function CreatorRow({ creator, rank }: { creator: AdminCreator; rank: number }) {
  const [open, setOpen] = useState(false);

  const name = creator.display_name ?? creator.id.slice(0, 8).toUpperCase();
  const joinedDate = new Date(creator.joined_at).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <li className="ink-card overflow-hidden rounded-xl bg-paper transition-shadow hover:shadow-md dark:bg-zinc-900/60">
      {/* ── Collapsed row ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        {/* Rank */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-2 font-display text-sm text-zinc-500 dark:bg-zinc-800">
          {rank}
        </span>

        {/* Avatar */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-ink/10 bg-paper-2">
          {creator.avatar_url ? (
            <Image
              src={creator.avatar_url}
              alt={name}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <DoodleSparkle className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
            </div>
          )}
        </div>

        {/* Name + design count */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {creator.designs_total} design{creator.designs_total !== 1 ? "s" : ""}
            {creator.designs_published > 0 && (
              <span className="ml-1 text-brand-green">· {creator.designs_published} live</span>
            )}
          </p>
        </div>

        {/* Items sold — hidden on small screens */}
        <div className="hidden shrink-0 text-right sm:block">
          <p className="font-display text-sm text-ink">{creator.items_sold}</p>
          <p className="text-xs text-zinc-400">items sold</p>
        </div>

        {/* Earnings */}
        <div className="shrink-0 text-right">
          <p className="font-display text-base text-ink">{euros(creator.earnings_cents)}</p>
          <p className="text-xs text-zinc-400">earnings</p>
        </div>

        {/* Chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ── Expanded detail ── */}
      {open && (
        <div className="border-t-2 border-dashed border-ink/10 px-5 pb-5 pt-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Joined</dt>
              <dd className="mt-1 text-xs text-ink">{joinedDate}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total designs</dt>
              <dd className="mt-1 font-display text-sm text-ink">{creator.designs_total}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Published</dt>
              <dd className="mt-1 font-display text-sm text-brand-green">{creator.designs_published}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Drafts</dt>
              <dd className="mt-1 font-display text-sm text-zinc-500">{creator.designs_draft}</dd>
            </div>

            {creator.designs_archived > 0 && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Archived</dt>
                <dd className="mt-1 font-display text-sm text-zinc-400">{creator.designs_archived}</dd>
              </div>
            )}

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Items sold</dt>
              <dd className="mt-1 font-display text-sm text-ink">{creator.items_sold}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total earnings</dt>
              <dd className="mt-1 font-display text-sm text-brand-blue">{euros(creator.earnings_cents)}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Creator ID</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-500">{creator.id.slice(0, 8).toUpperCase()}</dd>
            </div>

          </dl>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-ink/10 pt-4">
            <Link
              href={`/creators/${creator.id}`}
              target="_blank"
              className="rounded-full border-2 border-ink/10 px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              Public profile ↗
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

// ── Main client component ──────────────────────────────────────────────────

export default function AdminCreatorsClient({ creators }: { creators: AdminCreator[] }) {
  const [sort, setSort] = useState<SortKey>("earnings_desc");

  const sorted = useMemo(() => {
    return [...creators].sort((a, b) => {
      if (sort === "earnings_desc") return b.earnings_cents - a.earnings_cents;
      if (sort === "designs_desc") return b.designs_total - a.designs_total;
      if (sort === "name_asc") {
        const na = a.display_name ?? a.id;
        const nb = b.display_name ?? b.id;
        return na.localeCompare(nb);
      }
      if (sort === "joined_desc") return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
      return 0;
    });
  }, [creators, sort]);

  if (creators.length === 0) {
    return (
      <div className="ink-card flex flex-col items-center justify-center rounded-xl bg-paper py-20 text-center dark:bg-zinc-900/60">
        <DoodleStar className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="font-display text-lg text-zinc-400">No creators yet</p>
        <p className="mt-1 text-sm text-zinc-400">Creators will appear here once they upload a design.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {creators.length} creator{creators.length !== 1 ? "s" : ""}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border-2 border-ink/10 bg-paper px-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <option value="earnings_desc">Highest earnings</option>
          <option value="designs_desc">Most designs</option>
          <option value="name_asc">Name A → Z</option>
          <option value="joined_desc">Newest first</option>
        </select>
      </div>

      {/* List */}
      <ul className="space-y-3">
        {sorted.map((creator, i) => (
          <CreatorRow key={creator.id} creator={creator} rank={i + 1} />
        ))}
      </ul>
    </div>
  );
}
