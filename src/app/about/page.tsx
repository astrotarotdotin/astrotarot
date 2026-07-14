"use client";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <section className="section" style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
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
            About
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 24 }}>Ishita Nag</h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 19, color: "var(--silver)", opacity: 0.85, lineHeight: 1.9 }}>
          {/* Placeholder — replace with Ishita's actual bio once provided */}
          A dedicated tarot reader and spiritual wellness practitioner, guiding
          clients through life&apos;s questions with clarity and care. Every
          reading is approached with honesty, warmth, and respect for the
          seeker&apos;s own journey.
        </p>
      </motion.div>
    </section>
  );
}
