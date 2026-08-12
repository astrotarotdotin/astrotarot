// src/app/api/bookings/available-slots/route.ts
//
// Public endpoint — returns open slots for a given date.
// Previously: hardcoded Mon–Fri 9-11PM / Sat-Sun 11AM-7PM.
// Now: reads admin-configured weekly_availability + availability_blocks.
//
// Query param: ?date=YYYY-MM-DD

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const supabase = getServiceClient();

const SLOT_LENGTH_MINUTES = 60; // adjust if session length differs
const BACKEND_BUFFER_MINUTES = 30; // hidden buffer — never shown to client, per existing rule

function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeString(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param is required" }, { status: 400 });
  }

  const dayOfWeek = new Date(`${date}T00:00:00`).getDay(); // 0=Sunday ... 6=Saturday

  // 1. Check for a single-day override or full block first — it always wins
  //    over the recurring weekly pattern.
  const { data: override } = await supabase
    .from("availability_blocks")
    .select("*")
    .eq("blocked_date", date)
    .maybeSingle();

  let windows: { start_time: string; end_time: string }[] = [];

  if (override?.block_type === "full_block") {
    // Day is fully closed — return no slots at all.
    return NextResponse.json({ slots: [] });
  } else if (override?.block_type === "time_override") {
    windows = [{ start_time: override.override_start, end_time: override.override_end }];
  } else {
    // 2. No override — fall back to the recurring weekly pattern for this weekday.
    const { data: weeklyRows, error } = await supabase
      .from("weekly_availability")
      .select("start_time, end_time")
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
    }
    windows = weeklyRows || [];
  }

  if (windows.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // 3. Generate candidate slots across all windows for that day
  const candidateSlots: string[] = [];
  for (const w of windows) {
    let cursor = timeStringToMinutes(w.start_time);
    const end = timeStringToMinutes(w.end_time);
    while (cursor + SLOT_LENGTH_MINUTES <= end) {
      candidateSlots.push(minutesToTimeString(cursor));
      cursor += SLOT_LENGTH_MINUTES;
    }
  }

  // 4. Remove slots that collide with existing paid bookings that day,
  //    including the hidden 30-min buffer on both sides (backend-only, per existing rule).
  const { data: dayBookings } = await supabase
    .from("bookings")
    .select("slot_start, slot_end")
    .gte("slot_start", `${date}T00:00:00Z`)
    .lt("slot_start", `${date}T23:59:59Z`)
    .neq("session_status", "cancelled");

  const bookedRanges = (dayBookings || []).map((b) => {
    const start = new Date(b.slot_start).getTime() - BACKEND_BUFFER_MINUTES * 60000;
    const end = new Date(b.slot_end).getTime() + BACKEND_BUFFER_MINUTES * 60000;
    return { start, end };
  });

  const availableSlots = candidateSlots.filter((slotTime) => {
    const slotStart = new Date(`${date}T${slotTime}:00`).getTime();
    const slotEnd = slotStart + SLOT_LENGTH_MINUTES * 60000;
    return !bookedRanges.some((r) => slotStart < r.end && slotEnd > r.start);
  });

  // IMPORTANT: the frontend (BookPage) expects each slot as { start, label },
  // not a bare time string — `start` is sent straight through to
  // /api/bookings/verify-payment as slot_start, and `label` is what's shown
  // on the button. Returning plain strings here (as an earlier version of
  // this route did) breaks the UI silently: buttons render but show no time.
  const formattedSlots = availableSlots.map((slotTime) => {
    const startDate = new Date(`${date}T${slotTime}:00`);
    const label = startDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { start: startDate.toISOString(), label };
  });

  return NextResponse.json({ slots: formattedSlots });
}