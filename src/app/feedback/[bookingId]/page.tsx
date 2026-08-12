"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

export default function FeedbackPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    if (rating === 0) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <section className="section" style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
        <h1 className="text-glow-rose" style={{ fontSize: 26, marginBottom: 12 }}>Thank You</h1>
        <p style={{ opacity: 0.75 }}>Your feedback means a lot — thank you for sharing.</p>
      </section>
    );
  }

  return (
    <section className="section" style={{ maxWidth: 420, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="rune-line" style={{ marginBottom: 16 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--violet-mid)" }}>
            Your Experience
          </span>
        </div>
        <h1 style={{ fontSize: 24 }}>How was your reading?</h1>
      </div>

      <div className="card-fairy" style={{ padding: 28, borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRating(n)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 30,
                color: n <= rating ? "var(--gold)" : "rgba(200,168,240,0.25)",
              }}
              aria-label={`${n} star`}
            >
              ★
            </motion.button>
          ))}
        </div>
        <textarea
          placeholder="Anything you'd like to share (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            background: "var(--deep)",
            border: "1px solid rgba(200,168,240,0.25)",
            color: "var(--moonwhite)",
            fontFamily: "var(--font-body)",
            marginBottom: 20,
            resize: "vertical",
          }}
        />
        <button className="btn-fairy" onClick={submit} disabled={rating === 0 || status === "submitting"} style={{ width: "100%" }}>
          {status === "submitting" ? "Sending…" : "Submit Feedback"}
        </button>
        {status === "error" && (
          <p style={{ color: "var(--rose-soft)", fontSize: 13, marginTop: 12, textAlign: "center" }}>{errorMsg}</p>
        )}
      </div>
    </section>
  );
}