import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

// ── GET /api/admin/banners ─────────────────────────────────────
// Returns ALL banners (active + inactive) for the admin panel.
export async function GET(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ banners: data ?? [] });
  } catch (err) {
    console.error("[GET /api/admin/banners]", err);
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

// ── POST /api/admin/banners ────────────────────────────────────
// Creates a new banner. Max 3 banners enforced here too (belt + suspenders).
export async function POST(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { title, image_url, image_url_mobile, cta_text, cta_link, sort_order, section } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: "Banner title is required" }, { status: 400 });
    }
    if (!image_url?.trim()) {
      return NextResponse.json({ error: "Desktop image is required" }, { status: 400 });
    }
    if (!image_url_mobile?.trim()) {
      return NextResponse.json({ error: "Mobile image is required" }, { status: 400 });
    }

    // Enforce max 3 banners
    const { count } = await supabase
      .from("banners")
      .select("*", { count: "exact", head: true });

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Maximum of 3 banners allowed. Delete one before adding another." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("banners")
      .insert({
        title: title.trim(),
        image_url,
        image_url_mobile,
        cta_text: cta_text?.trim() || null,
        cta_link: cta_link?.trim() || null,
        sort_order: sort_order ?? (count ?? 0), // place at end by default
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ banner: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/banners]", err);
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
  }
}

// ── PATCH /api/admin/banners ───────────────────────────────────
// Updates a banner — handles toggle active, reorder, and field edits.
// Body must include: id
// Optional: is_active, sort_order, title, cta_text, cta_link, image_url, image_url_mobile
export async function PATCH(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Banner ID is required" }, { status: 400 });
    }

    // Only allow safe fields to be updated
    const allowedFields = [
      "title", "image_url", "image_url_mobile",
      "cta_text", "cta_link", "sort_order", "is_active",
    ];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("banners")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ banner: data });
  } catch (err) {
    console.error("[PATCH /api/admin/banners]", err);
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

// ── DELETE /api/admin/banners ──────────────────────────────────
// Deletes a banner by ID. Pass id as a query param: ?id=uuid
export async function DELETE(req: NextRequest) {
  const user = await verifyAdminRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Banner ID is required" }, { status: 400 });
    }

    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/banners]", err);
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}