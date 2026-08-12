"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface OrderItem { name: string; qty: number; unit_price: number; }
interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: string;
  items: OrderItem[];
  total_amount: number;
  payment_status: string;
  order_status: string;
  tracking_number: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  confirmed: { bg: "rgba(94,167,94,0.12)",    border: "rgba(94,167,94,0.3)",    color: "#7fd47f" },
  shipped:   { bg: "rgba(123,94,167,0.15)",   border: "rgba(123,94,167,0.35)",  color: "var(--lavender)" },
  delivered: { bg: "rgba(232,200,122,0.12)",  border: "rgba(232,200,122,0.3)",  color: "var(--gold)" },
  pending:   { bg: "rgba(150,150,150,0.1)",   border: "rgba(150,150,150,0.2)",  color: "var(--silver)" },
  cancelled: { bg: "rgba(196,96,138,0.12)",   border: "rgba(196,96,138,0.3)",   color: "var(--rose-soft)" },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }

  async function fetchOrders() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const fetched: Order[] = json.orders ?? [];
      setOrders(fetched);
      // Pre-fill tracking inputs with existing tracking numbers
      const inputs: Record<string, string> = {};
      fetched.forEach((o) => { inputs[o.id] = o.tracking_number ?? ""; });
      setTrackingInputs(inputs);
    } catch { setError("Failed to load orders."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchOrders(); }, []);

  async function updateOrder(id: string, updates: { order_status?: string; tracking_number?: string }) {
    setSaving(id);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error();
      fetchOrders();
    } catch { setError("Failed to update order."); }
    finally { setSaving(null); }
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.order_status === filter);

  const inputStyle: React.CSSProperties = { padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,240,0.2)", borderRadius: 6, color: "var(--moonwhite)", fontFamily: "var(--font-body)", fontSize: 13, colorScheme: "dark" };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 6 }}>Orders</h1>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", fontSize: 14, opacity: 0.75 }}>Manage shop orders. Mark shipped and add tracking numbers here.</p>
      </div>

      {error && <div style={{ background: "rgba(196,96,138,0.15)", border: "1px solid rgba(196,96,138,0.35)", borderRadius: 6, padding: "12px 16px", marginBottom: 20, color: "var(--rose-soft)", fontFamily: "var(--font-ui)", fontSize: 13 }}>{error}</div>}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {["all", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 14px", borderRadius: 4, border: `1px solid ${filter === s ? "var(--violet)" : "rgba(200,168,240,0.2)"}`, background: filter === s ? "rgba(123,94,167,0.2)" : "transparent", color: filter === s ? "var(--lavender)" : "var(--silver)", cursor: "pointer" }}>
            {s === "all" ? `All (${orders.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${orders.filter(o => o.order_status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", opacity: 0.6 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.5 }}>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)" }}>{filter === "all" ? "No orders yet." : `No ${filter} orders.`}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((order) => {
            const sc = STATUS_COLORS[order.order_status] ?? STATUS_COLORS.pending;
            const isExpanded = expandedId === order.id;
            return (
              <div key={order.id} className="card-fairy" style={{ padding: 20, borderRadius: 8 }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--lavender)" }}>{order.customer_name}</span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, padding: "3px 9px", borderRadius: 3, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                        {order.order_status}
                      </span>
                    </div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--silver)", opacity: 0.8, marginBottom: 2 }}>{order.customer_phone}{order.customer_email ? ` · ${order.customer_email}` : ""}</p>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--gold)" }}>₹{order.total_amount.toLocaleString("en-IN")}</p>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", opacity: 0.7, marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button className="btn-ghost-fairy" onClick={() => setExpandedId(isExpanded ? null : order.id)} style={{ fontSize: 11, flexShrink: 0 }}>
                    {isExpanded ? "Collapse" : "Details"}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(200,168,240,0.12)" }}>
                    {/* Items */}
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--violet-mid)", marginBottom: 8 }}>Items</p>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--silver)", marginBottom: 4 }}>
                        <span>{item.name} × {item.qty}</span>
                        <span>₹{(item.unit_price * item.qty).toLocaleString("en-IN")}</span>
                      </div>
                    ))}

                    {/* Shipping address */}
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--violet-mid)", margin: "16px 0 6px" }}>Shipping Address</p>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--silver)", whiteSpace: "pre-line" }}>{order.shipping_address}</p>

                    {/* Tracking */}
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--violet-mid)", margin: "16px 0 8px" }}>Tracking Number</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        type="text"
                        value={trackingInputs[order.id] ?? ""}
                        onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        placeholder="Enter tracking number…"
                        style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                      />
                      <button
                        className="btn-ghost-fairy"
                        disabled={saving === order.id}
                        onClick={() => updateOrder(order.id, { tracking_number: trackingInputs[order.id] ?? "" })}
                        style={{ fontSize: 11 }}
                      >
                        {saving === order.id ? "Saving…" : "Save"}
                      </button>
                    </div>

                    {/* Status actions */}
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--violet-mid)", margin: "16px 0 8px" }}>Update Status</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["confirmed", "shipped", "delivered", "cancelled"].filter((s) => s !== order.order_status).map((s) => (
                        <button key={s} className="btn-ghost-fairy" disabled={saving === order.id} onClick={() => updateOrder(order.id, { order_status: s })} style={{ fontSize: 11 }}>
                          Mark {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}