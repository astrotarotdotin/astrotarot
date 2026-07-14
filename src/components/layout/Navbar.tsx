"use client";
import Link from "next/link";

const links = [
  { href: "/book", label: "Book" },
  { href: "/free-reading", label: "Free reading" },
  { href: "/workshop", label: "Workshop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  return (
    <nav
      style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "26px 44px",
      }}
    >
      <Link
        href="/"
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
      <div style={{ display: "flex", gap: 30 }}>
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
    </nav>
  );
}
