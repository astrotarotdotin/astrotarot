import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [bookingsRes, workshopRes, aiUsageRes] = await Promise.all([
    supabase.from("bookings").select("amount_paid, payment_status, session_status, created_at"),
    supabase.from("workshop_enrollments").select("amount_paid, payment_status, created_at"),
    supabase
      .from("ai_usage_log")
      .select("estimated_cost_usd, created_at")
      .gte("created_at", monthStart),
  ]);

  const bookings = bookingsRes.data || [];
  const enrollments = workshopRes.data || [];
  const aiUsage = aiUsageRes.data || [];

  const paidBookings = bookings.filter((b) => b.payment_status === "paid");
  const paidEnrollments = enrollments.filter((e) => e.payment_status === "paid");

  const isThisMonth = (dateStr: string) => new Date(dateStr) >= new Date(monthStart);

  const revenueThisMonth =
    paidBookings.filter((b) => isThisMonth(b.created_at)).reduce((sum, b) => sum + Number(b.amount_paid), 0) +
    paidEnrollments.filter((e) => isThisMonth(e.created_at)).reduce((sum, e) => sum + Number(e.amount_paid), 0);

  const sessionsUpcoming = bookings.filter((b) => b.session_status === "upcoming").length;
  const sessionsCompleted = bookings.filter((b) => b.session_status === "completed").length;

  const estimatedAiSpendThisMonth = aiUsage.reduce((sum, u) => sum + Number(u.estimated_cost_usd || 0), 0);

  return NextResponse.json({
    revenueThisMonth,
    totalBookings: bookings.length,
    sessionsUpcoming,
    sessionsCompleted,
    totalWorkshopEnrollments: enrollments.length,
    estimatedAiSpendThisMonth: Number(estimatedAiSpendThisMonth.toFixed(4)),
    aiRequestsThisMonth: aiUsage.length,
  });
}
