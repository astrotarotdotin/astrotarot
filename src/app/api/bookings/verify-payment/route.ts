import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceClient } from "@/lib/supabase";

const PACKAGE_PRICES: Record<string, number> = {
  quick_clarity: 199,
  insight: 599,
  detailed: 1199,
  emergency: 1499,
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    client_name,
    client_phone,
    client_email,
    package: pkg,
    slot_start,
  } = body;

  // Verify the payment actually came from Razorpay and wasn't tampered with
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const slotStart = new Date(slot_start);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60000); // 30-min buffer, backend-only

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_name,
      client_phone,
      client_email,
      package: pkg,
      amount_paid: PACKAGE_PRICES[pkg],
      slot_start: slotStart.toISOString(),
      slot_end: slotEnd.toISOString(),
      payment_status: "paid",
      razorpay_order_id,
      razorpay_payment_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // TODO: trigger WhatsApp notification to Ishita here once the BSP
  // sender number is set up (see SYSTEM.md Section 10, item 1).
  // Not wired yet — no BSP account exists at this stage of the build.

  return NextResponse.json({ success: true, booking: data });
}
