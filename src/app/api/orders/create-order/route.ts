import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getServiceClient } from "@/lib/supabase";

// POST /api/orders/create-order
// Creates a Razorpay order for a shop cart.
// Validates cart items against live DB prices — never trusts client-side prices.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as { items: { productId: string; qty: number }[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Fetch product prices from DB — never trust client-sent prices
    const supabase = getServiceClient();
    const ids = items.map((i) => i.productId);
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, price, stock_qty, is_active")
      .in("id", ids);

    if (error) throw error;

    // Validate each item
    let totalAmount = 0;
    const validatedItems: { productId: string; name: string; qty: number; unit_price: number }[] = [];

    for (const item of items) {
      const product = products?.find((p) => p.id === item.productId);
      if (!product) return NextResponse.json({ error: `Product not found` }, { status: 400 });
      if (!product.is_active) return NextResponse.json({ error: `${product.name} is no longer available` }, { status: 400 });
      if (product.stock_qty < item.qty) return NextResponse.json({ error: `Not enough stock for ${product.name}` }, { status: 400 });

      totalAmount += product.price * item.qty;
      validatedItems.push({ productId: item.productId, name: product.name, qty: item.qty, unit_price: product.price });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: totalAmount,
      keyId: process.env.RAZORPAY_KEY_ID,
      validatedItems, // returned so cart page can confirm final prices
    });
  } catch (err) {
    console.error("[POST /api/orders/create-order]", err);
    return NextResponse.json({ error: "Could not create order. Please try again." }, { status: 500 });
  }
}