"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
// Using native img instead of next/image so onError hiding works correctly

// Placeholder bio used until Ishita fills in her own via /admin/content → About You
const PLACEHOLDER_BIO =
  "Ishita Nag is a certified tarot reader and spiritual wellness practitioner with years of experience guiding seekers through life's most meaningful crossroads. Her readings blend intuition, symbolism, and compassionate insight to help you navigate love, purpose, career, and healing. Every session is a sacred space — held with honesty, warmth, and deep respect for your unique journey. Whether you're seeking clarity on a single question or a fuller picture of where you stand, Ishita meets you exactly where you are.";

export default function AboutPage() {
  const [bio, setBio] = useState(PLACEHOLDER_BIO);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        const c = data.content ?? {};
        if (c.about_bio) setBio(c.about_bio);
        if (c.about_photo_url) setPhotoUrl(c.about_photo_url);
      })
      .catch(() => {
        // Fail silently — placeholder values show instead
      })
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section className="section" style={{ maxWidth: 720, margin: "0 auto" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* ── Eyebrow label ─────────────────────────────── */}
        <div className="rune-line" style={{ marginBottom: 20, textAlign: "center" }}>
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

        {/* ── Name heading ──────────────────────────────── */}
        <h1
          style={{
            fontSize: "clamp(30px, 4vw, 44px)",
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          Ishita Nag
        </h1>

        {/* ── Photo + Bio layout ────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 36,
          }}
        >
          {/* Photo — only rendered if a URL is available */}
          {photoUrl && loaded && (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid rgba(192, 168, 240, 0.3)",
                boxShadow: "0 0 28px rgba(192, 168, 240, 0.18)",
                flexShrink: 0,
              }}
            >
              <img
                src={photoUrl}
                alt="Ishita Nag"
                onError={(e) => { e.currentTarget.parentElement!.style.display = "none"; }}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </div>
          )}

          {/* Bio text */}
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 19,
              color: "var(--silver)",
              opacity: 0.85,
              lineHeight: 1.9,
              textAlign: "center",
              maxWidth: 620,
            }}
          >
            {bio}
          </p>
        </div>
      </motion.div>
    </section>
  );
}