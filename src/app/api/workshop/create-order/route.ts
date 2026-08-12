import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const WORKSHOP_PRICE = 2999;

export async function POST() {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  const order = await razorpay.orders.create({
    amount: WORKSHOP_PRICE * 100,
    currency: "INR",
    receipt: `workshop_${Date.now()}`,
  });

  return NextResponse.json({ orderId: order.id, amount: WORKSHOP_PRICE, keyId: process.env.RAZORPAY_KEY_ID });
}
