-- Voeg Printful-mockup ondersteuning toe aan designs (fase 1: mockups only)
-- mockup_url: permanente Supabase Storage URL van de gegenereerde Printful-mockup
-- mockup_status: levenscyclus van de mockup-generatie

ALTER TABLE "public"."designs"
  ADD COLUMN IF NOT EXISTS "mockup_url" text,
  ADD COLUMN IF NOT EXISTS "mockup_status" text NOT NULL DEFAULT 'none';

ALTER TABLE "public"."designs"
  ADD CONSTRAINT "designs_mockup_status_check"
  CHECK ("mockup_status" = ANY (ARRAY['none'::text, 'generating'::text, 'ready'::text, 'failed'::text]));
