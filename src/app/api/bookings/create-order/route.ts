import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rateLimit";
import { getServiceClient } from "@/lib/supabase";

const PACKAGE_PRICES: Record<string, number> = {
  quick_clarity: 199,
  detailed:      999,
  emergency:     1499,
};

// ── IP helpers ─────────────────────────────────────────────────
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

function hashIp(ip: string): string {
  return crypto
    .createHmac("sha256", process.env.IP_HASH_SALT || "fallback-salt-change-me")
    .update(ip)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  // ── Rate limit: max 5 booking attempts per IP per 15 minutes ──
  const ipHash = hashIp(getClientIp(req));
  const rateCheck = await checkRateLimit(ipHash, "create-order", 5, 15);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait a few minutes before trying again.",
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  // ── Normal booking order creation ──────────────────────────────
  const body = await req.json();
  const { package: pkg, coupon_code } = body;

  const baseAmount = PACKAGE_PRICES[pkg];
  if (!baseAmount) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  // Server-side coupon validation — re-checks the coupon so
  // price cannot be tampered from the client.
  let amount = baseAmount;
  if (coupon_code) {
    const supabase = getServiceClient();
    const { data: coupon } = await supabase
      .from("coupons")
      .select("discount_type, discount_value, expires_at, applies_to, is_active")
      .eq("code", String(coupon_code).trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (coupon) {
      const notExpired = !coupon.expires_at || new Date(coupon.expires_at) >= new Date();
      const pkgList = coupon.applies_to
        ? (Array.isArray(coupon.applies_to) ? coupon.applies_to : JSON.parse(coupon.applies_to))
        : null;
      const appliesToPkg = !pkgList || pkgList.includes(pkg);

      if (notExpired && appliesToPkg) {
        if (coupon.discount_type === "percent") {
          amount = Math.max(1, Math.round(baseAmount * (1 - coupon.discount_value / 100)));
        } else {
          amount = Math.max(1, baseAmount - coupon.discount_value);
        }
      }
    }
  }

  const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  const order = await razorpay.orders.create({
    amount:   amount * 100, // Razorpay expects paise
    currency: "INR",
    receipt:  `booking_${Date.now()}`,
  });

  return NextResponse.json({
    orderId: order.id,
    amount,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}