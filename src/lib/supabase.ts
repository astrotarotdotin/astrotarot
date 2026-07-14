import { createClient } from "@supabase/supabase-js";

// Fallback placeholders let the project build/type-check before real keys
// exist in .env.local. Real values are required at runtime for anything
// that actually touches the database.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Public client — safe for browser use (RLS enforced on the Supabase side).
export const supabase = createClient(url, anonKey);

// Server-only client — uses the service role key, only import this
// inside API routes (src/app/api/**), never in client components.
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient(url, serviceKey);
}
