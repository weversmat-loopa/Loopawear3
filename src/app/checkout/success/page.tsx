import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import ProductMockup from "@/components/ui/ProductMockup";

export const metadata: Metadata = {
  title: "Order received",
  robots: { index: false },
};

type Props = {
  searchParams?: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params?.session_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Look up the order from the Stripe session_id we get back via the
  // success_url. The Stripe webhook may not have inserted the row yet
  // (rare but possible) — in that case we fall back to a generic
  // confirmation. Buyers who refresh will see the personalized view.
  let order:
    | {
        id: string;
        design_id: string | null;
        size: string;
        quantity: number;
        amount_total_cents: number;
      }
    | null = null;
  let design: {
    title: string | null;
    product_type: string | null;
    image_url: string | null;
  } | null = null;

  if (sessionId && user) {
    const { data: orderData } = await supabase
      .from("orders")
      .select("id, design_id, size, quantity, amount_total_cents")
      .eq("stripe_session_id", sessionId)
      .eq("buyer_id", user.id)
      .maybeSingle();
    order = orderData ?? null;

    if (order?.design_id) {
      const { data: designData } = await supabase
        .from("designs")
        .select("title, product_type, image_url")
        .eq("id", order.design_id)
        .maybeSingle();
      design = designData ?? null;
    }
  }

  const designName =
    design?.title ??
    (design?.product_type ? `${design.product_type} Design` : "Design");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <svg
            className="h-5 w-5 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Order received!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Payment confirmed. A receipt has been sent to your email by Stripe.
        </p>

        {order ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid grid-cols-[7rem_1fr] gap-0">
              <div className="border-r border-zinc-100 dark:border-zinc-800">
                <ProductMockup
                  imageUrl={design?.image_url ?? null}
                  productType={design?.product_type ?? null}
                  alt={designName}
                />
              </div>
              <div className="flex flex-col justify-center gap-1 p-4">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {designName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Size {order.size} · {order.quantity}{" "}
                  {order.quantity === 1 ? "item" : "items"}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  €{(order.amount_total_cents / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            We&apos;ll process your order and update you when it ships.
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {order ? (
            <>
              <Link
                href={`/account/orders/${order.id}`}
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                View order →
              </Link>
              <Link
                href="/marketplace"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Back to marketplace
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Browse marketplace →
              </Link>
              <Link
                href="/account/orders"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                View orders
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
