"use client";
import { useState } from "react";
import Script from "next/script";
import { motion } from "framer-motion";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

// Next two batch start dates — update these manually each month until
// the admin dashboard's batch management is built.
const UPCOMING_BATCHES = ["10th of this month", "20th of this month"];

export default function WorkshopPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "paying" | "success" | "error">("idle");

  const handleEnroll = async () => {
    if (!name || !phone) return;
    setStatus("paying");

    const orderRes = await fetch("/api/workshop/create-order", { method: "POST" });
    const order = await orderRes.json();

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount * 100,
      currency: "INR",
      name: "AstroTarot Workshop",
      description: "Tarot Workshop — Beginner to Pro",
      order_id: order.orderId,
      prefill: { name, contact: phone, email },
      theme: { color: "#7B5EA7" },
      handler: async function (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        const verifyRes = await fetch("/api/workshop/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...response,
            client_name: name,
            client_phone: phone,
            client_email: email,
          }),
        });
        const result = await verifyRes.json();
        setStatus(result.success ? "success" : "error");
      },
      modal: { ondismiss: () => setStatus("idle") },
    });
    rzp.open();
  };

  if (status === "success") {
    return (
      <section className="section" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <h1 className="text-glow-rose" style={{ fontSize: 32, marginBottom: 16 }}>
          You're Enrolled!
        </h1>
        <p style={{ opacity: 0.8 }}>
          Ishita will reach out on WhatsApp with your batch details.
        </p>
      </section>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <section className="section" style={{ maxWidth: 640, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="rune-line" style={{ marginBottom: 20 }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "var(--violet-mid)",
              }}
            >
              Tarot Workshop
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", marginBottom: 16 }}>
            Beginner to Pro
          </h1>
          <p style={{ opacity: 0.75, maxWidth: 460, margin: "0 auto 24px" }}>
            A 10-day guided journey into reading tarot, delivered over
            WhatsApp — from your very first card to reading with confidence.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
            {UPCOMING_BATCHES.map((b) => (
              <span key={b} className="badge-fairy">
                Batch starts {b}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 32, color: "var(--gold)", marginTop: 24 }}>₹2,999</p>
        </motion.div>

        <div className="card-fairy" style={{ padding: 32, borderRadius: 6 }}>
          <p className="badge-fairy" style={{ marginBottom: 20 }}>Enroll now</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp number" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            <input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <button
            className="btn-fairy"
            onClick={handleEnroll}
            disabled={!name || !phone || status === "paying"}
            style={{ width: "100%" }}
          >
            {status === "paying" ? "Processing…" : "Enroll — ₹2,999"}
          </button>
          {status === "error" && (
            <p style={{ color: "var(--rose-soft)", marginTop: 12, fontSize: 14 }}>
              Something went wrong verifying your payment. Please contact us on WhatsApp.
            </p>
          )}
        </div>
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
