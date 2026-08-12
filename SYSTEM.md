# astrotarot.in — System & Architecture Reference

**Purpose of this file:** Feed this into any new chat/session (Claude, Claude Code, etc.) to restore full project context instantly. This is the single source of truth for scope, architecture, schema, and decisions. Pricing/client-negotiation history lives in `Tarot_Website_PRD_v2.docx` — this file is dev-focused only.

**Owner:** Shiwang Tiwari (developer) building for Ishita Nag (client, tarot reader & wellness practitioner)
**Domain:** astrotarot.in — registered, live
**Status:** Pre-development → starting build now

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (React) + Tailwind CSS + Framer Motion |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + Auth) |
| Image Storage | Cloudinary |
| Hosting | Vercel Pro (required — commercial site, live payments) |
| Payments | Razorpay (Standard Checkout: JS SDK + webhook) |
| Notifications | WhatsApp Business API via BSP (AiSensy or similar) |
| AI | Claude API (Anthropic) — client's own account, billed to her |

All accounts (GitHub, Vercel, Hostinger/domain, Claude API) are under **Ishita's ownership**, not Shiwang's.

---

## 2. Site Map

```
/                     Home
/book                 Book a Session
/shop                 Shop (products list) — DEFERRED, build later, no products yet
/shop/[productId]     Product detail — DEFERRED, build later
/cart                 Cart / Checkout — DEFERRED, build later
/free-reading         Free Tarot Reading (AI)
/workshop             Tarot Workshop
/about                About
/contact              Contact
/admin                Admin Dashboard (auth-gated)
  /admin/bookings
  /admin/orders
  /admin/products
  /admin/analytics
  /admin/content
```

---

## 3. Business Logic Rules (critical — do not deviate without re-confirming with Shiwang)

- **Booking slot buffer:** 30-minute minimum block per booking. Enforced **backend only** — never surfaced on frontend UI.
- **Booking availability:** Mon–Fri 9 PM–11 PM, Sat–Sun 11 AM–7 PM (hardcoded initially; admin-editable later, not v1 launch).
- **Session delivery:** WhatsApp Video call only. No Zoom/video API integration.
- **Free Tarot Reading limit:** 2 free reads per user (device-based, not account-based — see Section 5).
- **Free Tarot Reading — no site-wide cap.** Unlimited total users; only the per-user 2-attempt limit applies.
- **Workshop:** 10-day batches, 2 batches/month (e.g. starting 10th & 20th). Paid enrollment via Razorpay (reuses same integration as Booking/Shop).
- **Shipping:** Manual at launch — admin marks orders shipped + enters tracking number by hand. No Shiprocket API at launch (future paid add-on only, ₹8,000–12,000, not in current scope).
- **Admin dashboard:** Fully built from day one — not phased, not a future add-on.
- **Shop:** In scope, full price/build unchanged — but **deferred to a later phase.** Ishita has no products ready yet. Do not build Shop pages in the initial launch push; add as a follow-up phase once she has inventory. Not shown in nav/site until then. Treat like a reserved-but-postponed feature, not a cut one.

---

## 4. Reading Packages (Booking)

| Package | Price | Notes |
|---|---|---|
| Quick Clarity | ₹199 | 1 question |
| Insight Reading | ₹599 | 3 questions |
| Detailed Reading | ₹1,199 | — |
| Emergency Reading | ₹1,499 | Same-day |

## 5. Free Tarot Reading — AI Architecture

**Flow:**
1. User draws/selects tarot cards on an animated UI (Framer Motion card-flip)
2. Selected cards sent to `/api/free-reading`
3. Backend checks abuse-prevention layer (below) before calling Claude API
4. If under limit: call Claude API with card selection → return AI-generated interpretation
5. If at limit: return `limitReached: true` + soft CTA to book a paid session

**Abuse prevention (no login system, so this is best-effort, not bulletproof):**
- **Layer 1:** Server-set httpOnly cookie, 1-year expiry, random UUID as `device_id`. Not readable/clearable via client-side JS.
- **Layer 2:** Supabase table `free_reading_attempts` tracks `device_id` + `ip_hash` + `attempt_count`.
- **Layer 3:** Hashed IP (server-side salt, never store raw IP) as a fallback check — catches deliberate cookie-clearing.
- Limit = 2 attempts, checked against **either** device_id or ip_hash match, whichever is higher.

```sql
create table free_reading_attempts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null,
  ip_hash text not null,
  attempt_count int default 0,
  first_attempt_at timestamptz default now(),
  last_attempt_at timestamptz default now()
);
create index idx_device_id on free_reading_attempts(device_id);
create index idx_ip_hash on free_reading_attempts(ip_hash);
```

**Claude API billing:** Client's own Anthropic account/API key. Not proxied through or billed by Shiwang. Dev responsibility ends at integration + prompt design + the abuse-prevention logic above.

**Admin AI-spend tracker:** Since standard (non-Enterprise) Anthropic accounts have no live-balance API, spend is self-tracked:

```sql
create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  request_type text default 'free_reading',
  input_tokens int,
  output_tokens int,
  estimated_cost_usd numeric(10,4),
  created_at timestamptz default now()
);
```
Sum this table for the admin dashboard's "Estimated AI spend this month" card. It's an estimate, not a live pull — she should still spot-check the actual Anthropic Console occasionally.

---

## 6. Database Schema (Supabase — core tables)

