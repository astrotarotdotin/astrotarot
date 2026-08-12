export default function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 10,
        borderTop: "1px solid rgba(200,168,240,0.15)",
        padding: "48px 44px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          letterSpacing: "2px",
          color: "var(--moonwhite)",
          marginBottom: 16,
        }}
      >
        ASTRO TAROT
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20 }}>
        <a
          href="https://www.instagram.com/astrotarothealer/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--silver)", fontSize: 13, textDecoration: "none" }}
        >
          Instagram
        </a>
        <a
          href="mailto:healandpeace7@gmail.com"
          style={{ color: "var(--silver)", fontSize: 13, textDecoration: "none" }}
        >
          Email
        </a>
      </div>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", opacity: 0.6 }}>
        © {new Date().getFullYear()} AstroTarot. All rights reserved.
      </p>
    </footer>
  );
}