import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// GET /api/products
// Public — returns active products ordered by created_at desc.
// Used by the public /shop page. No auth required.
export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, stock_qty, original_price, discount_percent")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ products: [] });
  }
}