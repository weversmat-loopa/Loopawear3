-- ==============================================================
-- FUNCTION: decrement_generation_credits
-- ==============================================================
-- Trekt atomisch 1 generatiecredit af van een user.
--
-- Retourneert:
--   integer >= 0  als de aftrek geslaagd is (= nieuw saldo)
--   -1            als de user al 0 credits heeft (geen wijziging)
--
-- security definer zodat de functie altijd profiles kan updaten,
-- ook als de caller beperkte RLS rechten heeft.
--
-- Gebruikt in: src/app/api/designs/[id]/generate/route.ts
-- ==============================================================

create or replace function public.decrement_generation_credits(user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  new_credits integer;
begin
  update public.profiles
  set    generation_credits = generation_credits - 1
  where  id = user_id
    and  generation_credits > 0
  returning generation_credits into new_credits;

  if not found then
    return -1;
  end if;

  return new_credits;
end;
$$;
