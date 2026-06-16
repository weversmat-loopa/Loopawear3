import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProductMockup from "@/components/ui/ProductMockup";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Order placed",
  fulfillment_pending: "Preparing",
  shipped: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Under review",
};

const STATUS_CLASSES: Record<string, string> = {
  paid: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  fulfillment_pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
  shipped:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  cancelled:
    "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  refunded:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400",
  disputed:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BuyerOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, design_id, size, quantity, unit_price_cents, amount_total_cents, status, tracking_number, tracking_url, carrier, shipped_at, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, created_at"
    )
    .eq("id", id)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  let design: {
    id: string;
    title: string | null;
    product_type: string | null;
    image_url: string | null;
    status: string;
  } | null = null;

  if (order.design_id) {
    const { data: designData } = await supabase
      .from("designs")
      .select("id, title, product_type, image_url, status")
      .eq("id", order.design_id)
      .maybeSingle();
    design = designData ?? null;
  }

  const designName =
    design?.title ??
    (design?.product_type ? `${design.product_type} Design` : "Design");
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const statusClass =
    STATUS_CLASSES[order.status] ?? STATUS_CLASSES.cancelled;
  const shortId = order.id.slice(0, 8).toUpperCase();
  const unitPriceEuros = (order.unit_price_cents / 100).toFixed(2);
  const totalEuros = (order.amount_total_cents / 100).toFixed(2);

  // Linking to the marketplace listing only makes sense if the design is
  // still publicly available — creators can unpublish after purchase.
  const designIsPublic = design?.status === "published";

  // ── Status flow ────────────────────────────────────────────────────────────
  // Each step is "done" (✓), "current" (active, pulsing), or "upcoming".
  // Derived from status + shipped_at so the flow stays in sync with the order
  // regardless of which path (admin fulfill or webhook) advanced it.
  // Cancelled / refunded / disputed orders skip the flow entirely — the status
  // badge above already communicates those terminal states.
  const isInactiveState =
    order.status === "cancelled" ||
    order.status === "refunded" ||
    order.status === "disputed";

  const isShipped = Boolean(order.shipped_at) || order.status === "shipped";
  const inProduction =
    order.status === "fulfillment_pending" || isShipped;
  // 'delivered' isn't tracked yet — the step is shown as a placeholder for a
  // future Printful delivered/returned event. It never auto-completes today.
  const isDelivered = false;

  type StepState = "done" | "current" | "upcoming";

  const flowSteps: { key: string; label: string; state: StepState }[] = [
    {
      key: "ordered",
      label: "Besteld",
      state: "done",
    },
    {
      key: "production",
      label: "In productie",
      state: inProduction ? "done" : "current",
    },
    {
      key: "shipped",
      label: "Verzonden",
      state: isShipped ? "done" : inProduction ? "current" : "upcoming",
    },
    {
      key: "delivered",
      label: "Geleverd",
      state: isDelivered ? "done" : isShipped ? "current" : "upcoming",
    },
  ];

  const addressLines = [
    order.shipping_line1,
    order.shipping_line2,
    [order.shipping_postal_code, order.shipping_city]
      .filter(Boolean)
      .join(" "),
    order.shipping_state,
    order.shipping_country,
  ].filter(Boolean) as string[];

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/account/orders"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Your orders
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Order #{shortId}
          </h1>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Placed {formatDate(order.created_at)}
        </p>

        {/* Status flow */}
        {!isInactiveState && (
          <section className="mt-8">
            <ol className="flex items-start">
              {flowSteps.map((step, i) => {
                const isLast = i === flowSteps.length - 1;
                const dotClass =
                  step.state === "done"
                    ? "border-green-500 bg-green-500 text-white dark:border-green-500 dark:bg-green-500"
                    : step.state === "current"
                      ? "border-violet-500 bg-violet-50 text-violet-600 dark:border-violet-400 dark:bg-violet-950 dark:text-violet-400"
                      : "border-zinc-300 bg-paper text-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600";
                const labelClass =
                  step.state === "upcoming"
                    ? "text-zinc-400 dark:text-zinc-600"
                    : "text-zinc-900 dark:text-zinc-100";
                // The connector between this step and the next is "filled" only
                // when the next step has been reached.
                const nextReached =
                  !isLast && flowSteps[i + 1].state === "done";
                return (
                  <li
                    key={step.key}
                    className="flex flex-1 flex-col items-center"
                  >
                    <div className="flex w-full items-center">
                      <div className="flex-1">
                        {i > 0 && (
                          <span
                            className={`block h-0.5 w-full ${
                              step.state === "done"
                                ? "bg-green-500"
                                : "bg-zinc-200 dark:bg-zinc-700"
                            }`}
                          />
                        )}
                      </div>
                      <span
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${dotClass}`}
                      >
                        {step.state === "done" ? "✓" : i + 1}
                      </span>
                      <div className="flex-1">
                        {!isLast && (
                          <span
                            className={`block h-0.5 w-full ${
                              nextReached
                                ? "bg-green-500"
                                : "bg-zinc-200 dark:bg-zinc-700"
                            }`}
                          />
                        )}
                      </div>
                    </div>
                    <span
                      className={`mt-2 text-center text-xs font-medium ${labelClass}`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Tracking */}
        {order.tracking_number && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
            <p className="text-xs font-medium text-green-700 dark:text-green-400">
              {order.carrier ? `Tracking · ${order.carrier}` : "Tracking number"}
            </p>
            {order.tracking_url ? (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 font-mono text-sm font-medium text-green-700 underline-offset-2 hover:underline dark:text-green-300"
              >
                {order.tracking_number}
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <p className="mt-0.5 font-mono text-sm text-green-900 dark:text-green-300">
                {order.tracking_number}
              </p>
            )}
          </div>
        )}

        {/* Item */}
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Item
            </h2>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-paper dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid grid-cols-[8rem_1fr] gap-0 sm:grid-cols-[10rem_1fr]">
              <div className="border-r border-zinc-100 dark:border-zinc-800">
                <ProductMockup
                  imageUrl={design?.image_url ?? null}
                  productType={design?.product_type ?? null}
                  alt={designName}
                />
              </div>
              <div className="flex flex-col justify-center gap-1.5 p-4">
                {designIsPublic && design ? (
                  <Link
                    href={`/marketplace/${design.id}`}
                    className="text-sm font-medium text-zinc-900 transition-colors hover:text-violet-600 dark:text-zinc-100"
                  >
                    {designName}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {designName}
                  </p>
                )}
                {design?.product_type && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {design.product_type}
                  </p>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Size {order.size} · {order.quantity}{" "}
                  {order.quantity === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Summary
            </h2>
          </div>

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 rounded-xl border border-zinc-200 bg-paper p-5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <dt className="text-zinc-500 dark:text-zinc-400">Unit price</dt>
            <dd className="text-right tabular-nums text-zinc-900 dark:text-zinc-100">
              €{unitPriceEuros}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Quantity</dt>
            <dd className="text-right tabular-nums text-zinc-900 dark:text-zinc-100">
              {order.quantity}
            </dd>
            <dt className="border-t border-zinc-100 pt-2.5 font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              Total
            </dt>
            <dd className="border-t border-zinc-100 pt-2.5 text-right text-base font-bold tabular-nums text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              €{totalEuros}
            </dd>
          </dl>
        </section>

        {/* Shipping */}
        <section className="mt-8 pb-16">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Shipping
            </h2>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-paper p-5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {order.shipping_name}
            </p>
            <div className="mt-1 space-y-0.5 text-zinc-500 dark:text-zinc-400">
              {addressLines.map((line, i) => (
                <p key={`${i}-${line}`}>{line}</p>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
