import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false },
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Order placed",
  fulfillment_pending: "Preparing",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<string, string> = {
  paid: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  fulfillment_pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
  shipped:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  cancelled:
    "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BuyerOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ordersRaw } = await supabase
    .from("orders")
    .select(
      "id, design_id, size, quantity, amount_total_cents, status, created_at"
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const orders = ordersRaw ?? [];

  const designIds = [
    ...new Set(
      orders
        .map((o) => o.design_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let designsById: Record<
    string,
    { title: string | null; product_type: string | null }
  > = {};
  if (designIds.length > 0) {
    const { data: designsRaw } = await supabase
      .from("designs")
      .select("id, title, product_type")
      .in("id", designIds);
    designsById = Object.fromEntries(
      (designsRaw ?? []).map((d) => [
        d.id,
        { title: d.title, product_type: d.product_type },
      ])
    );
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/account"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Account
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Your orders
          </h1>
          {orders.length > 0 && (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {orders.length}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Past purchases. Newest first.
        </p>

        {orders.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {orders.map((order) => {
              const design = order.design_id
                ? designsById[order.design_id]
                : null;
              const designName =
                design?.title ??
                (design?.product_type
                  ? `${design.product_type} Design`
                  : "Design");
              const statusLabel =
                STATUS_LABELS[order.status] ?? order.status;
              const statusClass =
                STATUS_CLASSES[order.status] ?? STATUS_CLASSES.cancelled;
              const totalEuros = (order.amount_total_cents / 100).toFixed(2);
              const shortId = order.id.slice(0, 8).toUpperCase();

              return (
                <li
                  key={order.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="flex items-start justify-between gap-4 p-5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          #{shortId}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {designName}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Size {order.size} · {order.quantity}{" "}
                        {order.quantity === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        €{totalEuros}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">View →</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              No orders yet
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Find something you love in the{" "}
              <Link
                href="/marketplace"
                className="underline underline-offset-2 transition-colors hover:text-violet-600"
              >
                marketplace
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
