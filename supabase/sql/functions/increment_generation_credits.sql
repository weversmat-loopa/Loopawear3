-- ==============================================================
-- FUNCTION: increment_generation_credits
-- ==============================================================
-- Verhoogt de generatiecredits van een user met 1.
-- Gebruikt als refund wanneer de AI-generatie mislukt.
--
-- security definer zodat de functie altijd profiles kan updaten,
-- ook als de caller beperkte RLS rechten heeft.
--
-- Gebruikt in: src/app/api/designs/[id]/generate/route.ts
--   - bij fout vóór generatie start
--   - bij fout tijdens opslaan in storage
--   - bij fout bij updaten van image_url
-- ==============================================================

create or replace function public.increment_generation_credits(user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set    generation_credits = generation_credits + 1
  where  id = user_id;
end;
$$;
