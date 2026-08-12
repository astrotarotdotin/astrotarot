"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const inputStyle: React.CSSProperties = {
  padding: 12,
  background: "var(--deep)",
  border: "1px solid rgba(200,168,240,0.25)",
  color: "var(--moonwhite)",
  fontFamily: "var(--font-body)",
};

// ── Inner component — uses useSearchParams, must be inside <Suspense> ──
// Next.js 15 requires any component calling useSearchParams() to be
// wrapped in a Suspense boundary, otherwise the build fails.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sessionExpired = searchParams.get("reason") === "expired";

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/admin/bookings");
  };

  return (
    <section className="section" style={{ maxWidth: 380, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="rune-line" style={{ marginBottom: 20 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--violet-mid)" }}>
            Private
          </span>
        </div>
        <h1 style={{ fontSize: 26 }}>Admin Login</h1>
      </div>

      {sessionExpired && (
        <div style={{
          background: "rgba(196,96,138,0.12)",
          border: "1px solid rgba(196,96,138,0.3)",
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 16,
          color: "var(--rose-soft)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          textAlign: "center",
        }}>
          Your session expired. Please sign in again.
        </div>
      )}

      <div className="card-fairy" style={{ padding: 28, borderRadius: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>
        {error && <p style={{ color: "var(--rose-soft)", fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <button className="btn-fairy" onClick={handleLogin} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </div>
    </section>
  );
}

// ── Page export — wraps LoginForm in Suspense ──────────────────
// The fallback is invisible (null) because the form renders instantly
// client-side — Suspense is only here to satisfy Next.js 15's build requirement.
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
