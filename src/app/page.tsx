"use client";
import Link from "next/link";
import { motion } from "framer-motion";

const packages = [
  { name: "Quick Clarity", desc: "1 question", price: "₹199" },
  { name: "Insight Reading", desc: "3 questions", price: "₹599" },
  { name: "Detailed Reading", desc: "Full session", price: "₹1,199" },
  { name: "Emergency Reading", desc: "Same-day", price: "₹1,499" },
];

export default function HomePage() {
  return (
    <div>
      {/* HERO — matches the approved twilight design preview */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "120px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="anim-spin"
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            border: "1px solid rgba(192,168,240,0.06)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <div className="rune-line" style={{ marginBottom: 32 }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "var(--violet-mid)",
              }}
            >
              Sacred Tarot Readings
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(40px, 7vw, 64px)",
              lineHeight: 1.15,
              marginBottom: 8,
              letterSpacing: "0.02em",
            }}
          >
            The Cards
          </h1>
          <h1
            className="text-glow-rose"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(40px, 7vw, 64px)",
              lineHeight: 1.15,
              marginBottom: 36,
              letterSpacing: "0.02em",
            }}
          >
            Already Know
          </h1>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontStyle: "italic",
              fontSize: "clamp(17px, 2.5vw, 20px)",
              color: "var(--silver)",
              maxWidth: 480,
              margin: "0 auto 48px",
              lineHeight: 1.85,
              opacity: 0.8,
            }}
          >
            Every question you carry has an answer waiting in the sacred
            language of the tarot. Let us find it together.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/book">
              <button className="btn-fairy">Book a live reading</button>
            </Link>
            <Link href="/free-reading">
              <button className="btn-ghost-fairy">Try a free reading</button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* PACKAGES */}
      <section className="section" style={{ background: "rgba(14,10,31,0.35)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="rune-line" style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "var(--violet-mid)",
                }}
              >
                Live 1:1 Sessions
              </span>
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>Choose your reading</h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 24,
            }}
          >
            {packages.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="card-fairy"
                style={{ padding: "36px 28px", borderRadius: 4 }}
              >
                <span className="badge-fairy">{p.desc}</span>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    margin: "16px 0 8px",
                    color: "var(--lavender)",
                  }}
                >
                  {p.name}
                </h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 24, color: "var(--gold)" }}>
                  {p.price}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FREE READING TEASER */}
      <section className="section-sm" style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(26px, 3.5vw, 34px)", marginBottom: 16 }}>
          Not ready to book? Try a free reading.
        </h2>
        <p style={{ maxWidth: 480, margin: "0 auto 32px", opacity: 0.75 }}>
          Draw your cards and get an AI-guided interpretation — two free reads,
          no account needed.
        </p>
        <Link href="/free-reading">
          <button className="btn-fairy">Draw your cards</button>
        </Link>
      </section>
    </div>
  );
}
