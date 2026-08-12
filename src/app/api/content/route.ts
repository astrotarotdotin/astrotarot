import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// GET /api/content
// Public endpoint — returns site_content values.
// Optionally filter by key: /api/content?key=hero_tagline
// Used by home page and layout for tagline, testimonials, announcement banner.
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    let query = supabase.from("site_content").select("key, value");
    if (key) query = query.eq("key", key);

    const { data, error } = await query;
    if (error) throw error;

    // Return as a flat key→value map for easy use in components
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      map[row.key] = row.value ?? "";
    }

    return NextResponse.json({ content: map });
  } catch (err) {
    console.error("[GET /api/content]", err);
    return NextResponse.json({ content: {} }); // fail silently — fallback text shows instead
  }
}