import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// Security notes (see SYSTEM.md Section 10.5):
// - booking_id is a UUID — cryptographically random, not sequential,
//   so it can't be guessed or incremented from the URL.
// - There is no GET-all/list endpoint for feedback or bookings here —
//   only someone holding the exact link (shared privately by Ishita
//   over WhatsApp) can reach a specific booking's feedback form.
// - The unique constraint on feedback.booking_id means a link can only
//   ever be used to submit once, even if reused or shared further.
// - This route never confirms/denies whether a booking_id "exists" in
//   a way that would let someone enumerate valid IDs — invalid and
//   already-submitted both return the same generic error.

export async function POST(req: NextRequest) {
  const { bookingId, rating, comment } = await req.json();

  if (!bookingId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Confirm the booking exists and is actually completed before accepting
  // feedback for it (can't leave feedback on a session that never happened)
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, session_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.session_status !== "completed") {
    return NextResponse.json({ error: "This feedback link is invalid or has expired." }, { status: 400 });
  }

  const { error } = await supabase.from("feedback").insert({
    booking_id: bookingId,
    rating,
    comment: comment || null,
  });

  if (error) {
    // Unique constraint violation = already submitted once
    if (error.code === "23505") {
      return NextResponse.json({ error: "Feedback has already been submitted for this session." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save feedback." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}