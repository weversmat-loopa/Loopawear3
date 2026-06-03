-- ============================================================================
--  Loopawear — design placement
-- ============================================================================
--  Adds a JSONB `placement` column to `designs` to persist how a creator
--  positioned their design on the shirt mockup in the Studio editor.
--
--  Run this once in the Supabase dashboard (SQL editor) or via the Supabase
--  CLI. It is idempotent and safe to re-run.
--
--  Expected JSON shape (written by src/app/generate/actions.ts → savePlacement):
--    {
--      "side":       "front" | "back",
--      "x":          number,   -- design centre X, in canvas px
--      "y":          number,   -- design centre Y, in canvas px
--      "scale":      number,   -- Fabric scaleX (fraction of natural image size)
--      "rotation":   number,   -- degrees, clockwise
--      "shirtColor": string,   -- e.g. "white" | "black" | "sand" | "blue"
--      "size":       string,   -- e.g. "S" | "M" | "L" | "XL" | "XXL"
--      "canvasW":    number,   -- reference canvas width  the coords use
--      "canvasH":    number    -- reference canvas height the coords use
--    }
-- ============================================================================

alter table public.designs
  add column if not exists placement jsonb;

comment on column public.designs.placement is
  'Design placement on the shirt mockup (side, x, y, scale, rotation, shirtColor, size, canvasW, canvasH). Written by the Studio placement editor.';