```sql
-- Bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_email text,
  package text not null, -- 'quick_clarity' | 'insight' | 'detailed' | 'emergency'
  amount_paid numeric(10,2) not null,
  slot_start timestamptz not null,
  slot_end timestamptz not null, -- slot_start + 30 min buffer
  payment_status text default 'pending', -- 'pending' | 'paid' | 'failed'
  razorpay_order_id text,
  razorpay_payment_id text,
  session_status text default 'upcoming', -- 'upcoming' | 'completed' | 'cancelled'
  created_at timestamptz default now()
);

-- Shop Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text, -- Cloudinary URL
  stock_qty int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Shop Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  shipping_address text not null,
  items jsonb not null, -- [{product_id, name, qty, price}]
  total_amount numeric(10,2) not null,
  payment_status text default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  order_status text default 'pending', -- 'pending'|'shipped'|'delivered'|'cancelled'
  tracking_number text,
  created_at timestamptz default now()
);

-- Workshop Enrollments
create table workshop_enrollments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_email text,
  batch_start_date date not null,
  amount_paid numeric(10,2) default 2999,
  payment_status text default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz default now()
);

-- (free_reading_attempts and ai_usage_log — see Section 5)

-- Admin availability blocks (for future admin-editable calendar; hardcode logic in v1)
create table availability_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  reason text,
  created_at timestamptz default now()
);
```

---

## 7. API Routes (Next.js)

```
POST   /api/bookings/create-order       → creates Razorpay order for a booking
POST   /api/bookings/verify-payment     → Razorpay webhook/verify, saves booking, triggers WhatsApp
GET    /api/bookings/available-slots    → returns open slots for a given date

POST   /api/shop/checkout               → creates Razorpay order for cart
POST   /api/shop/verify-payment         → verifies payment, saves order, triggers WhatsApp

POST   /api/workshop/enroll             → creates Razorpay order for workshop
POST   /api/workshop/verify-payment     → verifies payment, saves enrollment

POST   /api/free-reading                → checks abuse limits, calls Claude API, returns reading

GET    /api/admin/bookings              → (auth) list/manage bookings
GET    /api/admin/orders                → (auth) list/manage orders
GET    /api/admin/products              → (auth) CRUD products
GET    /api/admin/analytics             → (auth) revenue, sessions, AI spend summary
```

All `/api/admin/*` routes gated behind Supabase Auth session check.

---

## 8. Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

WHATSAPP_BSP_API_KEY=       # AiSensy or chosen BSP
WHATSAPP_BUSINESS_NUMBER=

ANTHROPIC_API_KEY=          # Ishita's own Claude API key

IP_HASH_SALT=                # server-side salt for hashing IPs, free-reading abuse prevention
```

---

## 9. Out of Scope (confirmed, do not build unless re-scoped)

- Zoom/Google Meet or any video API — WhatsApp Video only
- Multi-language support — English only
- Native mobile app
- Subscription/recurring payment plans
- Customer login/account portal
- Shiprocket integration (future paid add-on only)
- Site-wide daily cap on free readings

---

## 10. Still Open — Needs Ishita's Input Before Relevant Build Steps

| # | Question | Status | Blocks |
|---|---|---|---|
| 1 | Separate WhatsApp Business number for the BSP, or needs setup? | **Resolved** — she wants to use her own WhatsApp for personal/client chatting. Decision: get a **separate, dedicated number** just for automated booking notifications (BSP sender number). Her personal number is untouched — a number can't run as both a regular WhatsApp and a Business API sender simultaneously without real risk/limitations (Meta "Coexistence" exists but isn't guaranteed available). Confirm with her whether her current number is personal Messenger or the free WhatsApp Business app, for the record — doesn't change the plan either way. | WhatsApp notification integration |
| 2 | Rough product count for Shop launch | Resolved — no products yet, Shop deferred (see Section 3/12) | N/A for now |
| 3 | Wants marketing WhatsApp broadcasts later? | Resolved — no, staying on free BSP tier | N/A |
| 4 | Existing brand identity — logo, colors, fonts? | Pending — Shiwang to ask | Design system / Tailwind theme setup |
| 5 | Preferred launch date / hard deadline? | Resolved — no fixed date, ASAP | N/A |

---

## 11. Commercial Terms (for reference — full detail in PRD docx)

- Total dev fee: ₹45,000–55,000 (round figure ₹50,000)
- Payment milestones: 50% advance / 30% mid-build / 20% handover
- Domain (astrotarot.in) registered — Ishita's own Hostinger account
- Vercel Pro required (commercial-use terms, not optional)
- Full PRD with complete changelog: `Tarot_Website_PRD_v2.docx`

---

## 12. Build Order (suggested)

1. Project scaffold (Next.js + Tailwind + Supabase client setup)
2. Supabase schema (Section 6) + Cloudinary + env vars
3. Home, About, Contact (static-ish pages)
4. Booking flow: slots, buffer logic, package tiers, Razorpay, WhatsApp notify
5. Free Tarot Reading: card UI, Claude API integration, abuse-prevention
6. Workshop page + Razorpay enrollment
7. Admin Dashboard: bookings/workshop/analytics/AI-spend tracker (Shop admin tools built when Shop phase starts)
8. Testing, responsiveness, cross-browser
9. Deploy to Vercel Pro, point astrotarot.in DNS, launch (Shop not live at this point)
10. **Later phase, when Ishita has products ready:** Shop — products, cart, checkout, order management, admin product tools. Same scope/price as originally planned, just resequenced after launch, not cut.
