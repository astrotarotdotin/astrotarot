import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceClient } from "@/lib/supabase";

// POST /api/orders/verify-payment
// Verifies Razorpay signature, records the order, decrements stock.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer_name,
      customer_phone,
      customer_email,
      shipping_address,
      items,       // [{ productId, name, qty, unit_price }]
      total_amount,
    } = body;

    // Verify signature — proves payment came from Razorpay and wasn't tampered with
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Record the order
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        shipping_address,
        items,
        total_amount,
        payment_status: "paid",
        razorpay_order_id,
        razorpay_payment_id,
        order_status: "confirmed",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Decrement stock for each item — non-fatal, fire and forget
    // If this fails the order is still recorded; stock can be fixed manually
    for (const item of items) {
      void supabase
        .rpc("decrement_stock", { product_id: item.productId, qty: item.qty })
        .then(({ error: rpcErr }) => {
          if (rpcErr) console.warn(`Stock decrement failed for product ${item.productId}:`, rpcErr.message);
        });
    }

    // TODO: trigger WhatsApp notification to Ishita here once BSP is set up

    return NextResponse.json({ success: true, orderId: data.id });
  } catch (err) {
    console.error("[POST /api/orders/verify-payment]", err);
    return NextResponse.json({ error: "Order could not be saved" }, { status: 500 });
  }
}