"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function OrderConfirmedPage() {
  return (
    <section className="section" style={{ textAlign: "center" }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ fontSize: 52, marginBottom: 24 }}>✨</div>
          <div className="rune-line" style={{ marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--violet-mid)" }}>Order Confirmed</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 4vw, 38px)", marginBottom: 16, color: "var(--lavender)" }}>Thank You!</h1>
          <p style={{ fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: 18, color: "var(--silver)", opacity: 0.85, lineHeight: 1.8, marginBottom: 12 }}>
            Your order has been placed and payment confirmed. Ishita will pack and ship your order soon.
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--silver)", opacity: 0.65, marginBottom: 40 }}>
            You will receive a tracking number once your order ships.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/shop"><button className="btn-fairy">Continue Shopping</button></Link>
            <Link href="/"><button className="btn-ghost-fairy">Go Home</button></Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}