-- Migration 004: Storage bucket + policies for avatars and banners
-- Run this in the Supabase SQL editor.

-- ----------------------------------------------------------------
-- Create the bucket (idempotent via INSERT … ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  true,                         -- public bucket: images readable by URL
  5242880,                      -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------
-- Storage policies
-- Path convention:
--   avatars/<user_id>   (e.g. avatars/uuid-here.jpg)
--   banners/<user_id>   (e.g. banners/uuid-here.jpg)
-- ----------------------------------------------------------------

-- Public read
DROP POLICY IF EXISTS "profile-media public read" ON storage.objects;
CREATE POLICY "profile-media public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-media');

-- Owner insert: the first path segment after the folder must equal their uid.
-- Matches: avatars/<uid>[.*]  and  banners/<uid>[.*]
DROP POLICY IF EXISTS "profile-media owner insert" ON storage.objects;
CREATE POLICY "profile-media owner insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Owner update (overwrite / replace)
DROP POLICY IF EXISTS "profile-media owner update" ON storage.objects;
CREATE POLICY "profile-media owner update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Owner delete
DROP POLICY IF EXISTS "profile-media owner delete" ON storage.objects;
CREATE POLICY "profile-media owner delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
