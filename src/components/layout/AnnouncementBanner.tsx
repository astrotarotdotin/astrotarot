"use client";
import { useEffect, useState } from "react";

export default function AnnouncementBanner() {
  const [text, setText] = useState("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    fetch("/api/content?key=announcement_active")
      .then((r) => r.json())
      .then((data) => {
        const c = data.content ?? {};
        if (c.announcement_active === "true") {
          // Only fetch the text if the banner is actually active
          return fetch("/api/content?key=announcement_text")
            .then((r) => r.json())
            .then((d) => {
              const msg = (d.content ?? {}).announcement_text ?? "";
              if (msg) {
                setText(msg);
                setActive(true);
              }
            });
        }
      })
      .catch(() => {
        // Fail silently — no banner is fine
      });
  }, []);

  if (!active || !text) return null;

  return (
    <div
      role="banner"
      aria-label="Announcement"
      style={{
        position: "relative",
        zIndex: 200, // above navbar (navbar is typically z-index 100)
        width: "100%",
        background: "linear-gradient(90deg, var(--violet) 0%, var(--rose-soft) 100%)",
        color: "var(--moonwhite)",
        textAlign: "center",
        padding: "9px 24px",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        letterSpacing: "0.04em",
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
}