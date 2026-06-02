-- ============================================================
-- Admin RLS policies + archive mechanism for designs
--
-- Eindstaat na deze migratie:
--   designs  : admin_read, admin_update, admin_delete
--   orders   : admin_read, admin_update
--   profiles : admin_read, admin_update
-- Alle policies gebruiken public.is_admin() als gate.
-- ============================================================


-- 1. Helper function
--    SECURITY DEFINER + SET search_path = public zodat de functie
--    de profiles-tabel kan bevragen zonder door haar eigen RLS-
--    policies te gaan — voorkomt infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- 2. Archive column on designs
--    NULL  = actief
--    value = timestamp waarop admin het design archiveerde
ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;


-- ── designs ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "designs_admin_read"   ON public.designs;
CREATE POLICY "designs_admin_read"
  ON public.designs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "designs_admin_update" ON public.designs;
CREATE POLICY "designs_admin_update"
  ON public.designs FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "designs_admin_delete" ON public.designs;
CREATE POLICY "designs_admin_delete"
  ON public.designs FOR DELETE
  USING (public.is_admin());


-- ── orders ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "orders_admin_read"   ON public.orders;
CREATE POLICY "orders_admin_read"
  ON public.orders FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update"
  ON public.orders FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── profiles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_admin_read"   ON public.profiles;
CREATE POLICY "profiles_admin_read"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
-- Note: role-wijzigingen worden nog steeds geblokkeerd door de
-- prevent_privileged_profile_updates trigger, ook al staat
-- deze policy de rij toe.
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
