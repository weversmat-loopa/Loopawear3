-- Order tracking velden voor de Printful package.shipped webhook.
--
-- `tracking_number` en `shipped_at` bestaan al sinds de baseline; hier voegen
-- we enkel de twee ontbrekende velden toe zodat de webhook de volledige
-- verzendinfo van Printful kan opslaan en de koper een klikbare trackinglink
-- ziet op de order-detailpagina.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS carrier text;
