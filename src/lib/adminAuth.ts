import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// Verifies the Supabase session token sent from the admin dashboard.
// Returns the authenticated user, or null if the token is missing/invalid.
export async function verifyAdminRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
