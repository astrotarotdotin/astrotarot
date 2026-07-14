import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { generateSlotsForDate, filterAvailableSlots } from "@/lib/availability";

// GET /api/bookings/available-slots?date=2026-07-15
export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam) {
    return NextResponse.json({ error: "Missing ?date=YYYY-MM-DD" }, { status: 400 });
  }

  const date = new Date(dateParam + "T00:00:00");
  const allSlots = generateSlotsForDate(date);
  if (allSlots.length === 0) {
    return NextResponse.json({ slots: [] }); // no availability window that day
  }

  const supabase = getServiceClient();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: existingBookings, error } = await supabase
    .from("bookings")
    .select("slot_start, slot_end")
    .gte("slot_start", dayStart.toISOString())
    .lte("slot_start", dayEnd.toISOString())
    .neq("payment_status", "failed");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const available = filterAvailableSlots(allSlots, existingBookings ?? []);

  return NextResponse.json({
    slots: available.map((s) => ({
      start: s.start.toISOString(),
      // Frontend only ever sees start times — the 30-min buffer/end time
      // is a backend concept and intentionally not surfaced here.
      label: s.start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
    })),
  });
}
