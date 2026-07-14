-- ============================================
-- AstroTarot — Supabase Schema
-- Run this in Supabase: Project → SQL Editor → New Query → paste → Run
-- Matches SYSTEM.md Section 6
-- ============================================

-- Bookings (paid consultation sessions)
create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_email text,
  package text not null, -- 'quick_clarity' | 'insight' | 'detailed' | 'emergency'
  amount_paid numeric(10,2) not null,
  slot_start timestamptz not null,
  slot_end timestamptz not null, -- slot_start + 30 min buffer, backend-enforced
  payment_status text default 'pending', -- 'pending' | 'paid' | 'failed'
  razorpay_order_id text,
  razorpay_payment_id text,
  session_status text default 'upcoming', -- 'upcoming' | 'completed' | 'cancelled'
  created_at timestamptz default now()
);

-- Shop Products (schema ready now, Shop UI build deferred — see SYSTEM.md)
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  stock_qty int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Shop Orders (schema ready now, Shop UI build deferred)
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  shipping_address text not null,
  items jsonb not null,
  total_amount numeric(10,2) not null,
  payment_status text default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  order_status text default 'pending',
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

-- Free Tarot Reading — abuse prevention tracking
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

-- AI usage log — for the admin "estimated spend" tracker
create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  request_type text default 'free_reading',
  input_tokens int,
  output_tokens int,
  estimated_cost_usd numeric(10,4),
  created_at timestamptz default now()
);

-- Admin-managed availability blocks (future admin calendar feature)
create table availability_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  reason text,
  created_at timestamptz default now()
);

-- ============================================
-- Row Level Security — lock tables down by default.
-- Public users can INSERT (create a booking/order) but not read others' data.
-- Admin routes use the service_role key, which bypasses RLS entirely.
-- ============================================
alter table bookings enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table workshop_enrollments enable row level security;
alter table free_reading_attempts enable row level security;
alter table ai_usage_log enable row level security;
alter table availability_blocks enable row level security;

-- Public can view active products (once Shop is live)
create policy "public read active products" on products
  for select using (is_active = true);

-- No public read/write policies on bookings/orders/etc. — all writes
-- happen through API routes using the service_role key (server-side only).
-- This keeps client names, phone numbers, and payment info from being
-- readable directly by anyone with the anon key.
