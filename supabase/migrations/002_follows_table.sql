-- Migration 002: Create the follows table
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate follows
  PRIMARY KEY (follower_id, following_id),

  -- Prevent self-follows
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Index for "who does this user follow?" lookups
CREATE INDEX IF NOT EXISTS follows_follower_idx  ON public.follows (follower_id);
-- Index for "who follows this user?" lookups
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows (following_id);

-- Enable Row Level Security
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
