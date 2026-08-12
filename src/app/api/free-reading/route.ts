import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";

const FREE_LIMIT   = 2;
const DEVICE_COOKIE = "atd"; // "astrotarot device"

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
  const ipHash = hashIp(getClientIp(req));

  // ── Rate limit: max 3 requests per IP per hour ─────────────────
  // This is separate from the 2-free-read limit below.
  // It prevents someone from hammering the endpoint even if they
  // keep clearing cookies / switching devices.
  const rateCheck = await checkRateLimit(ipHash, "free-reading", 3, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait before trying again.",
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { cards } = body as { cards: string[] };

  if (!cards || cards.length === 0) {
    return NextResponse.json({ error: "No cards provided" }, { status: 400 });
  }

  // ── Resolve or create the device cookie ───────────────────────
  let deviceId = req.cookies.get(DEVICE_COOKIE)?.value;
  const isNewDevice = !deviceId;
  if (!deviceId) deviceId = crypto.randomUUID();

  const supabase = getServiceClient();

  // ── 2-free-read limit check (cookie + IP, whichever is higher) ─
  const { data: existing } = await supabase
    .from("free_reading_attempts")
    .select("*")
    .or(`device_id.eq.${deviceId},ip_hash.eq.${ipHash}`)
    .order("attempt_count", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentCount = existing?.attempt_count ?? 0;

  if (currentCount >= FREE_LIMIT) {
    return NextResponse.json({
      limitReached: true,
      message: "You've used your free readings. Book a full session for deeper insight.",
    });
  }

  // ── Call Claude API ────────────────────────────────────────────
  // ANTHROPIC_API_KEY is Ishita's own Anthropic account key.
  let reading: string;
  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6", // ← fixed (was "claude-sonnet-5" which doesn't exist)
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content:
              `You are a warm, insightful tarot reader. The seeker has drawn these ${cards.length} cards: ` +
              `${cards.join(", ")}. Give a short, meaningful reading (150-200 words) that weaves the cards ` +
              `together into one cohesive message. Be warm and encouraging, not vague or generic. ` +
              `Do not mention that you are an AI.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Claude API error:", errText);
      return NextResponse.json(
        { error: "Reading generation failed. Please try again." },
        { status: 502 }
      );
    }

    const aiData = await aiRes.json();
    reading = aiData.content?.[0]?.text || "The cards are quiet right now — please try again.";

    // Log usage for admin spend tracker (rough estimate, not exact billing)
    const inputTokens  = aiData.usage?.input_tokens  ?? 0;
    const outputTokens = aiData.usage?.output_tokens ?? 0;
    const estimatedCost =
      (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;

    await supabase.from("ai_usage_log").insert({
      request_type:       "free_reading",
      input_tokens:       inputTokens,
      output_tokens:      outputTokens,
      estimated_cost_usd: estimatedCost,
    });
  } catch (err) {
    console.error("Free reading error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  // ── Record this attempt ────────────────────────────────────────
  if (existing) {
    await supabase
      .from("free_reading_attempts")
      .update({ attempt_count: currentCount + 1, last_attempt_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("free_reading_attempts").insert({
      device_id:     deviceId,
      ip_hash:       ipHash,
      attempt_count: 1,
    });
  }

  const response = NextResponse.json({
    reading,
    attemptsRemaining: FREE_LIMIT - (currentCount + 1),
  });

  if (isNewDevice) {
    response.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      maxAge:   60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
    });
  }

  return response;
}