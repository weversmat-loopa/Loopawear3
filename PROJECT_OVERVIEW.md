# Loopawear — Project Overview

> Last updated: 2026-06-07. Based on a full read of the codebase — nothing invented.

---

## 1. What is Loopawear?

Loopawear is an AI-powered apparel marketplace. Creators use a browser-based **Design Studio** to generate artwork with AI, place it on a product (T-shirt, hoodie, etc.) using a drag-and-drop editor, and publish it to a public marketplace. Buyers browse the marketplace and check out with Stripe. Orders are fulfilled via **Printful** print-on-demand — nothing is produced until someone pays. Creators earn a share of the profit from every sale; Loopawear keeps the rest.

The platform has three distinct user types:
- **Buyers** — browse, like, and purchase designs
- **Creators** — generate designs with AI and publish them for sale
- **Admins** — review/approve/reject submitted designs and manage the platform

All three roles share the same Supabase auth system; the `profiles.role` column determines access.

---

## 2. Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.3 | Full-stack React framework, App Router, server actions, API routes |
| **React** | 19.2.4 | UI rendering |
| **TypeScript** | latest | Type safety across the whole codebase |
| **Tailwind CSS** | v4 | Styling — uses CSS custom properties for theming |
| **Supabase** | @supabase/ssr 0.10 | Postgres database, auth (email + OAuth), file storage, RLS policies |
| **Stripe** | v22 (API 2026-04-22.dahlia) | Checkout sessions, payment intents, webhooks for order lifecycle |
| **fal.ai** | @fal-ai/client 1.9.5 | AI image generation (`fal-ai/flux/schnell`) and background removal (`fal-ai/imageutils/rembg`) |
| **OpenAI Moderation API** | `omni-moderation-latest` | Prompt safety check before every generation |
| **Printful** | REST API v2 | Mockup photo generation; fulfillment integration is manual (admin ships orders) |
| **Resend** | REST (not SDK) | Transactional email — order confirmations, new sale alerts, design approval/rejection |
| **Fabric.js** | v7 | Interactive placement editor (drag/resize/rotate design on shirt canvas) |
| **Recharts** | v3 | Revenue and chart visualisations on the admin dashboard |
| **Vercel** | — | Hosting and deployment; `maxDuration` set per API route |

