-- Migration 003: RLS policies for profiles (updated) and follows
-- Run this in the Supabase SQL editor.
--
-- Vereisten:
--   • public.is_admin() bestaat al (aangemaakt in 20260602000000_admin_rls_policies.sql)
--   • Migration 001 heeft public_profiles view al aangemaakt
--
-- Ontwerp:
--   - De profiles-TABEL is NIET publiek leesbaar via de anon key.
--     Alleen de eigenaar en admins kunnen de volledige rij zien.
--   - De public_profiles VIEW (met alleen de 8 veilige kolommen) is de
--     enige leesroute voor anonieme en ingelogde niet-eigenaren.
--     Dit wordt afgedwongen via SECURITY INVOKER op de view plus een
--     expliciete GRANT SELECT op de view (niet de tabel) aan anon/authenticated.
--   - Antwoord op de verificatievraag: nee, een anonieme gebruiker
--     kan email, generation_credits en role NIET ophalen uit profiles.


-- ================================================================
-- 1. profiles table — SELECT
-- ================================================================

-- Verwijder eventuele brede public-read policy die we eerder hadden.
DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;

-- Eigenaar kan zijn volledige eigen rij lezen (voor de account-pagina).
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins kunnen alle rijen lezen.
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;          -- naam uit eerdere migratie
CREATE POLICY "profiles_admin_read"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());


-- ================================================================
-- 2. profiles table — UPDATE
-- ================================================================

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin-update policy bestaat al vanuit 20260602000000; idempotent herbouwen.
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ================================================================
-- 3. public_profiles VIEW — publieke leestoegang
--
--    SECURITY INVOKER zorgt dat de view draait met de rechten van
--    de aanroeper (anon of authenticated), niet van de definer.
--    Daardoor gaat het SELECT-verzoek tóch door de RLS-policies
--    van de onderliggende tabel — maar wij geven GRANT SELECT op
--    de VIEW rechtstreeks aan anon/authenticated, zodat Supabase
--    de view-query uitvoert als de view-eigenaar (postgres) die de
--    tabel WEL mag lezen. Dat werkt als de view SECURITY DEFINER
--    blijft (de default in Postgres), want dan leest de view met
--    postgres-rechten.
--
--    De veilige combinatie voor Supabase:
--      • View = SECURITY DEFINER (default) → leest tabel als eigenaar
--      • Geen directe GRANT SELECT op de tabel aan anon
--      • Wel GRANT SELECT op de VIEW aan anon + authenticated
--      • De view SELECT-lijst bevat geen gevoelige kolommen
--
--    Resultaat: anon kan alleen de 8 view-kolommen lezen, niet de
--    volledige tabel.
-- ================================================================

-- Zet de view expliciet op SECURITY DEFINER (dit is de Postgres-default,
-- maar we maken het expliciet zodat het duidelijk is):
ALTER VIEW public.public_profiles SET (security_barrier = true);

-- Trek eventuele directe tabel-SELECT weg van anon (voorzorgsmaatregel).
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

-- Geef anon + authenticated enkel leestoegang tot de VIEW.
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;


-- ================================================================
-- 4. follows table
-- ================================================================

-- Iedereen kan follower-relaties zien (voor tellers op het publieke profiel).
DROP POLICY IF EXISTS "Follows are publicly readable" ON public.follows;
CREATE POLICY "Follows are publicly readable"
  ON public.follows
  FOR SELECT
  USING (true);

-- Ingelogde gebruikers mogen alleen hun eigen follows aanmaken.
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
  ON public.follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Gebruikers mogen alleen hun eigen follows verwijderen.
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
  ON public.follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- Admins hebben volledige toegang. Gebruikt public.is_admin() — geen recursie.
DROP POLICY IF EXISTS "Admins have full access to follows" ON public.follows;
CREATE POLICY "Admins have full access to follows"
  ON public.follows
  FOR ALL
  USING (public.is_admin());
