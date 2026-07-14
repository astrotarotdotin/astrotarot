import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const PACKAGE_PRICES: Record<string, number> = {
  quick_clarity: 199,
  insight: 599,
  detailed: 1199,
  emergency: 1499,
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { package: pkg } = body;

  const amount = PACKAGE_PRICES[pkg];
  if (!amount) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  const order = await razorpay.orders.create({
    amount: amount * 100, // Razorpay expects paise
    currency: "INR",
    receipt: `booking_${Date.now()}`,
  });

  return NextResponse.json({ orderId: order.id, amount, keyId: process.env.RAZORPAY_KEY_ID });
}
