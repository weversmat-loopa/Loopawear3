ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS mockup_urls text[] DEFAULT '{}';