### Key environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
FAL_KEY
OPENAI_API_KEY        (prompt moderation — not in .env.local yet, must add before launch)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
PRINTFUL_API_TOKEN
RESEND_API_KEY        (not in .env.local yet — email won't send without it)
EMAIL_FROM            (sender address, e.g. noreply@loopawear.com)
NEXT_PUBLIC_SITE_URL
```

---

## 3. Architecture

### Directory structure

```
src/
  app/                    Next.js App Router pages and API routes
    (public pages)        /, /marketplace, /marketplace/[id], /creators/[id]
    generate/             Design Studio
    account/              Authenticated user pages
    admin/                Admin-only pages (auth-guarded by layout.tsx)
    api/                  API routes (checkout, generate, mockup, webhooks)
    auth/                 Supabase auth callback + password reset
  components/
    admin/                Admin-specific client components
    layout/               Navbar, Footer, PageShell
    legal/                LegalDraftBanner
    marketplace/          TrendingSection
    profile/              Avatar, banner, follow button, stat tiles
    ui/                   Shared primitives (Button, Card, Doodles, LikeButton, etc.)
  lib/
    auth/                 Auth server actions (sign in, sign up, etc.)
    email/                Resend integration + HTML templates
    legal/                businessInfo.ts — company details (all placeholders pre-launch)
    pricing.ts            Production cost, creator share, min price, calculateSplit()
  types/
    database.ts           Supabase-generated type definitions
  utils/supabase/
    client.ts             Browser client
    server.ts             Server client (reads cookies for auth)
    service.ts            Service-role client (bypasses RLS — admin use only)
```

### Route map

#### Public (no auth required)

| Route | What it does |
|---|---|
| `/` | Homepage — featured designs, trending section, hero copy |
| `/marketplace` | Browse all published, non-archived designs; filter by product type, sort by newest/price/likes; infinite scroll |
| `/marketplace/[id]` | Product detail page — buy, like, see creator, related designs |
| `/creators/[id]` | Public creator profile — bio, stats, published designs, follow button |
| `/generate` | Design Studio — open to anyone, but generating requires auth and credits |
| `/login`, `/signup`, `/forgot-password`, `/auth/reset-password` | Auth pages |
| `/terms`, `/privacy`, `/refunds`, `/imprint` | Legal pages (content from `businessInfo.ts`) |

#### Authenticated (creator)

| Route | What it does |
|---|---|
| `/account` | Account overview — profile settings, all designs (drafts/pending/published) |
| `/account/designs/[id]` | Design workspace — edit metadata, regenerate image, manage mockup, submit/unpublish/delete |
| `/account/orders` | Order history for the logged-in buyer |
| `/account/orders/[id]` | Order detail |
| `/account/creator` | Creator dashboard — design counts, sales stats, earnings, recent designs |

#### Admin (role = 'admin' required, guarded by `src/app/admin/layout.tsx`)

| Route | What it does |
|---|---|
| `/admin` | Dashboard — revenue KPIs, charts, design status breakdown, top designs/creators |
| `/admin/review` | Review queue — approve or reject pending_review designs |
| `/admin/orders` | All orders — filter by status, sort, expand for detail, fulfillment actions |
| `/admin/designs` | All designs — view/archive/unarchive/delete |
| `/admin/creators` | All creators — earnings, design counts, sorting |
| `/admin/users` | All users — view profiles, update generation credits |

#### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/designs/[id]/generate` | POST | Generate AI image (fal.ai), run moderation, deduct credit, store in Supabase Storage |
| `/api/designs/[id]/mockup` | POST | Generate Printful mockup via v2 API, poll until ready, store in Storage |
| `/api/checkout` | POST | Validate design, create Stripe checkout session |
| `/api/marketplace` | GET | Server-side browse query (used by client-side infinite scroll) |
| `/api/webhooks/stripe` | POST | Handle `checkout.session.completed`, `charge.refunded`, `charge.dispute.*` |
| `/auth/callback` | GET | Supabase OAuth/magic-link callback |

---

## 4. Data Model

### Tables

#### `designs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `creator_id` | uuid | References `auth.users` |
| `prompt` | text | User's generation prompt |
| `title` | text \| null | Public display name, set after generation |
| `product_type` | text \| null | T-shirt / Hoodie / Sweatshirt / Tote bag |
| `style` | text \| null | Minimal / Bold / Vintage / Abstract / Graphic |
| `image_url` | text \| null | Permanent URL in Supabase Storage (`design-images/designs/{id}.png`) |
| `image_status` | text | `none` → `generating` → `ready` \| `failed` |
| `mockup_url` | text \| null | Permanent URL in Storage (`design-images/designs/{id}_mockup.jpg`) |
| `mockup_status` | text \| null | `null` → `generating` → `ready` \| `failed` |
| `placement` | jsonb \| null | `{ side, x, y, scale, rotation, shirtColor, size, canvasW, canvasH }` |
| `price_cents` | int \| null | Retail price in euro cents, min €18.00 |
| `status` | text | `draft` → `pending_review` → `published` \| `draft` (rejected) |
| `archived_at` | timestamptz \| null | Set by admin; archived designs are hidden from all public views |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |

**Design lifecycle:** `draft` → creator submits → `pending_review` → admin approves → `published`. Rejection sends it back to `draft`. Published designs can be archived (`archived_at IS NOT NULL`) or deleted by admin.

#### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `design_id` | uuid FK → designs | |
| `buyer_id` | uuid \| null | `null` for guest checkouts |
| `creator_id` | uuid \| null | Denormalised from design at order time |
| `size` | text | S / M / L / XL / XXL |
| `quantity` | int | |
| `unit_price_cents` | int | Price per item at time of purchase |
| `amount_total_cents` | int | `unit_price_cents × quantity` |
| `platform_fee_cents` | int | Calculated by `calculateSplit()` |
| `creator_earnings_cents` | int | Calculated by `calculateSplit()` |
| `currency` | text | Always `eur` |
| `status` | text | `paid` → `fulfillment_pending` → `shipped` \| `cancelled` \| `refunded` \| `disputed` |
| `stripe_session_id` | text | Idempotency key for webhook |
| `stripe_payment_intent_id` | text \| null | Used to match refund/dispute webhooks |
| `tracking_number` | text \| null | Set by admin when marking shipped |
| `shipping_*` | text | Full shipping address collected by Stripe |
| `paid_at` | timestamptz | |

**Order lifecycle:** Created by Stripe webhook on `checkout.session.completed`. Admin manually progresses `paid → fulfillment_pending → shipped`. Stripe webhooks handle `refunded` and `disputed` automatically.

#### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Same as `auth.users.id` |
| `email` | text \| null | Denormalised from auth |
| `display_name` | text \| null | |
| `bio` | text \| null | Max 300 chars |
| `role` | text | `buyer` (default) \| `admin` |
| `generation_credits` | int | Default 0; decremented per generation, refunded on failure |
| `avatar_url` | text \| null | Supabase Storage URL |
| `banner_url` | text \| null | Supabase Storage URL |
| `website_url`, `instagram_url`, `tiktok_url` | text \| null | |

Created automatically by `handle_new_user()` trigger on `auth.users` INSERT.

A `prevent_privileged_profile_updates` trigger blocks users from self-elevating `role` or `generation_credits`.

#### `likes`

| Column | Type |
|---|---|
| `user_id` | uuid (PK part) |
| `design_id` | uuid (PK part) |
| `created_at` | timestamptz |

Composite primary key — one like per user per design.

#### `follows`

| Column | Type |
|---|---|
| `follower_id` | uuid (PK part) |
| `following_id` | uuid (PK part) |
| `created_at` | timestamptz |

Creator-to-creator follows. Used to display follower count on public profiles.

### View

#### `public_profiles`

Subset of `profiles` exposed to anonymous/authenticated users: `id`, `display_name`, `bio`, `avatar_url`, `banner_url`, `website_url`, `instagram_url`, `tiktok_url`. Deliberately excludes `role`, `email`, `generation_credits`. `SECURITY DEFINER` so reads bypass the table RLS; `authenticated` users are only GRANTed SELECT on the view, not the table.

### Database functions

| Function | Purpose |
|---|---|
| `decrement_generation_credits(user_id)` | Atomic decrement; returns -1 if balance already 0 (no-op, credit safe) |
| `increment_generation_credits(user_id)` | Used to refund a credit after a failed generation |
| `handle_new_user()` | Trigger: creates `profiles` row on new auth user |
| `set_updated_at()` | Trigger: auto-updates `updated_at` on designs |
| `prevent_privileged_profile_updates()` | Trigger: blocks self-elevation of role/credits |
| `is_admin()` | `SECURITY DEFINER` function used in admin RLS policies; queries profiles without triggering RLS recursion |
| `rls_auto_enable()` | Event trigger: automatically enables RLS on new tables |

### RLS policy summary

- `profiles`: users read own row (`auth.uid() = id`); admins read all (`is_admin()`); users update own non-privileged fields; `GRANT SELECT` is on the **view**, not the table, for anon/authenticated (restored by migration `20260607000000`)
- `designs`: creators read/update/delete own; admins full access
- `orders`: buyers read own; admins full access; service role bypasses all (used for guest orders and admin mutations)
- `likes`/`follows`: public read; authenticated users manage own rows

---

## 5. Core Flows

### Flow 1 — Create and publish a design (Studio)

1. Creator opens `/generate`, writes a prompt, selects a product type
2. Clicks **Generate** → `saveDraft()` server action creates/updates a `designs` row with `status=draft`
3. `POST /api/designs/[id]/generate` is called:
   - OpenAI Moderation API screens the prompt (fail-closed)
   - Credit is atomically decremented (`decrement_generation_credits`)
   - `fal-ai/flux/schnell` generates a 1024×1024 image
   - Optional: `fal-ai/imageutils/rembg` removes the background
   - Image is downloaded and stored permanently in Supabase Storage
   - `image_status` → `ready`, `image_url` saved
4. **PlacementEditor** (Fabric.js) appears on the same page — creator drags/scales/rotates the design on a shirt mockup, picks colour and size, clicks **Save placement** → `savePlacement()` stores the placement JSON
5. Creator fills in title, price, style in the **Finish your design** section, clicks **Save details** → `saveDetails()` server action
6. Creator optionally clicks **Generate Printful mockup** → `POST /api/designs/[id]/mockup` → Printful v2 API, polls until ready, stores JPG in Storage
7. Creator clicks **Submit for review** → `submitDesignForReview()` sets `status=pending_review`
8. Admin sees the design on `/admin/review`, clicks **Approve** → `status=published`, email sent to creator via Resend
9. Design appears on `/marketplace` (excluded from all public queries if `archived_at IS NOT NULL`)

### Flow 2 — Buy a design

1. Buyer visits `/marketplace/[id]`, picks a size (S–XXL) and quantity in `ProductOptions`
2. Clicks **Buy** → `POST /api/checkout` with `{ design_id, size, quantity }`
3. Server validates the design (must be `published`, `archived_at IS NULL`, has `price_cents >= 18 EUR`), creates a Stripe Checkout session with EU-only shipping address collection
4. Browser redirects to Stripe-hosted checkout page
5. Buyer enters card details and shipping address on Stripe
6. Stripe fires `checkout.session.completed` webhook to `/api/webhooks/stripe`
7. Webhook handler: calculates profit split, inserts `orders` row, sends order confirmation email to buyer and new-sale email to creator
8. Admin manually fulfils: on `/admin/orders`, marks `paid → fulfillment_pending`, then enters tracking number and marks `shipped`
9. Buyer can view order status on `/account/orders/[id]`

### Flow 3 — Admin review

1. Creator submits a design (`status=pending_review`)
2. Admin visits `/admin/review` — sees all pending designs with image, prompt, creator name, price
3. **Approve** → calls `approveDesign()` server action → `status=published` → email to creator
4. **Reject** → calls `rejectDesign()` → `status=draft` (back to creator's drafts) → rejection email

### Flow 4 — Pricing and profit split

```
sale_price         = price_cents (set by creator, min €18.00)
production_cost    = €17.00 (PRINTFUL_PRODUCTION_COST_CENTS, per unit)
profit             = sale_price − (production_cost × quantity)
creator_earnings   = round(profit × 0.60)   (CREATOR_SHARE = 60%)
platform_fee       = profit − creator_earnings  (40%)
```

Example: €29.99 T-shirt × 1
- Production cost: €17.00
- Profit: €12.99
- Creator earns: €7.79
- Platform keeps: €5.20

`calculateSplit()` in `src/lib/pricing.ts` is the single source of truth, called both in the Stripe webhook and in the admin dashboard KPIs. Both `platform_fee_cents` and `creator_earnings_cents` are stored on every order row at creation time.

---

## 6. Integrations

### fal.ai (image generation)

- Model: `fal-ai/flux/schnell` — 8 inference steps, `square_hd` (1024×1024)
- Background removal: `fal-ai/imageutils/rembg` — runs after generation if user toggles "Remove background"
- Prompt is assembled by `buildGenerationPrompt()`: user prompt + style keywords + colour palette keywords + product context + quality suffix
- All fal CDN URLs are considered temporary — images are immediately downloaded and stored in Supabase Storage at `designs/{id}.png`
- A cache-busting `?t=<timestamp>` is appended to the Storage public URL after regeneration
- Credits are deducted atomically before fal call; refunded on any failure path

### Stripe (payments)

- Checkout mode: `payment` (one-time), EUR, EU-27 shipping only
- Guest checkout supported (no account required); `buyer_id` in metadata is `""` for guests
- Webhook events handled:
  - `checkout.session.completed` → create order, send emails
  - `charge.refunded` → mark order `refunded`
  - `charge.dispute.created` → mark order `disputed`
  - `charge.dispute.closed` (won) → revert to `paid`; (lost) → force `refunded`
- Webhook is idempotent — duplicate `checkout.session.completed` events are detected via `stripe_session_id` lookup
- **TODO before launch**: re-enable `consent_collection: { terms_of_service: "required" }` in checkout (requires setting Terms URL in Stripe Dashboard)

### Printful (mockups and fulfillment)

- **Mockup generation**: fully automated via Printful v2 `/mockup-tasks` API. Product: Bella + Canvas 3001 (catalog ID 71), variant 4017, style 758. Polls every 2 seconds, times out after 60 seconds. Mockup JPG downloaded and stored in Supabase Storage
- **Fulfillment**: currently **manual** — admin progresses orders through `paid → fulfillment_pending → shipped` on the admin orders page. There is no automated Printful order submission yet
- The local placement editor (`PlacementEditor.tsx`) uses a static white-shirt SVG (`/public/mockups/tshirt-white.svg`) with CSS colour filters as a placeholder. `src/app/generate/printful.ts` is the single coupling point — it contains `TODO(printful)` comments for the real integration

### Resend (email)

- REST API directly (no SDK) — `src/lib/email/send.ts`
- Emails sent: design approved, design rejected, new sale (to creator), order confirmation (to buyer)
- All templates are in `src/lib/email/templates.ts` — table-based HTML layout for email client compatibility
- Guest buyers get an order confirmation to the email Stripe collects; they don't get an order URL link (no account to link to)

---

## 7. Status

### Fully working

- User auth (email, OAuth via Supabase)
- Design generation pipeline (prompt → moderation → fal.ai → background removal → Storage)
- Placement editor (drag, resize, rotate, colour, front/back)
- Printful mockup generation
- Complete Studio flow: generate → place → metadata → mockup → submit, all without page reload
- Marketplace: browse, filter, sort, infinite scroll, trending section, likes
- Product detail page with size/quantity picker
- Stripe checkout (guest + authenticated)
- Stripe webhooks: order creation, refund, dispute handling
- Order confirmation and new-sale emails
- Buyer account: order history and detail pages
- Creator account: design management, credit display
- Creator dashboard: earnings, sales stats, design counts
- Public creator profiles: bio, stats, follow, published designs
- Admin dashboard: revenue KPIs, charts, design status, top lists
- Admin review queue: approve/reject with emails
- Admin orders: filter, sort, expand, fulfillment actions
- Admin designs: archive/unarchive/delete
- Admin creators: earnings, design counts, sorting
- Admin users: view profiles, edit generation credits
- Legal pages: Terms, Privacy, Refunds, Imprint (Belgian/EU law; draft banner shown until `businessInfo.ts` is filled in)
- Dark mode throughout
- RLS policies: per-user isolation, admin bypass, `public_profiles` view

### Half-finished / known gaps

- **Fulfillment is manual** — admin manually progresses orders and enters tracking numbers. No automated Printful order submission when an order is placed
- **Placement editor mockup is a placeholder** — uses a local SVG with CSS colour filters. Real Printful mockup images per colour/variant are not yet wired up. `printful.ts` has `TODO(printful)` comments on every coupling point
- **Payout system does not exist** — `creator_earnings_cents` accumulates on orders but there is no payout flow, payout schedule, or Stripe Connect integration. The creator dashboard shows "Pending payout" as the total, which is misleading since nothing is ever actually paid out
- **Legal `businessInfo.ts` is all placeholders** — entity name, KBO number, VAT number, address, contact emails, jurisdiction city are all `"To be completed before public launch"`. Every legal page shows the draft banner until these are filled in
- **`RESEND_API_KEY` and `OPENAI_API_KEY` are missing from `.env.local`** — emails will silently not send and prompt moderation will fail-closed (blocking all generations) on the current dev setup
- **Stripe Terms of Service consent collection is disabled** — a TODO comment in `api/checkout/route.ts` explains this; it needs the Terms URL set in the Stripe Dashboard before it can be re-enabled
- **No creator payout page** — creators have no way to request or view payouts from within the app
- **No email verification enforcement** — Supabase sends a confirmation email on signup but the app doesn't check `email_confirmed_at` before allowing actions
- **Generation credits are manually assigned** — there's no way for users to buy more credits. Credits are set by admins on the users page
- **Designs table is missing `mockup_url` and `mockup_status` in `database.ts`** — these columns exist in the DB and are used in code, but the TypeScript type file was generated before they were added. All queries currently cast them as `string | null` via inline type assertions

### Still needed for launch

1. Fill in `src/lib/legal/businessInfo.ts` (company registration details)
2. Add `RESEND_API_KEY`, `OPENAI_API_KEY`, `EMAIL_FROM` to production environment
3. Re-enable Stripe Terms of Service consent (set URL in Stripe Dashboard first)
4. Decide on and implement a payout mechanism (manual bank transfer vs. Stripe Connect)
5. Wire up Printful order submission on `checkout.session.completed` (or establish manual fulfilment SLA)
6. Replace placeholder shirt mockup SVG with real per-variant Printful mockup images in `printful.ts`
7. Regenerate `database.ts` from Supabase to include `mockup_url`, `mockup_status`, `archived_at`, and any other columns added after the initial snapshot

---

## 8. Known Tech Debt

- **`database.ts` is stale** — the TypeScript type snapshot predates the `mockup_url`, `mockup_status`, and `archived_at` columns. Code works because queries cast results inline, but type safety on those columns is incomplete. Regenerate with `supabase gen types typescript`.

- **Duplicate pricing logic on the admin dashboard** — `src/app/admin/page.tsx` has an inline fallback split calculation for orders that lack stored `platform_fee_cents` / `creator_earnings_cents`. This should be removed once all historical orders have the stored columns, leaving `calculateSplit()` as the sole reference.

- **`PlacementEditor` is instantiated on both `/generate` and `/account/designs/[id]`** — two separate mounts. The workspace wraps it in `PlacementEditorWrapper` which uses `dynamic()` to import from `/generate/PlacementEditor`. Functionally fine, but the placement state is independent on each page — if a creator adjusts placement in the workspace, the Studio doesn't know.

- **`DesignEditForm` duplication** — the workspace's `DesignEditForm` (which uses form submit + redirect) and the Studio's inline metadata form (which uses `saveDetails()` + client state) are logically the same UI but implemented separately. They'll drift over time if new fields are added to one.

- **Migrations are partly numbered, partly timestamped** — `001_profiles_social_fields.sql`, `002_follows_table.sql`, etc. mixed with `20260601000000_baseline.sql`. The numbered files were written to be run manually in the Supabase SQL editor and are not managed by the Supabase CLI migration system. Before using `supabase db push` in CI, the migration history needs to be reconciled.

- **No loading/error boundaries at the page level** — `src/app/error.tsx` exists but individual pages don't have fine-grained error UI. A failed Supabase query in a server component returns `null` data and silently falls back to empty arrays or `notFound()`.

- **`src/proxy.ts` is unused** — file exists in `src/` root but is not imported anywhere.

- **The `api/marketplace` route** exists alongside the client-side `queries.ts`. The client-side component uses both; the separation isn't fully consistent.

- **Shirt colour filter in `PlacementEditor` is CSS-only** — the `filter` CSS property approximates shirt colours on the white SVG mockup. Dark mode can cause visual inconsistencies since the filter is applied on top of a light-mode SVG.
