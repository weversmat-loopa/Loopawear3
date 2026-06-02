"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { archiveDesign, unarchiveDesign, deleteDesignPermanently } from "@/app/admin/actions";

type Design = {
  id: string;
  title: string | null;
  prompt: string;
  product_type: string | null;
  image_url: string | null;
  status: string;
  price_cents: number | null;
  archived_at: string | null;
  creator_id: string;
  created_at: string;
};

type Props = {
  designs: Design[];
  creatorNames: Record<string, string>;
  initialFilter: string;
  error?: string;
  success?: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  archived: "Archived",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  pending_review: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
  published: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  archived: "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
];

function DeleteDialog({
  design,
  onClose,
}: {
  design: Design;
  onClose: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const designName =
    design.title ?? (design.product_type ? `${design.product_type} Design` : "Design");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Permanently delete design?
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          <strong className="text-zinc-800 dark:text-zinc-200">{designName}</strong> will be
          removed from the database permanently. This cannot be undone.
        </p>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Type <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">DELETE</span> to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoFocus
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-600"
        />
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Cancel
          </button>
          <form
            action={deleteDesignPermanently}
            onSubmit={() => startTransition(() => {})}
          >
            <input type="hidden" name="designId" value={design.id} />
            <input type="hidden" name="confirm" value={confirmText} />
            <button
              type="submit"
              disabled={confirmText !== "DELETE" || isPending}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Deleting…" : "Delete permanently"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminDesignsClient({
  designs,
  creatorNames,
  initialFilter,
  error,
  success,
}: Props) {
  const [filter, setFilter] = useState(initialFilter);
  const [deleteTarget, setDeleteTarget] = useState<Design | null>(null);
  const [, startTransition] = useTransition();

  const filtered = designs.filter((d) => {
    if (filter === "all") return true;
    if (filter === "archived") return d.archived_at !== null;
    return d.status === filter && d.archived_at === null;
  });

  const counts: Record<string, number> = {
    all: designs.length,
    pending_review: designs.filter((d) => d.status === "pending_review" && !d.archived_at).length,
    published: designs.filter((d) => d.status === "published" && !d.archived_at).length,
    draft: designs.filter((d) => d.status === "draft" && !d.archived_at).length,
    archived: designs.filter((d) => d.archived_at !== null).length,
  };

  return (
    <main className="flex flex-1 flex-col px-6 py-12 md:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Designs
          </h1>
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            {designs.length} total
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
            {success}
          </p>
        )}

        {/* Filter tabs */}
        <div className="mt-6 flex flex-wrap gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
              }`}
            >
              {label}
              {counts[key] !== undefined && (
                <span className="ml-1.5 opacity-60">{counts[key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Design list */}
        {filtered.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {filtered.map((design) => {
              const isArchived = design.archived_at !== null;
              const displayStatus = isArchived ? "archived" : design.status;
              const createdDate = new Date(design.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const creatorName = creatorNames[design.creator_id] ?? design.creator_id.slice(0, 8);
              const designName =
                design.title ?? (design.product_type ? `${design.product_type} Design` : "Design");

              return (
                <li
                  key={design.id}
                  className={`overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 ${
                    isArchived
                      ? "border-zinc-100 opacity-60 dark:border-zinc-800"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {design.image_url ? (
                        <Image
                          src={design.image_url}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {designName}
                        </p>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLASSES[displayStatus] ?? STATUS_CLASSES.draft
                          }`}
                        >
                          {STATUS_LABELS[displayStatus] ?? displayStatus}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        by {creatorName} · {createdDate}
                        {design.price_cents !== null && (
                          <> · €{(design.price_cents / 100).toFixed(2)}</>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      {!isArchived ? (
                        <form action={archiveDesign}>
                          <input type="hidden" name="designId" value={design.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                          >
                            Archive
                          </button>
                        </form>
                      ) : (
                        <>
                          <form action={unarchiveDesign}>
                            <input type="hidden" name="designId" value={design.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                            >
                              Restore
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(design)}
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-950 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No designs</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              No designs match the current filter.
            </p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteDialog
          design={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}
