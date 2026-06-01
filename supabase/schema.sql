-- ==============================================================
-- Loopawear — Reference Schema
-- ==============================================================
-- STATUS: Afgeleid van live database via `supabase gen types typescript`
--         op 2026-06-01. Kolommen en types zijn accuraat.
--         Dit is PUUR DOCUMENTATIE — geen migration file.
--
-- Voor een volledige pg_dump (inclusief indexes, triggers, etc.):
--   supabase db dump -f supabase/schema.sql   (vereist Docker Desktop)
--
-- Project ref: yyfwcubpgkcuhdwfbiit
-- Project URL: https://yyfwcubpgkcuhdwfbiit.supabase.co
-- ==============================================================


-- ==============================================================
-- TABLE: profiles
-- ==============================================================
-- Één rij per auth.users entry.
-- 'role' is NOT NULL (default vermoedelijk 'user' of lege string).
-- 'email' is een kopie van auth.users.email voor snelle queries.

create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  display_name        text,
  bio                 text        check (char_length(bio) <= 300),
  email               text,
  role                text        not null default '',
  generation_credits  integer     not null default 0,
  created_at          timestamptz not null default now()
);


-- ==============================================================
-- TABLE: designs
-- ==============================================================
-- Core content. Lifecycle: draft → pending_review → published.
-- 'creator_id' is NOT NULL — een design heeft altijd een maker.
-- 'updated_at' wordt bijgehouden naast created_at.

create table if not exists public.designs (
  id            uuid        primary key default gen_random_uuid(),
  creator_id    uuid        not null references auth.users(id) on delete cascade,
  title         text,
  prompt        text        not null,
  product_type  text        check (product_type in ('T-shirt', 'Hoodie', 'Sweatshirt', 'Tote bag')),
  style         text        check (style in ('Minimal', 'Bold', 'Vintage', 'Abstract', 'Graphic')),
  image_url     text,
  image_status  text        not null default 'none'
                            check (image_status in ('none', 'generating', 'ready', 'failed')),
  placement     jsonb,      -- { x: number, y: number, scale: number }
  price_cents   integer,
  status        text        not null default 'draft'
                            check (status in ('draft', 'pending_review', 'published')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ==============================================================
-- TABLE: orders
-- ==============================================================
-- Aangemaakt door de Stripe webhook via service-role key.
-- 'buyer_id' is nullable voor guest checkouts.
-- 'paid_at' en 'shipped_at' zijn expliciete tijdstempels naast created_at.
-- 'fulfillment_notes' is een optioneel admin/intern notitieveld.
-- platform_fee_cents = 15% van amount_total_cents (hardcoded in webhook).
-- creator_earnings_cents = 85% van amount_total_cents.

create table if not exists public.orders (
  id                       uuid        primary key default gen_random_uuid(),
  buyer_id                 uuid        references auth.users(id) on delete set null,
  design_id                uuid        not null references public.designs(id),
  creator_id               uuid        references auth.users(id) on delete set null,
  size                     text        not null check (size in ('S', 'M', 'L', 'XL', 'XXL')),
  quantity                 integer     not null,
  unit_price_cents         integer     not null,
  amount_total_cents       integer     not null,
  currency                 text        not null default 'eur',
  platform_fee_cents       integer     not null,
  creator_earnings_cents   integer     not null,
  stripe_session_id        text        not null,
  stripe_payment_intent_id text,
  shipping_name            text        not null,
  shipping_line1           text        not null,
  shipping_line2           text,
  shipping_city            text        not null,
  shipping_state           text,
  shipping_postal_code     text        not null,
  shipping_country         text        not null,
  status                   text        not null default 'paid'
                           check (status in ('paid', 'fulfillment_pending', 'shipped', 'cancelled', 'refunded', 'disputed')),
  tracking_number          text,
  fulfillment_notes        text,
  paid_at                  timestamptz not null default now(),
  shipped_at               timestamptz,
  created_at               timestamptz not null default now()
);


-- ==============================================================
-- VIEW: public_profiles
-- ==============================================================
-- Read-only publieke view op profiles.
-- Exposeert alleen id, display_name, bio — nooit role, email of credits.

create or replace view public.public_profiles as
  select
    id,
    display_name,
    bio
  from public.profiles;


-- ==============================================================
-- STORAGE BUCKET: design-images
-- ==============================================================
-- Publieke bucket voor gegenereerde PNG designs.
-- Pad per design: designs/{design_id}.png
--
-- Aanmaken via SQL (eenmalig, of via dashboard):
--   insert into storage.buckets (id, name, public)
--   values ('design-images', 'design-images', true)
--   on conflict do nothing;


-- ==============================================================
-- ROW LEVEL SECURITY
-- ==============================================================

alter table public.profiles enable row level security;
alter table public.designs   enable row level security;
alter table public.orders    enable row level security;

-- profiles: users lezen/updaten alleen hun eigen rij
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- designs: publiek leesbaar als status = 'published'
create policy "designs_select_published"
  on public.designs for select
  using (status = 'published');

-- designs: creators zien/bewerken alleen hun eigen designs
create policy "designs_select_own"
  on public.designs for select
  using (creator_id = auth.uid());

create policy "designs_insert_own"
  on public.designs for insert
  with check (creator_id = auth.uid());

create policy "designs_update_own"
  on public.designs for update
  using (creator_id = auth.uid());

create policy "designs_delete_own"
  on public.designs for delete
  using (creator_id = auth.uid());

-- orders: buyers zien alleen hun eigen orders
create policy "orders_select_own"
  on public.orders for select
  using (buyer_id = auth.uid());

-- orders: INSERT en UPDATE alleen via service-role
-- (Stripe webhook + admin actions gebruiken service-role key; bypassen RLS automatisch)


-- ==============================================================
-- RPC FUNCTIONS
-- ==============================================================
-- Zie: supabase/sql/functions/
-- - decrement_generation_credits.sql
-- - increment_generation_credits.sql
