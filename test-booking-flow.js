// test-booking-flow.js
//
// Verifies our booking logic works end-to-end without needing Razorpay's
// checkout popup to cooperate. Simulates a successful payment by computing
// a valid signature ourselves (the same way Razorpay would), then calls
// our own verify-payment route directly.
//
// Run with: node test-booking-flow.js
// Your dev server (npm run dev) must already be running in another terminal.

const crypto = require("crypto");

// Fill these in from your .env.local before running
const RAZORPAY_KEY_ID = "rzp_test_TDQBxrGyOLlq77";
const RAZORPAY_KEY_SECRET = "H4RzeE6J6sXmH3b7hXQwv0o5";
const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("1. Creating a Razorpay order via our own API...");
  const orderRes = await fetch(`${BASE_URL}/api/bookings/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package: "quick_clarity" }),
  });
  const order = await orderRes.json();
  console.log("   Order created:", order);

  if (!order.orderId) {
    console.error("   FAILED — no orderId returned. Check RAZORPAY keys in .env.local and that npm run dev is running.");
    return;
  }

  // Simulate a fake but *correctly signed* payment, exactly like Razorpay
  // would send after a real successful payment.
  const fakePaymentId = "pay_test_" + Date.now();
  const signature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${order.orderId}|${fakePaymentId}`)
    .digest("hex");

  console.log("\n2. Simulating a successful payment + verifying it...");
  const verifyRes = await fetch(`${BASE_URL}/api/bookings/verify-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: order.orderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: signature,
      client_name: "Test User",
      client_phone: "9999999999",
      client_email: "test@example.com",
      package: "quick_clarity",
      slot_start: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    }),
  });
  const result = await verifyRes.json();
  console.log("   Verify result:", result);

  if (result.success) {
    console.log("\n✅ SUCCESS — the booking flow works end-to-end.");
    console.log("   Go check Supabase Table Editor → bookings, you should see this test row.");
  } else {
    console.log("\n❌ FAILED at verify step — error:", result.error);
  }
}

main().catch((err) => console.error("Script error:", err));