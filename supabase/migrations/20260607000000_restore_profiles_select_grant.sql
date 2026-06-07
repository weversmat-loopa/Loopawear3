-- Migration: restore SELECT privilege on profiles for authenticated role
--
-- Context: 003_rls_policies.sql revoked SELECT on public.profiles from
-- authenticated. That was too broad: it stripped the table-level privilege
-- before RLS could even be evaluated, so every app-side query against
-- profiles (account page, admin guard) returned null for all users.
--
-- Fix: re-grant SELECT on the table to authenticated. RLS policies already
-- in place correctly limit what each caller can actually see:
--   • "Users can read their own profile"  (auth.uid() = id)  — own row only
--   • "profiles_admin_read"               (is_admin())       — all rows
--
-- Anonymous access remains blocked: anon has no table-level SELECT grant
-- and must continue to use the public_profiles view.

GRANT SELECT ON public.profiles TO authenticated;
