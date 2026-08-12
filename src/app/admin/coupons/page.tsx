"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// The booking packages — must match PACKAGE_PRICES in the API routes
const PACKAGES = [
  { id: "quick_clarity",  label: "Quick Clarity — ₹199"     },
  { id: "detailed",       label: "Detailed Reading — ₹999"   },
  { id: "emergency",      label: "Emergency Reading — ₹1,499" },
];

interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to: string[] | null;  // null = all packages
  max_uses: number | null;      // null = unlimited
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Shared styles ─────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(200,168,240,0.2)",
  borderRadius: 6,
  color: "var(--moonwhite)",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  colorScheme: "dark",
  width: "100%",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--lavender)",
  marginBottom: 8,
};

function emptyForm() {
  return {
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    applies_to: [] as string[],   // empty = all packages
    max_uses: "",
    expires_at: "",
    is_active: true,
  };
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }

  async function fetchCoupons() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/coupons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setCoupons(json.coupons ?? []);
    } catch {
      setError("Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCoupons(); }, []);

  function togglePackage(pkgId: string) {
    setForm((f) => {
      const current = f.applies_to;
      if (current.includes(pkgId)) return { ...f, applies_to: current.filter((id) => id !== pkgId) };
      return { ...f, applies_to: [...current, pkgId] };
    });
  }

  async function handleSubmit() {
    setError(""); setSuccess("");
    const code = form.code.trim().toUpperCase();
    if (!code) return setError("Coupon code is required.");
    if (!/^[A-Z0-9_-]{2,20}$/.test(code)) return setError("Code must be 2–20 characters: letters, numbers, hyphens, underscores.");
    const value = Number(form.discount_value);
    if (!value || value <= 0) return setError("Discount value must be greater than 0.");
    if (form.discount_type === "percent" && value >= 100) return setError("Percentage discount must be less than 100%.");

    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        id: editingId,
        code,
        discount_type: form.discount_type,
        discount_value: value,
        applies_to: form.applies_to.length > 0 ? form.applies_to : null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        is_active: form.is_active,
      };

      const res = await fetch("/api/admin/coupons", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save.");

      setSuccess(editingId ? "Coupon updated." : "Coupon created.");
      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
      fetchCoupons();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Coupon) {
    const token = await getToken();
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: c.id, is_active: !c.is_active }),
    });
    fetchCoupons();
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    const token = await getToken();
    await fetch(`/api/admin/coupons?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCoupons();
  }

  function startEdit(c: Coupon) {
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      applies_to: c.applies_to ?? [],
      max_uses: c.max_uses ? String(c.max_uses) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      is_active: c.is_active,
    });
    setEditingId(c.id);
    setShowForm(true);
    setError(""); setSuccess("");
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 6 }}>Coupons</h1>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", fontSize: 15, opacity: 0.75 }}>
            Create and manage discount codes for bookings. Codes are case-insensitive when customers enter them.
          </p>
        </div>
        {!showForm && (
          <button className="btn-fairy" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); setError(""); setSuccess(""); }}>
            + New Coupon
          </button>
        )}
      </div>

      {error   && <div style={{ background: "rgba(196,96,138,0.15)", border: "1px solid rgba(196,96,138,0.35)", borderRadius: 6, padding: "12px 16px", marginBottom: 20, color: "var(--rose-soft)", fontFamily: "var(--font-ui)", fontSize: 14 }}>{error}</div>}
      {success && <div style={{ background: "rgba(94,167,94,0.12)",  border: "1px solid rgba(94,167,94,0.3)",  borderRadius: 6, padding: "12px 16px", marginBottom: 20, color: "#7fd47f",           fontFamily: "var(--font-ui)", fontSize: 14 }}>{success}</div>}

      {/* ── Create / Edit Form ─────────────────────────────── */}
      {showForm && (
        <div className="card-fairy" style={{ padding: 28, borderRadius: 8, marginBottom: 32 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 24 }}>{editingId ? "Edit Coupon" : "New Coupon"}</h2>

          {/* Code */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Coupon Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. FIRST50 or WELCOME100"
              style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, maxWidth: 280 }}
              disabled={!!editingId}
            />
            {editingId && <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--violet-mid)", marginTop: 5, opacity: 0.7 }}>Code cannot be changed after creation.</p>}
          </div>

          {/* Discount type + value */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Discount Type</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as "percent" | "fixed" }))}
                style={{ ...inputStyle, colorScheme: "dark" }}
              >
                <option value="percent">Percentage (e.g. 50%)</option>
                <option value="fixed">Fixed Amount (e.g. ₹100 off)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{form.discount_type === "percent" ? "Discount %" : "Amount Off ₹"}</label>
              <input
                type="number"
                min="1"
                max={form.discount_type === "percent" ? 99 : undefined}
                value={form.discount_value}
                onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === "percent" ? "e.g. 50 (for 50% off)" : "e.g. 100 (for ₹100 off)"}
                style={inputStyle}
              />
              {form.discount_type === "percent" && (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--violet-mid)", marginTop: 5, opacity: 0.7 }}>1–99 only. 100% off not allowed.</p>
              )}
            </div>
          </div>

          {/* Applies to */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Applies To</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => togglePackage(pkg.id)}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    padding: "7px 14px",
                    borderRadius: 4,
                    border: `1px solid ${form.applies_to.includes(pkg.id) ? "var(--violet)" : "rgba(200,168,240,0.2)"}`,
                    background: form.applies_to.includes(pkg.id) ? "rgba(123,94,167,0.25)" : "transparent",
                    color: form.applies_to.includes(pkg.id) ? "var(--lavender)" : "var(--silver)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {form.applies_to.includes(pkg.id) ? "✓ " : ""}{pkg.label}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", marginTop: 8, opacity: 0.65 }}>
              {form.applies_to.length === 0
                ? "No packages selected — coupon will apply to ALL packages."
                : `Applies to ${form.applies_to.length} selected package${form.applies_to.length > 1 ? "s" : ""}.`}
            </p>
          </div>

          {/* Max uses + expiry */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Max Total Uses (optional)</label>
              <input
                type="number" min="1"
                value={form.max_uses}
                onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                placeholder="Leave blank for unlimited"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Expiry Date (optional)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                style={{ ...inputStyle, colorScheme: "dark" }}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: form.is_active ? "var(--violet)" : "rgba(200,168,240,0.2)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
            >
              <span style={{ position: "absolute", top: 3, left: form.is_active ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "var(--moonwhite)", transition: "left 0.2s" }} />
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)" }}>
              {form.is_active ? "Active — customers can use this code" : "Inactive — code will not work"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-fairy" onClick={handleSubmit} disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Create Coupon"}</button>
            <button className="btn-ghost-fairy" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()); setError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Coupon List ────────────────────────────────────── */}
      {loading ? (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", opacity: 0.6 }}>Loading…</p>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.5 }}>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", fontSize: 16 }}>No coupons yet. Create one above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {coupons.map((c) => {
            const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
            return (
              <div key={c.id} className="card-fairy" style={{ padding: "16px 20px", borderRadius: 8, opacity: c.is_active && !isExpired ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {/* Code + status badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--lavender)", letterSpacing: "0.06em" }}>{c.code}</span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, padding: "3px 9px", borderRadius: 3, background: c.is_active && !isExpired ? "rgba(94,167,94,0.15)" : "rgba(150,150,150,0.12)", color: c.is_active && !isExpired ? "#7fd47f" : "var(--silver)", border: `1px solid ${c.is_active && !isExpired ? "rgba(94,167,94,0.3)" : "rgba(150,150,150,0.2)"}` }}>
                        {isExpired ? "Expired" : c.is_active ? "Active" : "Inactive"}
                      </span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, padding: "3px 9px", borderRadius: 3, background: "rgba(196,96,138,0.12)", color: "var(--rose-soft)", border: "1px solid rgba(196,96,138,0.25)" }}>
                        {c.discount_type === "percent" ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                      </span>
                    </div>
                    {/* Details */}
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", opacity: 0.7 }}>
                        Packages: {c.applies_to && c.applies_to.length > 0 ? c.applies_to.map((id) => PACKAGES.find((p) => p.id === id)?.label?.split(" — ")[0] ?? id).join(", ") : "All"}
                      </span>
                      {c.max_uses !== null && (
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", opacity: 0.7 }}>
                          Max uses: {c.max_uses}
                        </span>
                      )}
                      {c.expires_at && (
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: isExpired ? "var(--rose-soft)" : "var(--silver)", opacity: 0.7 }}>
                          Expires: {new Date(c.expires_at).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button className="btn-ghost-fairy" onClick={() => startEdit(c)} style={{ fontSize: 13 }}>Edit</button>
                    <button className="btn-ghost-fairy" onClick={() => toggleActive(c)} style={{ fontSize: 13 }}>{c.is_active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => deleteCoupon(c.id)} style={{ fontFamily: "var(--font-ui)", fontSize: 13, padding: "8px 14px", background: "rgba(196,96,138,0.1)", border: "1px solid rgba(196,96,138,0.3)", borderRadius: 4, color: "var(--rose-soft)", cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}