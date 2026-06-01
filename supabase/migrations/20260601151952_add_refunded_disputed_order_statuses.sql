-- Voeg 'refunded' en 'disputed' toe aan de orders.status CHECK-constraint.
-- De Stripe webhook gebruikt beide waarden maar de originele constraint liet
-- ze niet toe, waardoor refund- en dispute-events een DB error gaven en Stripe
-- de webhook bleef herproberen terwijl orders op 'paid' bleven staan.

ALTER TABLE public.orders
  DROP CONSTRAINT orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'paid',
    'fulfillment_pending',
    'shipped',
    'cancelled',
    'refunded',
    'disputed'
  ]));
