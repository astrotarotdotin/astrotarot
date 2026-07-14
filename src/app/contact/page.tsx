"use client";
import { motion } from "framer-motion";

export default function ContactPage() {
  return (
    <section className="section" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
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
            Get in touch
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 40px)", marginBottom: 24 }}>Contact</h1>
        <p style={{ opacity: 0.75, marginBottom: 40 }}>
          Have a question before booking? Reach out directly on WhatsApp.
        </p>
        <a
          // Placeholder number — replace with Ishita's actual personal
          // WhatsApp number once confirmed. This is a simple click-to-chat
          // link, not the Business API — matches how she wants to run
          // client conversations and sessions.
          href="https://wa.me/91XXXXXXXXXX"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-fairy"
          style={{ display: "inline-flex" }}
        >
          Chat on WhatsApp
        </a>
      </motion.div>
    </section>
  );
}
