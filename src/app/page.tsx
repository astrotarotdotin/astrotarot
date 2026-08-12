"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import BannerCarousel from "@/components/BannerCarousel";

const packages = [
  { name: "Quick Clarity",    desc: "1 question",   price: "₹199"   },
  { name: "Detailed Reading", desc: "Full session",  price: "₹999"   },
  { name: "Emergency Reading",desc: "Same-day",      price: "₹1,499" },
];

interface Banner {
  id: string;
  title: string;
  image_url: string;
  image_url_mobile: string;
  cta_text: string | null;
  cta_link: string | null;
}

interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

// Fallback values shown until DB content loads
const DEFAULTS = {
  hero_tagline:  "Sacred Tarot Readings",
  hero_headline: "The Cards Already Know",
  hero_subtext:  "Every question you carry has an answer waiting in the sacred language of the tarot. Let us find it together.",
  about_bio:     "A dedicated tarot reader and spiritual wellness practitioner, guiding clients through life's questions with clarity and care. Every reading is approached with honesty, warmth, and respect for the seeker's own journey.",
  about_photo_url: "",
};

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [content, setContent] = useState(DEFAULTS);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    // ── Banner fetch: fires immediately, independent of content ──
    fetch("/api/banners")
      .then((r) => r.json())
      .then((data) => { setBanners(data.banners ?? []); })
      .catch(() => { /* fetch failed — fallback text hero will show */ })
      .finally(() => { setBannersLoaded(true); }); // Always flip — never leave blank

    // ── Content fetch: independent, does not block the hero ──
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        const c = data.content ?? {};
        setContent({
          hero_tagline:    c.hero_tagline    || DEFAULTS.hero_tagline,
          hero_headline:   c.hero_headline   || DEFAULTS.hero_headline,
          hero_subtext:    c.hero_subtext    || DEFAULTS.hero_subtext,
          about_bio:       c.about_bio       || DEFAULTS.about_bio,
          about_photo_url: c.about_photo_url || DEFAULTS.about_photo_url,
        });
        try {
          const parsed = JSON.parse(c.testimonials || "[]");
          if (Array.isArray(parsed)) setTestimonials(parsed);
        } catch { /* no testimonials yet */ }
      })
      .catch(() => { /* DEFAULTS already set — page renders fine */ });
  }, []);

  return (
    <div>

      {/* ── HERO ────────────────────────────────────────────────
          If Ishita has uploaded at least 1 active banner → show carousel.
          Otherwise → show the original animated text hero as fallback.
          bannersLoaded prevents a flash of the fallback before fetch completes.
      ──────────────────────────────────────────────────────── */}

      {bannersLoaded && banners.length > 0 ? (
        // ── IMAGE CAROUSEL ──────────────────────────────────
        <BannerCarousel banners={banners} />
      ) : (
        // ── FALLBACK TEXT HERO ───────────────────────────────
        // Shown immediately while banners load AND if no banners exist.
        // User always sees content — never a blank space.
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
          {/* Glowing moon ring — slow 25s spin, violet-gold gradient glow */}
          <div
            className="anim-spin-slow"
            style={{
              position: "absolute",
              width: 580,
              height: 580,
              borderRadius: "50%",
              // Multi-stop gradient border using box-shadow + a clip trick
              // The ring itself is a transparent div with a glowing box-shadow
              background: "transparent",
              boxShadow: `
                0 0 0 1.5px rgba(192, 168, 240, 0.25),
                0 0 18px 4px rgba(192, 168, 240, 0.12),
                0 0 40px 8px rgba(196, 96, 138, 0.07),
                inset 0 0 30px 0px rgba(192, 168, 240, 0.04)
              `,
              pointerEvents: "none",
            }}
          />
          {/* Second inner ring — counter-spin, subtler */}
          <div
            className="anim-spin-slow-reverse"
            style={{
              position: "absolute",
              width: 420,
              height: 420,
              borderRadius: "50%",
              background: "transparent",
              boxShadow: `
                0 0 0 1px rgba(232, 160, 187, 0.12),
                0 0 12px 2px rgba(232, 160, 187, 0.06)
              `,
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
                  fontSize: 12,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "var(--violet-mid)",
                }}
              >
                {content.hero_tagline}
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
              {content.hero_headline.split(" ").slice(0, -1).join(" ") || "The Cards"}
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
              {content.hero_headline.split(" ").slice(-1)[0] || "Already Know"}
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
              {content.hero_subtext}
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
      )}

      {/* ── PACKAGES ──────────────────────────────────────────── */}
      <section className="section" style={{ background: "rgba(14,10,31,0.35)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="rune-line" style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  letterSpacing: "0.25em",
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
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            {packages.map((p, i) => (
              <Link key={p.name} href="/book" style={{ textDecoration: "none" }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="card-fairy"
                  style={{ padding: "36px 28px", borderRadius: 4, cursor: "pointer" }}
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ISHITA ──────────────────────────────────────── */}
      <section className="section" style={{ background: "rgba(14,10,31,0.35)" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              gap: 48,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {/* Photo */}
            {content.about_photo_url ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                style={{ flexShrink: 0 }}
              >
                <img
                  src={content.about_photo_url}
                  alt="Ishita Nag"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  style={{
                    width: 220,
                    height: 220,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid rgba(200,168,240,0.3)",
                    boxShadow: "0 0 40px rgba(123,94,167,0.2)",
                  }}
                />
              </motion.div>
            ) : null}

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{ maxWidth: 520 }}
            >
              <div className="rune-line" style={{ marginBottom: 16, justifyContent: "flex-start" }}>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "var(--violet-mid)",
                  }}
                >
                  About Ishita
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  marginBottom: 20,
                  color: "var(--lavender)",
                }}
              >
                Ishita Nag
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 20,
                  lineHeight: 1.9,
                  color: "var(--silver)",
                  opacity: 0.88,
                  marginBottom: 24,
                }}
              >
                {content.about_bio}
              </p>
              <Link href="/about">
                <button className="btn-ghost-fairy">Read more about me</button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="section">
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div className="rune-line" style={{ marginBottom: 16 }}>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "var(--violet-mid)",
                  }}
                >
                  What clients say
                </span>
              </div>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)" }}>Kind Words</h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 24,
              }}
            >
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="card-fairy"
                  style={{ padding: "28px 24px", textAlign: "center" }}
                >
                  {/* Decorative opening quote mark */}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 48,
                      lineHeight: 1,
                      color: "var(--violet-mid)",
                      opacity: 0.4,
                      marginBottom: 8,
                    }}
                  >
                    "
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontStyle: "italic",
                      fontSize: 17,
                      lineHeight: 1.8,
                      color: "var(--silver)",
                      opacity: 0.9,
                      marginBottom: 16,
                    }}
                  >
                    {t.quote}
                  </p>
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        color: "var(--lavender)",
                        textTransform: "uppercase",
                      }}
                    >
                      {t.name}
                    </p>
                    {t.role && (
                      <p
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          color: "var(--violet-mid)",
                          marginTop: 2,
                          opacity: 0.7,
                        }}
                      >
                        {t.role}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FREE READING TEASER ───────────────────────────────── */}
      <section className="section-sm" style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(26px, 3.5vw, 34px)", marginBottom: 16 }}>
          Not ready to book? Try a free reading.
        </h2>
        <p style={{ maxWidth: 480, margin: "0 auto 32px", opacity: 0.80, fontSize: 18, fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
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