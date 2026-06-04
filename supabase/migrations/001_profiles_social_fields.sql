-- Migration 001: Add social/profile fields to the profiles table
-- Run this in the Supabase SQL editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url    text,
  ADD COLUMN IF NOT EXISTS banner_url    text,
  ADD COLUMN IF NOT EXISTS website_url   text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url    text;

-- Herbouw de public_profiles view met de 8 publiek-veilige kolommen.
--
-- Bewust NIET opgenomen: email, generation_credits, role.
-- Die zijn uitsluitend leesbaar voor de eigenaar zelf (via de profiles-tabel
-- met owner-only SELECT-policy, zie migratie 003).
--
-- security_barrier = true wordt in migratie 003 ingesteld; de view
-- zelf is SECURITY DEFINER (Postgres-default) zodat anonieme aanroepers
-- via de view de tabel kunnen lezen zonder directe tabel-rechten te hebben.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  bio,
  avatar_url,
  banner_url,
  website_url,
  instagram_url,
  tiktok_url
FROM public.profiles;
