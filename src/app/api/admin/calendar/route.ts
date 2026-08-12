// src/app/api/admin/calendar/route.ts
//
// Admin-only endpoint to manage:
//  - the recurring weekly availability pattern
//  - single-day overrides (full block OR custom hours for one date)
//
// GET    -> returns both the weekly pattern and upcoming overrides
// POST   -> replaces the weekly pattern (multi-day + shared time range in one action)
// PUT    -> creates/updates a single-day override
// DELETE -> removes a single-day override (?date=YYYY-MM-DD)

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

const supabase = getServiceClient();

export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: weekly, error: weeklyErr } = await supabase
    .from("weekly_availability")
    .select("*")
    .order("day_of_week", { ascending: true });

  if (weeklyErr) {
    return NextResponse.json({ error: "Failed to load weekly pattern" }, { status: 500 });
  }

  // Only return overrides from today onward — past overrides are irrelevant clutter
  const today = new Date().toISOString().split("T")[0];
  const { data: overrides, error: overrideErr } = await supabase
    .from("availability_blocks")
    .select("*")
    .gte("blocked_date", today)
    .order("blocked_date", { ascending: true });

  if (overrideErr) {
    return NextResponse.json({ error: "Failed to load overrides" }, { status: 500 });
  }

  return NextResponse.json({ weekly, overrides });
}

// Body: { pattern: { day_of_week: number, start_time: "HH:MM", end_time: "HH:MM" }[] }
//
// Full-replace semantics: the entire weekly_availability table is rebuilt from
// this array every time Ishita hits Save. One generic contract supports all
// three cases she needs:
//   1. Same time range applied to several days (UI fills the array client-side)
//   2. Different time ranges per day
//   3. Multiple time windows on the same day (two rows with the same
//      day_of_week — e.g. a morning window + an evening window)
export async function POST(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pattern } = body;

  if (!Array.isArray(pattern)) {
    return NextResponse.json({ error: "pattern must be an array" }, { status: 400 });
  }

  for (const row of pattern) {
    if (row.day_of_week < 0 || row.day_of_week > 6) {
      return NextResponse.json({ error: "day_of_week must be between 0 and 6" }, { status: 400 });
    }
    if (!row.start_time || !row.end_time || row.start_time >= row.end_time) {
      return NextResponse.json(
        { error: `Invalid time range for day ${row.day_of_week}` },
        { status: 400 }
      );
    }
  }

  // Wipe and rebuild — guarantees the table matches exactly what the admin
  // sees on screen, no partial-update edge cases to reason about.
  const { error: deleteErr } = await supabase
    .from("weekly_availability")
    .delete()
    .gte("day_of_week", 0); // matches every row

  if (deleteErr) {
    return NextResponse.json({ error: "Failed to clear existing pattern" }, { status: 500 });
  }

  if (pattern.length === 0) {
    return NextResponse.json({ success: true }); // admin cleared the whole schedule
  }

  const rows = pattern.map((row: any) => ({
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    is_active: true,
  }));

  const { error: insertErr } = await supabase.from("weekly_availability").insert(rows);

  if (insertErr) {
    return NextResponse.json({ error: "Failed to save new pattern" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Body: { date: "YYYY-MM-DD", block_type: "full_block" | "time_override",
//         override_start?: "HH:MM", override_end?: "HH:MM", reason?: string }
export async function PUT(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, block_type, override_start, override_end, reason } = body;

  if (!date || !block_type) {
    return NextResponse.json({ error: "date and block_type are required" }, { status: 400 });
  }
  if (block_type === "time_override" && (!override_start || !override_end)) {
    return NextResponse.json(
      { error: "override_start and override_end are required for time_override" },
      { status: 400 }
    );
  }

  // IMPORTANT: check for existing PAID bookings on this date before blocking it.
  // We never auto-cancel a paid session — see the reschedule-flow note below.
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("id, slot_start, client_name, client_phone")
    .gte("slot_start", `${date}T00:00:00Z`)
    .lt("slot_start", `${date}T23:59:59Z`)
    .eq("session_status", "upcoming");

  const { error: upsertErr } = await supabase.from("availability_blocks").upsert(
    {
      blocked_date: date,
      block_type,
      override_start: block_type === "time_override" ? override_start : null,
      override_end: block_type === "time_override" ? override_end : null,
      reason: reason || null,
    },
    { onConflict: "blocked_date" }
  );

  if (upsertErr) {
    return NextResponse.json({ error: "Failed to save override" }, { status: 500 });
  }

  // Flag it back to the admin UI rather than silently doing nothing —
  // the actual reschedule flow is a manual, human step (see reschedule endpoint).
  return NextResponse.json({
    success: true,
    affectedBookings: existingBookings || [],
    warning:
      existingBookings && existingBookings.length > 0
        ? `${existingBookings.length} paid booking(s) exist on this date and were NOT cancelled. Reschedule them manually.`
        : null,
  });
}

export async function DELETE(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param is required" }, { status: 400 });
  }

  const { error } = await supabase.from("availability_blocks").delete().eq("blocked_date", date);

  if (error) {
    return NextResponse.json({ error: "Failed to remove override" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}