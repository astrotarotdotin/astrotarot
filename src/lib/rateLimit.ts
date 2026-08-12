import { getServiceClient } from "@/lib/supabase";

/**
 * Checks whether a given IP has exceeded the rate limit for an endpoint.
 *
 * Uses the rate_limit_log table in Supabase — no Redis/Upstash needed.
 *
 * @param ipHash     - SHA-256 hash of the client IP (never store raw IPs)
 * @param endpoint   - Short identifier e.g. "create-order", "free-reading"
 * @param maxHits    - Max requests allowed within the window
 * @param windowMins - Rolling window size in minutes
 */
export async function checkRateLimit(
  ipHash: string,
  endpoint: string,
  maxHits: number,
  windowMins: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  try {
    const supabase = getServiceClient();
    const windowStart = new Date(Date.now() - windowMins * 60 * 1000).toISOString();

    // Find an existing log entry for this IP + endpoint within the current window
    const { data: existing } = await supabase
      .from("rate_limit_log")
      .select("id, hit_count, window_start")
      .eq("ip_hash", ipHash)
      .eq("endpoint", endpoint)
      .gte("window_start", windowStart)
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing) {
      // First request in this window — create a new log entry
      await supabase.from("rate_limit_log").insert({
        ip_hash: ipHash,
        endpoint,
        hit_count: 1,
        window_start: new Date().toISOString(),
      });

      // ── Cleanup: delete rows older than 24 hours ──────────────────────
      // Fire-and-forget — never blocks the response or affects the result.
      // Prevents the table from growing indefinitely over time.
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      void supabase
        .from("rate_limit_log")
        .delete()
        .lt("window_start", cutoff)
        .then(({ error }) => {
          if (error) console.warn("[rateLimit] cleanup error:", error.message);
        });
      // ── End cleanup ───────────────────────────────────────────────────

      return { allowed: true };
    }

    if (existing.hit_count >= maxHits) {
      // Over the limit — calculate how long until the window resets
      const windowStartMs = new Date(existing.window_start).getTime();
      const resetAtMs = windowStartMs + windowMins * 60 * 1000;
      const retryAfterSeconds = Math.ceil((resetAtMs - Date.now()) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 0) };
    }

    // Under the limit — increment the counter
    await supabase
      .from("rate_limit_log")
      .update({ hit_count: existing.hit_count + 1 })
      .eq("id", existing.id);

    return { allowed: true };
  } catch (err) {
    // If rate limiting itself fails (DB issue), fail open — never block real users
    console.error("[checkRateLimit] error:", err);
    return { allowed: true };
  }
}