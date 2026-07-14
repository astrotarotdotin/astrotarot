"use client";
import { useState } from "react";
import Link from "next/link";

const links = [
  { href: "/book", label: "Book" },
  { href: "/free-reading", label: "Free reading" },
  { href: "/workshop", label: "Workshop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav
      style={{
        position: "relative",
        zIndex: 30,
        padding: "22px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            letterSpacing: "2px",
            color: "var(--moonwhite)",
            textDecoration: "none",
          }}
        >
          ASTRO TAROT
        </Link>

        {/* Desktop links — hidden below 768px */}
        <div className="nav-links-desktop" style={{ display: "flex", gap: 30 }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--lavender)",
                opacity: 0.8,
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Hamburger button — only visible below 768px */}
        <button
          className="nav-hamburger"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            flexDirection: "column",
            gap: 5,
          }}
        >
          <span style={{ width: 22, height: 1.5, background: "var(--lavender)", display: "block" }} />
          <span style={{ width: 22, height: 1.5, background: "var(--lavender)", display: "block" }} />
          <span style={{ width: 22, height: 1.5, background: "var(--lavender)", display: "block" }} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div
          className="nav-mobile-menu"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            padding: "24px 8px 8px",
            textAlign: "center",
          }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--lavender)",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
