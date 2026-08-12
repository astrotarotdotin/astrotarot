import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// POST /api/bookings/validate-coupon
// Public — validates a coupon code for a given package.
// Called from the book page before Razorpay opens.
export async function POST(req: NextRequest) {
  try {
    const { code, package: pkg } = await req.json();

    if (!code || !pkg) {
      return NextResponse.json({ valid: false, error: "Code and package are required." }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Invalid or expired coupon code." });
    }

    // 1. Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This coupon has expired." });
    }

    // 2. Check package applicability
    // applies_to is stored as a JSON array of package IDs, or null = all packages
    if (coupon.applies_to) {
      const applicablePackages: string[] = Array.isArray(coupon.applies_to)
        ? coupon.applies_to
        : JSON.parse(coupon.applies_to);
      if (!applicablePackages.includes(pkg)) {
        return NextResponse.json({
          valid: false,
          error: `This coupon is not valid for the selected package. It applies to: ${applicablePackages.join(", ").replace(/_/g, " ")}.`,
        });
      }
    }

    // 3. Check usage limit
    if (coupon.max_uses !== null) {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("coupon_code", coupon.code)
        .eq("payment_status", "paid");

      if ((count ?? 0) >= coupon.max_uses) {
        return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit." });
      }
    }

    // 4. Coupon is valid — return discount details
    const discountDisplay =
      coupon.discount_type === "percent"
        ? `${coupon.discount_value}% off`
        : `₹${coupon.discount_value} off`;

    return NextResponse.json({
      valid: true,
      discount_type: coupon.discount_type,   // "percent" | "fixed"
      discount_value: coupon.discount_value,
      message: `Coupon applied — ${discountDisplay}!`,
    });
  } catch (err) {
    console.error("[POST /api/bookings/validate-coupon]", err);
    return NextResponse.json({ valid: false, error: "Could not validate coupon. Try again." }, { status: 500 });
  }
}