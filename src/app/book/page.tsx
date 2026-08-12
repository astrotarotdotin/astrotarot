"use client";
import { useState, useEffect } from "react";
import Script from "next/script";
import { motion } from "framer-motion";

const PACKAGES = [
  { id: "quick_clarity", name: "Quick Clarity",    desc: "1 question",   price: 199  },
  { id: "detailed",      name: "Detailed Reading",  desc: "Full session", price: 999  },
  { id: "emergency",     name: "Emergency Reading", desc: "Same-day",     price: 1499 },
];

interface Slot {
  start: string;
  label: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function BookPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [status, setStatus] = useState<"idle" | "paying" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [couponMsg, setCouponMsg] = useState("");
  const [discount, setDiscount] = useState<{ type: "percent" | "fixed"; value: number } | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/bookings/available-slots?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  // Compute displayed price after coupon
  function computeFinalPrice(basePrice: number, disc: { type: "percent" | "fixed"; value: number } | null): number {
    if (!disc) return basePrice;
    if (disc.type === "percent") return Math.max(1, Math.round(basePrice * (1 - disc.value / 100)));
    return Math.max(1, basePrice - disc.value);
  }

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (!selectedPackage) { setCouponMsg("Please select a package first."); setCouponStatus("invalid"); return; }

    setCouponStatus("checking");
    setCouponMsg("");
    try {
      const res = await fetch("/api/bookings/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, package: selectedPackage }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        const base = PACKAGES.find((p) => p.id === selectedPackage)!.price;
        const disc = { type: data.discount_type as "percent" | "fixed", value: data.discount_value };
        setDiscount(disc);
        setFinalPrice(computeFinalPrice(base, disc));
        setCouponStatus("valid");
        setCouponMsg(data.message || `Coupon applied!`);
      } else {
        setDiscount(null);
        setFinalPrice(null);
        setCouponStatus("invalid");
        setCouponMsg(data.error || "Invalid or expired coupon.");
      }
    } catch {
      setCouponStatus("invalid");
      setCouponMsg("Could not validate coupon. Please try again.");
    }
  }

  function removeCoupon() {
    setCouponCode("");
    setDiscount(null);
    setFinalPrice(null);
    setCouponStatus("idle");
    setCouponMsg("");
  }

  const handleBook = async () => {
    if (!selectedPackage || !selectedSlot || !name || !phone) return;
    setStatus("paying");
    setErrorMsg("");

    const orderRes = await fetch("/api/bookings/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package: selectedPackage, coupon_code: couponCode.trim().toUpperCase() || undefined }),
    });
    const order = await orderRes.json();

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount * 100,
      currency: "INR",
      name: "AstroTarot",
      description: PACKAGES.find((p) => p.id === selectedPackage)?.name,
      order_id: order.orderId,
      prefill: { name, contact: phone, email },
      theme: { color: "#7B5EA7" },
      handler: async function (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        const verifyRes = await fetch("/api/bookings/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...response,
            client_name: name,
            client_phone: phone,
            client_email: email,
            package: selectedPackage,
            slot_start: selectedSlot,
          }),
        });
        const result = await verifyRes.json();
        if (result.success) {
          setStatus("success");
        } else {
          // Surface the specific error message from the server (e.g. slot taken)
          setErrorMsg(result.message || result.error || "Something went wrong verifying your payment.");
          setStatus("error");
        }
      },
      modal: { ondismiss: () => setStatus("idle") },
    });
    rzp.open();
  };

  if (status === "success") {
    return (
      <section className="section" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <h1 className="text-glow-rose" style={{ fontSize: 32, marginBottom: 16 }}>
          Booking Confirmed
        </h1>
        <p style={{ opacity: 0.8 }}>
          Your session is booked. Ishita will reach out on WhatsApp Video at your
          scheduled time.
        </p>
      </section>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <section className="section" style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 38px)" }}>Book a Session</h1>
        </div>

        {/* Step 1 — Package */}
        <div style={{ marginBottom: 40 }}>
          <p className="badge-fairy" style={{ marginBottom: 16 }}>Step 1 · Choose a reading</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {PACKAGES.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPackage(p.id)}
                className="card-fairy"
                style={{
                  padding: 20,
                  textAlign: "left",
                  borderRadius: 4,
                  cursor: "pointer",
                  borderColor: selectedPackage === p.id ? "var(--rose-soft)" : undefined,
                }}
              >
                <p style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 4 }}>{p.name}</p>
                <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>{p.desc}</p>
                <p style={{ color: "var(--gold)", fontSize: 20 }}>₹{p.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Date & slot */}
        {selectedPackage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 40 }}>
            <p className="badge-fairy" style={{ marginBottom: 16 }}>Step 2 · Pick a time</p>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 16,
                background: "var(--deep)",
                border: "1px solid rgba(200,168,240,0.25)",
                color: "var(--moonwhite)",
                colorScheme: "dark",
              }}
            />
            {loadingSlots && <p style={{ opacity: 0.6, fontSize: 14 }}>Loading available times…</p>}
            {!loadingSlots && selectedDate && slots.length === 0 && (
              <p style={{ opacity: 0.6, fontSize: 14 }}>No availability that day — try another date.</p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {slots.map((s) => (
                <button
                  key={s.start}
                  onClick={() => setSelectedSlot(s.start)}
                  className="btn-ghost-fairy"
                  style={{
                    borderColor: selectedSlot === s.start ? "var(--rose-soft)" : undefined,
                    color: selectedSlot === s.start ? "var(--moonwhite)" : undefined,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3 — Details + pay */}
        {selectedSlot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="badge-fairy" style={{ marginBottom: 16 }}>Step 3 · Your details</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="WhatsApp number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
            {/* ── Coupon Code ─────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              {couponStatus !== "valid" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="Have a coupon code?"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus("idle"); setCouponMsg(""); }}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    style={{ ...inputStyle, flex: 1, textTransform: "uppercase", letterSpacing: "0.08em" }}
                  />
                  <button
                    className="btn-ghost-fairy"
                    onClick={applyCoupon}
                    disabled={couponStatus === "checking" || !couponCode.trim()}
                    style={{ flexShrink: 0, fontSize: 13 }}
                  >
                    {couponStatus === "checking" ? "Checking…" : "Apply"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(94,167,94,0.1)", border: "1px solid rgba(94,167,94,0.3)", borderRadius: 6, padding: "10px 14px" }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7fd47f", fontWeight: 600 }}>{couponCode}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--silver)", opacity: 0.8, marginLeft: 10 }}>{couponMsg}</span>
                  </div>
                  <button onClick={removeCoupon} style={{ background: "none", border: "none", color: "var(--rose-soft)", cursor: "pointer", fontSize: 13, opacity: 0.7 }}>Remove</button>
                </div>
              )}
              {couponStatus === "invalid" && couponMsg && (
                <p style={{ color: "var(--rose-soft)", fontSize: 13, marginTop: 6 }}>{couponMsg}</p>
              )}
            </div>

            {/* Price summary */}
            {selectedPackage && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,240,0.12)", borderRadius: 6 }}>
                {discount && finalPrice !== null ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--silver)", textDecoration: "line-through", opacity: 0.55 }}>
                      ₹{PACKAGES.find((p) => p.id === selectedPackage)!.price.toLocaleString("en-IN")}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 20, color: "var(--gold)", fontWeight: 600 }}>
                      ₹{finalPrice.toLocaleString("en-IN")}
                    </span>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7fd47f" }}>
                      {discount.type === "percent" ? `${discount.value}% off` : `₹${discount.value} off`}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--gold)" }}>
                    ₹{PACKAGES.find((p) => p.id === selectedPackage)!.price.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            )}

            <button
              className="btn-fairy"
              onClick={handleBook}
              disabled={!name || !phone || status === "paying"}
              style={{ width: "100%" }}
            >
              {status === "paying" ? "Processing…" : "Proceed to payment"}
            </button>
            {status === "error" && (
              <p style={{ color: "var(--rose-soft)", marginTop: 12, fontSize: 14 }}>
                {errorMsg || "Something went wrong verifying your payment. Please contact us on WhatsApp."}
              </p>
            )}
          </motion.div>
        )}
      </section>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  background: "var(--deep)",
  border: "1px solid rgba(200,168,240,0.25)",
  color: "var(--moonwhite)",
  fontFamily: "var(--font-body)",
};