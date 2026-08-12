-- ============================================
-- AstroTarot — Supabase Schema (safe to re-run)
-- Uses IF NOT EXISTS everywhere, so running this again after a
-- partial run won't error out on tables that already exist.
-- ============================================

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_email text,
  package text not null,
  amount_paid numeric(10,2) not null,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  payment_status text default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  session_status text default 'upcoming',
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  stock_qty int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists orders (
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

create table if not exists workshop_enrollments (
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

create table if not exists free_reading_attempts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null,
  ip_hash text not null,
  attempt_count int default 0,
  first_attempt_at timestamptz default now(),
  last_attempt_at timestamptz default now()
);
create index if not exists idx_device_id on free_reading_attempts(device_id);
create index if not exists idx_ip_hash on free_reading_attempts(ip_hash);

create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  request_type text default 'free_reading',
  input_tokens int,
  output_tokens int,
  estimated_cost_usd numeric(10,4),
  created_at timestamptz default now()
);

create table if not exists availability_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  reason text,
  created_at timestamptz default now()
);

-- RLS — safe to re-run, "enable" is idempotent
alter table bookings enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table workshop_enrollments enable row level security;
alter table free_reading_attempts enable row level security;
alter table ai_usage_log enable row level security;
alter table availability_blocks enable row level security;

-- Policy creation isn't naturally idempotent, so guard it manually
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'products' and policyname = 'public read active products'
  ) then
    create policy "public read active products" on products
      for select using (is_active = true);
  end if;
end $$;
