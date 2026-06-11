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
  // Design counts
  designs_total: number;
  designs_published: number;
  designs_pending: number;
  designs_draft: number;
  designs_archived: number;
  // Sales (paid + fulfillment_pending + shipped only)
  earnings_cents: number;
  order_count: number;
  items_sold: number;
  avg_per_order_cents: number;
  // Top designs for expanded row
  top_designs: Array<{
    id: string;
    title: string | null;
    image_url: string | null;
    earnings_cents: number;
    order_count: number;
  }>;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function euros(cents: number) {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type SortKey = "earnings_desc" | "designs_desc" | "sales_desc" | "name_asc";

// ── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "orange" | "blue" | "green";
}) {
  const bg =
    accent === "orange"
      ? "bg-brand-orange"
      : accent === "blue"
      ? "bg-brand-blue"
      : accent === "green"
      ? "bg-brand-green"
      : "bg-paper dark:bg-zinc-900/60";

  const textMain = accent ? "text-white" : "text-ink";
  const textSub = accent ? "text-white/70" : "text-zinc-500 dark:text-zinc-400";
  const textLabel = accent ? "text-white/80" : "text-zinc-500 dark:text-zinc-400";

  return (
    <div className={`ink-card rounded-xl p-5 ${bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${textLabel}`}>{label}</p>
      <p className={`mt-3 font-display text-2xl tabular-nums leading-none ${textMain}`}>{value}</p>
      {sub && <p className={`mt-1.5 text-xs ${textSub}`}>{sub}</p>}
    </div>
  );
}

// ── Creator row ────────────────────────────────────────────────────────────

function CreatorRow({ creator, rank }: { creator: AdminCreator; rank: number }) {
  const [open, setOpen] = useState(false);

  const name = creator.display_name ?? creator.id.slice(0, 8).toUpperCase();
  const isActive = creator.order_count > 0;

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

        {/* Name + design counts */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {creator.designs_published > 0 && (
              <span className="rounded-full border border-brand-green/30 bg-brand-green/10 px-1.5 py-0 text-[10px] font-semibold text-brand-green dark:border-brand-green/40 dark:bg-brand-green/20">
                {creator.designs_published} live
              </span>
            )}
            {creator.designs_pending > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                {creator.designs_pending} pending
              </span>
            )}
            {creator.designs_draft > 0 && (
              <span className="text-[10px] text-zinc-400">
                {creator.designs_draft} draft
              </span>
            )}
          </div>
        </div>

        {/* Sales count — hidden on small screens */}
        <div className="hidden shrink-0 text-right sm:block">
          <p className="font-display text-sm text-ink">{creator.order_count}</p>
          <p className="text-xs text-zinc-400">sales</p>
        </div>

        {/* Earnings + payout badge */}
        <div className="shrink-0 text-right">
          <p className="font-display text-base text-ink">{euros(creator.earnings_cents)}</p>
          {isActive ? (
            <span className="mt-0.5 inline-block rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              {euros(creator.earnings_cents)} open
            </span>
          ) : (
            <p className="text-xs text-zinc-400">no sales</p>
          )}
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
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Creator ID</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-500">{creator.id.slice(0, 8).toUpperCase()}</dd>
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
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pending review</dt>
              <dd className="mt-1 font-display text-sm text-amber-600 dark:text-amber-400">{creator.designs_pending}</dd>
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
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total sales</dt>
              <dd className="mt-1 font-display text-sm text-ink">{creator.order_count}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Items sold</dt>
              <dd className="mt-1 font-display text-sm text-ink">{creator.items_sold}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total earnings</dt>
              <dd className="mt-1 font-display text-sm text-brand-blue">{euros(creator.earnings_cents)}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Avg per order</dt>
              <dd className="mt-1 font-display text-sm text-ink">{euros(creator.avg_per_order_cents)}</dd>
            </div>

            <div className="col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Payout status</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {isActive ? `${euros(creator.earnings_cents)} outstanding` : "—"}
                </span>
                <span className="text-xs text-zinc-400">manual payout</span>
              </dd>
            </div>

          </dl>

          {/* Top designs */}
          {creator.top_designs.length > 0 && (
            <div className="mt-5 border-t border-ink/10 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Top designs</p>
              <ul className="space-y-2">
                {creator.top_designs.map((d) => {
                  const title = d.title ?? `Design ${d.id.slice(0, 6).toUpperCase()}`;
                  return (
                    <li key={d.id} className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-paper-2">
                        {d.image_url ? (
                          <Image
                            src={d.image_url}
                            alt={title}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <DoodleStar className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />
                          </div>
                        )}
                      </div>
                      {/* Title */}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/marketplace/${d.id}`}
                          target="_blank"
                          className="block truncate text-xs font-medium text-ink transition-colors hover:text-brand-blue"
                        >
                          {title}
                        </Link>
                        <p className="text-[10px] text-zinc-400">{d.order_count} sale{d.order_count !== 1 ? "s" : ""}</p>
                      </div>
                      {/* Revenue */}
                      <span className="shrink-0 font-display text-sm text-ink">{euros(d.earnings_cents)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("earnings_desc");

  // ── KPI aggregations ────────────────────────────────────────────────────
  const totalCreators = creators.length;
  const activeCreators = creators.filter((c) => c.order_count > 0).length;
  const totalOwedCents = creators.reduce((sum, c) => sum + c.earnings_cents, 0);

  // ── Filter + sort ────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = q
      ? creators.filter((c) => {
          const name = c.display_name ?? c.id;
          return name.toLowerCase().includes(q);
        })
      : creators;

    return [...result].sort((a, b) => {
      if (sort === "earnings_desc") return b.earnings_cents - a.earnings_cents;
      if (sort === "designs_desc") return b.designs_total - a.designs_total;
      if (sort === "sales_desc") return b.order_count - a.order_count;
      if (sort === "name_asc") {
        const na = a.display_name ?? a.id;
        const nb = b.display_name ?? b.id;
        return na.localeCompare(nb);
      }
      return 0;
    });
  }, [creators, search, sort]);

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
      {/* ── KPI cards ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total creators"
          value={totalCreators}
          sub="with ≥1 design or sale"
        />
        <KpiCard
          label="Active creators"
          value={activeCreators}
          sub="with ≥1 completed sale"
          accent="blue"
        />
        <KpiCard
          label="Total owed"
          value={euros(totalOwedCents)}
          sub="manual payout pending"
          accent="green"
        />
      </div>

      {/* ── Controls bar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search creators…"
          className="w-full rounded-lg border-2 border-ink/10 bg-paper px-3 py-1.5 text-sm text-ink placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 sm:w-56"
        />

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border-2 border-ink/10 bg-paper px-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <option value="earnings_desc">Highest earnings</option>
          <option value="sales_desc">Most sales</option>
          <option value="designs_desc">Most designs</option>
          <option value="name_asc">Name A → Z</option>
        </select>
      </div>

      {/* ── List ── */}
      {sorted.length === 0 ? (
        <div className="ink-card flex flex-col items-center justify-center rounded-xl bg-paper py-16 text-center dark:bg-zinc-900/60">
          <DoodleSparkle className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="font-display text-lg text-zinc-400">No creators match</p>
          <p className="mt-1 text-sm text-zinc-400">Try a different search term.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((creator, i) => (
            <CreatorRow key={creator.id} creator={creator} rank={i + 1} />
          ))}
        </ul>
      )}

      {sorted.length > 0 && (
        <p className="mt-6 text-center text-xs text-zinc-400">
          Showing {sorted.length} of {creators.length} creator{creators.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
