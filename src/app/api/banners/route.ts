import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// GET /api/banners?section=home (default) or ?section=shop
// Public endpoint — returns active banners for the given section.
// Used by the home page carousel and shop page banner.
export async function GET(req: Request) {
  try {
    const supabase = getServiceClient();

    const section = new URL(req.url).searchParams.get("section") ?? "home";

    const { data, error } = await supabase
      .from("banners")
      .select("id, title, image_url, image_url_mobile, cta_text, cta_link, sort_order")
      .eq("is_active", true)
      .eq("section", section)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ banners: data ?? [] });
  } catch (err) {
    console.error("[GET /api/banners]", err);
    return NextResponse.json({ banners: [] }); // fail silently — fallback hero shows instead
  }
}