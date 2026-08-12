"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TAROT_DECK, TarotCard } from "@/lib/tarotDeck";
import TarotCardFace from "@/components/TarotCardFace";

type Stage = "selecting" | "drawing" | "revealed" | "limitReached" | "error";

const REQUIRED_COUNT = 3;

export default function FreeReadingPage() {
  const [stage, setStage] = useState<Stage>("selecting");
  const [selected, setSelected] = useState<TarotCard[]>([]);
  const [reading, setReading] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const toggleCard = (card: TarotCard) => {
    setSelected((prev) => {
      const already = prev.find((c) => c.id === card.id);
      if (already) return prev.filter((c) => c.id !== card.id);
      if (prev.length >= REQUIRED_COUNT) return prev; // ignore extra clicks
      return [...prev, card];
    });
  };

  const handleReveal = async () => {
    if (selected.length !== REQUIRED_COUNT) return;
    setStage("drawing");

    try {
      const res = await fetch("/api/free-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: selected.map((c) => c.name) }),
      });
      const data = await res.json();

      if (data.limitReached) {
        setStage("limitReached");
        return;
      }
      if (data.error) {
        setErrorMsg(data.error);
        setStage("error");
        return;
      }

      setReading(data.reading);
      setTimeout(() => setStage("revealed"), 1000);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStage("error");
    }
  };

  const reset = () => {
    setSelected([]);
    setStage("selecting");
  };

  // ---- Revealed / limit / error screens (unchanged shape, still centered) ----
  if (stage === "revealed") {
    return (
      <section className="section" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 40, flexWrap: "wrap" }}>
          {selected.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="card-fairy"
              style={{ borderRadius: 6 }}
            >
              <TarotCardFace card={card} size="large" />
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-fairy" style={{ padding: "32px 28px", borderRadius: 8, textAlign: "left", marginBottom: 32 }}>
            <p style={{ fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: 17, lineHeight: 1.9, opacity: 0.9 }}>
              {reading}
            </p>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-ghost-fairy" onClick={reset}>Draw again</button>
            <Link href="/book"><button className="btn-fairy">Book a full reading</button></Link>
          </div>
        </motion.div>
      </section>
    );
  }

  if (stage === "limitReached") {
    return (
      <section className="section" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 26, marginBottom: 16 }}>You've used your free readings</h2>
        <p style={{ opacity: 0.75, marginBottom: 32 }}>
          For a deeper, personal reading, book a live session — the cards
          have more to say than a quick draw can hold.
        </p>
        <Link href="/book"><button className="btn-fairy">Book a live reading</button></Link>
      </section>
    );
  }

  if (stage === "error") {
    return (
      <section className="section" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "var(--rose-soft)", marginBottom: 24 }}>{errorMsg}</p>
        <button className="btn-ghost-fairy" onClick={reset}>Try again</button>
      </section>
    );
  }

  // ---- Main selection screen: full 78-card grid ----
  return (
    <section className="section" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="rune-line" style={{ marginBottom: 20 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--violet-mid)" }}>
            Free Reading
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(26px, 4vw, 36px)", marginBottom: 12 }}>Choose Three Cards</h1>
        <p style={{ opacity: 0.7, maxWidth: 480, margin: "0 auto" }}>
          Focus on your question, then choose the three cards that call to
          you. Tap a chosen card again to change your mind.
        </p>
      </div>

      {/* Selection tray — sticky-feeling summary of what's chosen so far */}
      <div
        className="card-fairy"
        style={{
          position: "sticky",
          top: 12,
          zIndex: 20,
          padding: "16px 20px",
          borderRadius: 8,
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {selected.length === 0 && (
            <span style={{ opacity: 0.6, fontSize: 14 }}>No cards chosen yet — {REQUIRED_COUNT} needed</span>
          )}
          <AnimatePresence>
            {selected.map((card) => (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => toggleCard(card)}
                className="badge-fairy"
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                {card.name} <span style={{ opacity: 0.6 }}>✕</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <button
          className="btn-fairy"
          onClick={handleReveal}
          disabled={selected.length !== REQUIRED_COUNT || stage === "drawing"}
          style={{
            opacity: selected.length === REQUIRED_COUNT ? 1 : 0.4,
            cursor: selected.length === REQUIRED_COUNT ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          {stage === "drawing" ? "Consulting the cards…" : "Reveal My Reading"}
        </button>
      </div>

      {/* Full 78-card grid — fixed column count so it's always a perfect
          rectangle (78 = 13x6 or 6x13), never a ragged last row */}
      <div className="tarot-grid">
        {TAROT_DECK.map((card) => {
          const isSelected = selected.some((c) => c.id === card.id);
          return (
            <motion.button
              key={card.id}
              onClick={() => toggleCard(card)}
              whileHover={{ y: -4 }}
              disabled={stage === "drawing"}
              className="card-fairy tarot-grid-cell"
              style={{
                borderRadius: 4,
                cursor: stage === "drawing" ? "default" : "pointer",
                borderColor: isSelected ? "var(--rose-soft)" : undefined,
                boxShadow: isSelected ? "0 0 16px rgba(196,96,138,0.35)" : undefined,
                transform: isSelected ? "translateY(-4px)" : undefined,
              }}
              aria-pressed={isSelected}
              aria-label={card.name}
            >
              {isSelected ? (
                <TarotCardFace card={card} size="small" />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div
                    style={{
                      width: "34%",
                      aspectRatio: "1",
                      borderRadius: "50%",
                      border: "1px solid rgba(200,168,240,0.4)",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "absolute", inset: "20%", borderRadius: "50%", border: "1px solid rgba(200,168,240,0.3)" }} />
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
