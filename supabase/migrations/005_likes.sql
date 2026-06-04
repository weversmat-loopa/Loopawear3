-- Migration 005: Design likes table, indexes, and RLS policies
-- Run this in the Supabase SQL editor.
--
-- Architectuurkeuze: geen gedena­liseerde like_count kolom op designs.
-- Tellingen worden live berekend via COUNT(*) queries met index-dekking.
-- Voordeel: geen trigger-complexiteit, geen teller-drift bij concurrent
-- deletes. Bij >100k likes is een materialized view eenvoudig toe te voegen.


-- ================================================================
-- 1. Tabel
-- ================================================================

CREATE TABLE IF NOT EXISTS public.likes (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Geen dubbele likes
  PRIMARY KEY (user_id, design_id)
);

-- Index voor "hoeveel likes heeft dit design?" — de meest gebruikte query
CREATE INDEX IF NOT EXISTS likes_design_idx ON public.likes (design_id);

-- Index voor "heeft deze user dit design geliked?" en "welke designs liket user X?"
CREATE INDEX IF NOT EXISTS likes_user_idx   ON public.likes (user_id);

-- Index voor trending: likes in de afgelopen 7 dagen per design
-- (design_id + created_at samen zodat de range-scan weinig I/O kost)
CREATE INDEX IF NOT EXISTS likes_design_recent_idx
  ON public.likes (design_id, created_at DESC);


-- ================================================================
-- 2. Row Level Security
-- ================================================================

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Iedereen (inclusief anon) kan like-tellingen lezen
DROP POLICY IF EXISTS "Likes are publicly readable" ON public.likes;
CREATE POLICY "Likes are publicly readable"
  ON public.likes
  FOR SELECT
  USING (true);

-- Ingelogde gebruikers mogen alleen hun eigen likes aanmaken
DROP POLICY IF EXISTS "Users can like designs" ON public.likes;
CREATE POLICY "Users can like designs"
  ON public.likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Gebruikers mogen alleen hun eigen likes verwijderen
DROP POLICY IF EXISTS "Users can unlike designs" ON public.likes;
CREATE POLICY "Users can unlike designs"
  ON public.likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins hebben volledige toegang via de bestaande is_admin() helper
DROP POLICY IF EXISTS "Admins have full access to likes" ON public.likes;
CREATE POLICY "Admins have full access to likes"
  ON public.likes
  FOR ALL
  USING (public.is_admin());


-- ================================================================
-- 3. GRANT aan Supabase-rollen
-- ================================================================

GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT SELECT                  ON public.likes TO anon;
