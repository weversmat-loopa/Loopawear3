"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { sendToPrintful, markShipped, cancelOrder } from "@/app/admin/actions";
import { DoodleSparkle } from "@/components/ui/Doodles";

// ── Types ──────────────────────────────────────────────────────────────────

export type AdminOrder = {
  id: string;
  created_at: string;
  status: string;
  amount_total_cents: number;
  creator_earnings_cents: number | null;
  platform_fee_cents: number | null;
  design_id: string | null;
  creator_id: string | null;
  size: string | null;
  quantity: number | null;
  tracking_number: string | null;
  shipping_name: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  // Joined fields
  design_title: string | null;
  design_mockup_url: string | null;
  design_image_url: string | null;
  creator_name: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function euros(cents: number) {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ALL_STATUSES = ["paid", "fulfillment_pending", "shipped", "cancelled", "refunded", "disputed"] as const;

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  fulfillment_pending: "In fulfillment",
  shipped: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
};

const STATUS_BADGE: Record<string, string> = {
  paid: "border-brand-blue/30 bg-brand-blue/10 text-brand-blue dark:border-brand-blue/40 dark:bg-brand-blue/20",
  fulfillment_pending: "border-amber-300/40 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/50 dark:text-amber-400",
  shipped: "border-brand-green/30 bg-brand-green/10 text-brand-green dark:border-brand-green/40 dark:bg-brand-green/20",
  cancelled: "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  refunded: "border-brand-orange/30 bg-brand-orange/10 text-brand-orange dark:border-brand-orange/40 dark:bg-brand-orange/20",
  disputed: "border-red-300/40 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/50 dark:text-red-400",
};

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

// ── Row component ──────────────────────────────────────────────────────────

function OrderRow({ order }: { order: AdminOrder }) {
  const [open, setOpen] = useState(false);

  const shortId = order.id.slice(0, 8).toUpperCase();
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const badgeClass = STATUS_BADGE[order.status] ?? STATUS_BADGE.cancelled;

  const createdDate = new Date(order.created_at).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const createdTime = new Date(order.created_at).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const thumbnail = order.design_mockup_url ?? order.design_image_url;
  const designTitle = order.design_title ?? (order.design_id ? `Design ${order.design_id.slice(0, 6).toUpperCase()}` : "—");

  const platformCents = order.platform_fee_cents ?? 0;
  const creatorCents = order.creator_earnings_cents ?? 0;

  const addressParts = [
    order.shipping_line1,
    order.shipping_line2,
    order.shipping_city,
    order.shipping_state,
    order.shipping_postal_code,
    order.shipping_country,
  ].filter(Boolean);

  const isActionable = order.status === "paid" || order.status === "fulfillment_pending";

  return (
    <li className="ink-card overflow-hidden rounded-xl bg-paper transition-shadow hover:shadow-md dark:bg-zinc-900/60">
      {/* ── Collapsed row ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        {/* Thumbnail */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-ink/10 bg-paper-2">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={designTitle}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <DoodleSparkle className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
            </div>
          )}
        </div>

        {/* Design + creator */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{designTitle}</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {order.creator_name ?? (order.creator_id ? order.creator_id.slice(0, 8).toUpperCase() : "—")}
          </p>
        </div>

        {/* Amount */}
        <div className="hidden shrink-0 text-right sm:block">
          <p className="font-display text-base text-ink">{euros(order.amount_total_cents)}</p>
          <p className="text-xs text-zinc-400">
            {euros(platformCents)} platform
          </p>
        </div>

        {/* Status badge */}
        <span className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold md:inline-block ${badgeClass}`}>
          {statusLabel}
        </span>

        {/* Date */}
        <div className="hidden shrink-0 text-right lg:block">
          <p className="text-xs text-zinc-500">{createdDate}</p>
          <p className="text-xs text-zinc-400">{createdTime}</p>
        </div>

        {/* Mobile amount */}
        <span className="shrink-0 font-display text-sm text-ink sm:hidden">
          {euros(order.amount_total_cents)}
        </span>

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
          {/* Mobile status + date strip */}
          <div className="mb-4 flex flex-wrap items-center gap-2 md:hidden">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-zinc-400">{createdDate} · {createdTime}</span>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">

            {/* Order ID */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Order ID</dt>
              <dd className="mt-1 font-mono text-xs text-ink">#{shortId}</dd>
            </div>

            {/* Design link */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Design</dt>
              <dd className="mt-1">
                {order.design_id ? (
                  <Link
                    href={`/marketplace/${order.design_id}`}
                    className="text-xs text-brand-blue underline underline-offset-2 hover:opacity-80"
                    target="_blank"
                  >
                    {designTitle}
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </dd>
            </div>

            {/* Creator */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Creator</dt>
              <dd className="mt-1">
                {order.creator_id ? (
                  <Link
                    href={`/creators/${order.creator_id}`}
                    className="text-xs text-brand-blue underline underline-offset-2 hover:opacity-80"
                    target="_blank"
                  >
                    {order.creator_name ?? order.creator_id.slice(0, 8).toUpperCase()}
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </dd>
            </div>

            {/* Item */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Item</dt>
              <dd className="mt-1 text-xs text-ink">
                {[order.size, order.quantity ? `×${order.quantity}` : null].filter(Boolean).join(" ") || "—"}
              </dd>
            </div>

            {/* Total paid */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total paid</dt>
              <dd className="mt-1 font-display text-sm text-ink">{euros(order.amount_total_cents)}</dd>
            </div>

            {/* Profit split */}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Platform fee</dt>
              <dd className="mt-1 font-display text-sm text-brand-blue">{euros(platformCents)}</dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Creator earnings</dt>
              <dd className="mt-1 font-display text-sm text-brand-green">{euros(creatorCents)}</dd>
            </div>

            {/* Ship to */}
            <div className="col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Ship to</dt>
              <dd className="mt-1 text-xs text-ink">
                {order.shipping_name && <span className="font-medium">{order.shipping_name}</span>}
                {addressParts.length > 0 && (
                  <span className="block text-zinc-500">{addressParts.join(", ")}</span>
                )}
                {!order.shipping_name && addressParts.length === 0 && "—"}
              </dd>
            </div>

            {/* Tracking */}
            {order.tracking_number && (
              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tracking</dt>
                <dd className="mt-1 font-mono text-xs text-ink">{order.tracking_number}</dd>
              </div>
            )}
          </dl>

          {/* Action buttons */}
          {isActionable && (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
              {order.status === "paid" && (
                <form action={sendToPrintful}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper transition-opacity hover:opacity-75"
                  >
                    Send to Printful →
                  </button>
                </form>
              )}

              {order.status === "fulfillment_pending" && (
                <form action={markShipped} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input
                    type="text"
                    name="trackingNumber"
                    placeholder="Tracking number (optional)"
                    className="rounded-lg border-2 border-ink/10 bg-paper px-3 py-1.5 text-xs text-ink placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-brand-green px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-75"
                  >
                    Mark shipped →
                  </button>
                </form>
              )}

              <form action={cancelOrder}>
                <input type="hidden" name="orderId" value={order.id} />
                <button
                  type="submit"
                  className="text-xs text-zinc-400 transition-colors hover:text-red-500"
                >
                  Cancel order
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ── Main client component ──────────────────────────────────────────────────

export default function AdminOrdersClient({
  orders,
  error,
  success,
}: {
  orders: AdminOrder[];
  error?: string;
  success?: string;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("date_desc");

  const filtered = useMemo(() => {
    let result = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

    result = [...result].sort((a, b) => {
      if (sort === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "amount_desc") return b.amount_total_cents - a.amount_total_cents;
      if (sort === "amount_asc") return a.amount_total_cents - b.amount_total_cents;
      return 0;
    });

    return result;
  }, [orders, statusFilter, sort]);

  // Count per status for filter buttons
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      c[o.status] = (c[o.status] ?? 0) + 1;
    }
    return c;
  }, [orders]);

  return (
    <div>
      {/* Flash messages */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          {success}
        </div>
      )}

      {/* ── Controls bar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {(["all", ...ALL_STATUSES] as const).map((s) => {
            const cnt = counts[s] ?? 0;
            if (s !== "all" && cnt === 0) return null;
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "border-ink bg-ink text-paper dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-ink/20 text-zinc-500 hover:border-ink/50 hover:text-ink dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {s === "all" ? "All" : STATUS_LABELS[s]}
                <span className="ml-1.5 tabular-nums opacity-60">{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border-2 border-ink/10 bg-paper px-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Highest amount</option>
          <option value="amount_asc">Lowest amount</option>
        </select>
      </div>

      {/* ── Orders list ── */}
      {filtered.length === 0 ? (
        <div className="ink-card flex flex-col items-center justify-center rounded-xl bg-paper py-20 text-center dark:bg-zinc-900/60">
          <DoodleSparkle className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="font-display text-lg text-zinc-400">No orders here</p>
          <p className="mt-1 text-sm text-zinc-400">
            {statusFilter === "all"
              ? "Orders will appear here after checkout."
              : `No ${STATUS_LABELS[statusFilter]?.toLowerCase()} orders yet.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}

      {filtered.length > 0 && (
        <p className="mt-6 text-center text-xs text-zinc-400">
          Showing {filtered.length} of {orders.length} orders
        </p>
      )}
    </div>
  );
}
