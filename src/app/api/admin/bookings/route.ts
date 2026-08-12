import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

const VALID_SESSION_STATUSES = ["upcoming", "completed", "cancelled"];
const SLOT_LENGTH_MINUTES = 60; // must match /api/bookings/available-slots

export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();

  const sessionStatus = req.nextUrl.searchParams.get("session_status");
  const paymentStatus = req.nextUrl.searchParams.get("payment_status");
  const month = req.nextUrl.searchParams.get("month");

  let query = supabase.from("bookings").select("*").order("slot_start", { ascending: true });

  if (sessionStatus) query = query.eq("session_status", sessionStatus);
  if (paymentStatus) query = query.eq("payment_status", paymentStatus);
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    const monthStart = new Date(Date.UTC(year, mon - 1, 1)).toISOString();
    const monthEnd = new Date(Date.UTC(year, mon, 1)).toISOString();
    query = query.gte("slot_start", monthStart).lt("slot_start", monthEnd);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: "Request failed" }, { status: 500 });
  return NextResponse.json({ bookings: data });
}

export async function PATCH(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, session_status, action, new_slot_start } = body;
  const supabase = getServiceClient();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // ---- Reschedule: move an existing booking to a different date/time ----
  if (action === "reschedule") {
    if (!new_slot_start) {
      return NextResponse.json({ error: "new_slot_start is required" }, { status: 400 });
    }

    const newStart = new Date(new_slot_start);
    const newEnd = new Date(newStart.getTime() + SLOT_LENGTH_MINUTES * 60000);

    const { error } = await supabase
      .from("bookings")
      .update({
        slot_start: newStart.toISOString(),
        slot_end: newEnd.toISOString(),
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: "Reschedule failed" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ---- Status change (mark completed / cancel) ----
  if (!session_status) {
    return NextResponse.json({ error: "session_status is required" }, { status: 400 });
  }
  if (!VALID_SESSION_STATUSES.includes(session_status)) {
    return NextResponse.json(
      { error: `session_status must be one of: ${VALID_SESSION_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("bookings").update({ session_status }).eq("id", id);

  if (error) return NextResponse.json({ error: "Request failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}