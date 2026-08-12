import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceClient } from "@/lib/supabase";

const WORKSHOP_PRICE = 2999;

// Auto-computed: always 1 month from the current date.
// No hardcoded date — updates itself every time a new enrollment is saved.
function getNextBatchDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  // Format as YYYY-MM-DD
  return d.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    client_name,
    client_phone,
    client_email,
  } = body;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("workshop_enrollments")
    .insert({
      client_name,
      client_phone,
      client_email,
      batch_start_date: getNextBatchDate(),
      amount_paid: WORKSHOP_PRICE,
      payment_status: "paid",
      razorpay_order_id,
      razorpay_payment_id,
    })
    .select("id, batch_start_date")
    .single();

  if (error) {
    return NextResponse.json({ error: "Enrollment could not be saved" }, { status: 500 });
  }

  // TODO: WhatsApp notification to Ishita — same as bookings, not wired
  // yet since there's no BSP account (see SYSTEM.md Section 10).

  // Trimmed response — only what the confirmation screen needs.
  return NextResponse.json({ success: true, enrollmentId: data.id });
}