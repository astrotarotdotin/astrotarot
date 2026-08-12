import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("workshop_enrollments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Request failed" }, { status: 500 });
  return NextResponse.json({ enrollments: data });
}