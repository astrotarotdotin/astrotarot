import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

// GET /api/admin/orders — all orders, newest first
export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, customer_email, shipping_address, items, total_amount, payment_status, order_status, tracking_number, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ orders: data ?? [] });
  } catch (err) {
    console.error("[GET /api/admin/orders]", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// PATCH /api/admin/orders — update order_status and/or tracking_number
// Body: { id, order_status?, tracking_number? }
export async function PATCH(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { id, order_status, tracking_number } = body;

    if (!id) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });

    const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (order_status && !allowed.includes(order_status)) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (order_status !== undefined) updates.order_status = order_status;
    if (tracking_number !== undefined) updates.tracking_number = tracking_number;

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ order: data });
  } catch (err) {
    console.error("[PATCH /api/admin/orders]", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}