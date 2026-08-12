import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceClient } from "@/lib/supabase";

const PACKAGE_PRICES: Record<string, number> = {
  quick_clarity: 199,
  detailed: 999,
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
    coupon_code,
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
  const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

  const supabase = getServiceClient();

  // ── Double-booking conflict check ─────────────────────────────────────────
  // Payment is already verified above. Now check if another booking was
  // confirmed for this exact slot while this user was in the Razorpay modal.
  // This is the only window where a race condition can occur.
  const { data: conflict } = await supabase
    .from("bookings")
    .select("id")
    .eq("slot_start", slotStart.toISOString())
    .eq("payment_status", "paid")
    .neq("session_status", "cancelled")
    .maybeSingle();

  if (conflict) {
    // Slot was taken by someone else while this user was paying.
    // Payment has already gone through on Razorpay's side — log it clearly
    // so Ishita can issue a manual refund via Razorpay dashboard.
    console.error(
      `[DOUBLE BOOKING] Slot ${slotStart.toISOString()} already taken. ` +
      `Razorpay order ${razorpay_order_id} needs manual refund.`
    );
    return NextResponse.json(
      {
        error: "SLOT_TAKEN",
        message:
          "This slot was just booked by someone else. Your payment will be refunded within 5-7 business days. Please choose a different time slot.",
      },
      { status: 409 }
    );
  }
  // ── End conflict check ─────────────────────────────────────────────────────

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
      coupon_code: coupon_code || null,
    })
    .select("id, slot_start, package")
    .single();

  if (error) {
    return NextResponse.json({ error: "Booking could not be saved" }, { status: 500 });
  }

  // TODO: trigger WhatsApp notification to Ishita here once BSP is set up.

  return NextResponse.json({ success: true, bookingId: data.id });
}