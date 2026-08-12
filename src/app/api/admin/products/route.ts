import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

// GET /api/admin/products — all products (active + inactive) for admin panel
export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/admin/products — create a new product
export async function POST(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { name, description, price, image_url, stock_qty, original_price, discount_percent } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    if (!price || isNaN(Number(price)) || Number(price) <= 0) return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    if (!image_url?.trim()) return NextResponse.json({ error: "Product image is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        price: Number(price),
        image_url,
        stock_qty: Number(stock_qty) || 0,
        original_price: original_price ? Number(original_price) : null,
        discount_percent: discount_percent ? Number(discount_percent) : null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/products]", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

// PATCH /api/admin/products — update product (edit fields, toggle active, update stock)
export async function PATCH(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });

    const allowed = ["name", "description", "price", "image_url", "stock_qty", "is_active", "original_price", "discount_percent"];
    const safe: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) safe[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("products")
      .update(safe)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ product: data });
  } catch (err) {
    console.error("[PATCH /api/admin/products]", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/admin/products?id=uuid
export async function DELETE(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/products]", err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}