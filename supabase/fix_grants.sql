-- ============================================
-- Fix: "permission denied for table" errors
-- Run this once in Supabase SQL Editor.
--
-- Cause: "Automatically expose new tables" was set OFF during project
-- setup (the right call for security), but that means NO table gets
-- baseline database access by default — not even the secret/service
-- key, since GRANT and RLS are two separate layers. This restores
-- access deliberately, matching our original design:
--   - service_role (secret key) gets full access to everything —
--     this is what all our API routes actually use.
--   - anon/authenticated only get SELECT on products — since that's
--     the one table meant to be publicly browsable (once Shop
--     launches). Nothing else is touched directly by the browser.
-- ============================================

grant usage on schema public to service_role, anon, authenticated;

-- Full access for the backend (service_role / secret key)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Public read-only access to products only
grant select on products to anon, authenticated;

-- Make sure this applies to any tables added later too
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
