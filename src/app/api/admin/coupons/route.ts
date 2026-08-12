import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

// GET /api/admin/coupons — all coupons for admin panel
export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ coupons: data ?? [] });
  } catch (err) {
    console.error("[GET /api/admin/coupons]", err);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

// POST /api/admin/coupons — create a new coupon
export async function POST(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { code, discount_type, discount_value, applies_to, max_uses, expires_at, is_active } = body;

    if (!code?.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });
    if (!discount_type || !discount_value) return NextResponse.json({ error: "Discount type and value are required" }, { status: 400 });
    if (discount_type === "percent" && Number(discount_value) >= 100) {
      return NextResponse.json({ error: "Percentage discount must be less than 100%" }, { status: 400 });
    }

    // Check for duplicate code
    const { data: existing } = await supabase
      .from("coupons")
      .select("id")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (existing) return NextResponse.json({ error: `Coupon code "${code.toUpperCase()}" already exists.` }, { status: 409 });

    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: code.trim().toUpperCase(),
        discount_type,
        discount_value: Number(discount_value),
        applies_to: applies_to && applies_to.length > 0 ? applies_to : null,
        max_uses: max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/coupons]", err);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}

// PATCH /api/admin/coupons — update a coupon
export async function PATCH(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });

    const allowed = ["discount_type", "discount_value", "applies_to", "max_uses", "expires_at", "is_active"];
    const safe: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) safe[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("coupons")
      .update(safe)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ coupon: data });
  } catch (err) {
    console.error("[PATCH /api/admin/coupons]", err);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

// DELETE /api/admin/coupons?id=uuid
export async function DELETE(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/coupons]", err);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}