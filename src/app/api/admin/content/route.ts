import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

// GET /api/admin/content
// Returns all site_content rows for the admin content management page.
export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value, updated_at")
      .order("key");

    if (error) throw error;

    // Return as key→value map
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      map[row.key] = row.value ?? "";
    }

    return NextResponse.json({ content: map });
  } catch (err) {
    console.error("[GET /api/admin/content]", err);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}

// PATCH /api/admin/content
// Updates one or more site_content keys.
// Body: { updates: { key: value, key: value, ... } }
// Also handles testimonials which are stored as a JSON string under key "testimonials".
export async function PATCH(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { updates } = body as { updates: Record<string, string> };

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "updates object is required" }, { status: 400 });
    }

    // Allowed keys — whitelist to prevent arbitrary DB writes
    const ALLOWED_KEYS = [
      "hero_tagline",
      "hero_headline",
      "hero_subtext",
      "announcement_text",
      "announcement_active",
      "shop_enabled",
      "testimonials",        // stored as JSON string: [{name,role,quote}]
      "about_bio",           // Ishita's bio shown on home page About section
      "about_photo_url",     // Cloudinary URL of Ishita's photo
    ];

    const results = [];
    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_KEYS.includes(key)) continue; // silently skip unknown keys

      const { error } = await supabase
        .from("site_content")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );

      if (error) throw error;
      results.push(key);
    }

    return NextResponse.json({ updated: results });
  } catch (err) {
    console.error("[PATCH /api/admin/content]", err);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}