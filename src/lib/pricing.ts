// ── Printful production cost ──────────────────────────────────────────────────
// Base cost per unit charged by Printful for the Bella + Canvas 3001 with DTG.
// Update this when Printful changes their pricing.
export const PRINTFUL_PRODUCTION_COST_CENTS = 1700; // €17.00 per shirt

// ── Revenue split ─────────────────────────────────────────────────────────────
// Applied to the PROFIT (sale price minus production cost), not to the gross
// sale price. Platform keeps the remainder (1 - CREATOR_SHARE).
export const CREATOR_SHARE = 0.6; // 60% of profit to creator

// ── Minimum allowed sale price ────────────────────────────────────────────────
// Must be strictly above PRINTFUL_PRODUCTION_COST_CENTS so every sale produces
// at least €1.00 of profit. Enforced at save-time (actions.ts) and at
// checkout (checkout route) to prevent below-cost orders from reaching Stripe.
export const MIN_PRICE_CENTS = 1800; // €18.00 (production cost + €1 minimum margin)

/**
 * Splits an order's revenue into platform and creator portions.
 *
 * Formula:
 *   profit = amountTotalCents − (PRINTFUL_PRODUCTION_COST_CENTS × quantity)
 *   creator_earnings = round(profit × CREATOR_SHARE)
 *   platform_fee     = profit − creator_earnings
 *
 * The profit is floored at 0 with Math.max as a safety net — it should never
 * be negative in practice because MIN_PRICE_CENTS is enforced upstream.
 */
export function calculateSplit(
  amountTotalCents: number,
  quantity: number
): { platform_fee_cents: number; creator_earnings_cents: number } {
  const productionCost = PRINTFUL_PRODUCTION_COST_CENTS * quantity;
  const profit = Math.max(0, amountTotalCents - productionCost);
  const creator_earnings_cents = Math.round(profit * CREATOR_SHARE);
  const platform_fee_cents = profit - creator_earnings_cents;
  return { platform_fee_cents, creator_earnings_cents };
}
