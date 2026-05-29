import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { markFulfillmentPending, markShipped, cancelOrder } from "../actions";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false },
};

type AdminOrdersPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  fulfillment_pending: "Fulfillment pending",
  shipped: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
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
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
};

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") notFound();

  // Read orders with the service-role client. Guest orders have
  // buyer_id = null and are not returned by the RLS policies bound to the
  // user client (which scope rows to buyer_id = auth.uid()), so logged-in
  // buyer orders showed up here but guest orders did not. The admin role
  // is already verified above, so bypassing RLS for this read is safe.
  const service = createServiceClient();

  const { data: ordersRaw } = await service
    .from("orders")
    .select(
      "id, design_id, creator_id, size, quantity, amount_total_cents, creator_earnings_cents, status, tracking_number, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = ordersRaw ?? [];

  const params = await searchParams;
  const error = params?.error;
  const success = params?.success;

  return (
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Orders
          </h1>
          {orders.length > 0 && (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {orders.length}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          All orders. Newest first. Manual fulfillment.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {success && (
          <p className="mt-4 text-sm text-green-600 dark:text-green-400">
            {success}
          </p>
        )}

        {orders.length > 0 ? (
          <ul className="mt-6 space-y-4">
            {orders.map((order) => {
              const shortId = order.id.slice(0, 8).toUpperCase();
              const statusLabel = STATUS_LABELS[order.status] ?? order.status;
              const statusClass =
                STATUS_CLASSES[order.status] ?? STATUS_CLASSES.cancelled;
              const totalEuros = (order.amount_total_cents / 100).toFixed(2);
              const earningsEuros = (
                order.creator_earnings_cents / 100
              ).toFixed(2);
              const createdDate = new Date(order.created_at).toLocaleDateString(
                "en-GB",
                { day: "2-digit", month: "short", year: "numeric" }
              );

              const addressParts = [
                order.shipping_line1,
                order.shipping_line2,
                order.shipping_city,
                order.shipping_state,
                order.shipping_postal_code,
                order.shipping_country,
              ].filter(Boolean);
              const fullAddress = addressParts.join(", ");

              const isActionable =
                order.status === "paid" ||
                order.status === "fulfillment_pending";

              return (
                <li
                  key={order.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        #{shortId}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">{createdDate}</span>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Ship to
                      </dt>
                      <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                        {order.shipping_name}
                      </dd>
                      <dd className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {fullAddress}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Design
                      </dt>
                      <dd className="mt-0.5">
                        <Link
                          href={`/account/designs/${order.design_id}`}
                          className="font-mono text-xs text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                        >
                          {order.design_id.slice(0, 8).toUpperCase()}
                        </Link>
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Creator
                      </dt>
                      <dd className="mt-0.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {order.creator_id
                          ? order.creator_id.slice(0, 8).toUpperCase()
                          : "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Item
                      </dt>
                      <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                        {order.size} × {order.quantity}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Total
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        €{totalEuros}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Creator earnings
                      </dt>
                      <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                        €{earningsEuros}
                      </dd>
                    </div>

                    {order.tracking_number && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Tracking
                        </dt>
                        <dd className="mt-0.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {order.tracking_number}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {isActionable && (
                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      {order.status === "paid" && (
                        <form action={markFulfillmentPending}>
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                          >
                            Mark fulfillment pending →
                          </button>
                        </form>
                      )}

                      {order.status === "fulfillment_pending" && (
                        <form
                          action={markShipped}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <input
                            type="text"
                            name="trackingNumber"
                            placeholder="Tracking number (optional)"
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                          >
                            Mark shipped →
                          </button>
                        </form>
                      )}

                      <form action={cancelOrder}>
                        <input
                          type="hidden"
                          name="orderId"
                          value={order.id}
                        />
                        <button
                          type="submit"
                          className="text-xs text-zinc-400 transition-colors hover:text-red-500"
                        >
                          Cancel order
                        </button>
                      </form>
                    </div>
                  )}
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
              Orders will appear here after checkout.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
