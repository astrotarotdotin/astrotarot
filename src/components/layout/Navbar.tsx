"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const ALWAYS_LINKS = [
  { href: "/book",         label: "Book"         },
  { href: "/free-reading", label: "Free reading" },
  { href: "/about",        label: "About"        },
  { href: "/contact",      label: "Contact"      },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shopEnabled, setShopEnabled] = useState(false);
  const [workshopEnabled, setWorkshopEnabled] = useState(true); // default true until DB says otherwise
  const [cartCount, setCartCount] = useState(0);

  // Check if shop is enabled (from site_content) and cart count
  useEffect(() => {
    // Fetch both shop and workshop visibility settings
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => {
        setShopEnabled(d.content?.shop_enabled === "true");
        // workshop_enabled defaults to true if key not yet in DB
        const wv = d.content?.workshop_enabled;
        setWorkshopEnabled(wv === undefined || wv === "true");
      })
      .catch(() => {});

    function syncCart() {
      try {
        const raw = localStorage.getItem("astrotarot_cart");
        const cart = raw ? JSON.parse(raw) : [];
        const count = cart.reduce((sum: number, i: { qty: number }) => sum + i.qty, 0);
        setCartCount(count);
      } catch { setCartCount(0); }
    }

    syncCart();
    // Re-sync when localStorage changes (e.g. user adds item in another tab)
    window.addEventListener("storage", syncCart);
    return () => window.removeEventListener("storage", syncCart);
  }, [pathname]); // re-run on route change so cart count stays fresh

  // Build nav links dynamically based on admin visibility toggles
  const links = [
    ...ALWAYS_LINKS.slice(0, 2),                                               // Book, Free reading
    ...(workshopEnabled ? [{ href: "/workshop", label: "Workshop" }] : []),    // Workshop (togglable)
    ...ALWAYS_LINKS.slice(2),                                                  // About, Contact
    ...(shopEnabled    ? [{ href: "/shop",     label: "Shop"     }] : []),    // Shop (togglable)
  ];

  const linkStyle = (href: string): React.CSSProperties => ({
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: pathname === href ? "var(--rose-soft)" : "var(--lavender)",
    opacity: pathname === href ? 1 : 0.8,
    textDecoration: "none",
  });

  return (
    <nav style={{ position: "relative", zIndex: 30, padding: "22px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1200, margin: "0 auto" }}>
        <Link href="/" onClick={() => setOpen(false)} style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "2px", color: "var(--moonwhite)", textDecoration: "none" }}>
          ASTRO TAROT
        </Link>

        {/* Desktop links */}
        <div className="nav-links-desktop" style={{ display: "flex", gap: 30, alignItems: "center" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} style={linkStyle(l.href)}>{l.label}</Link>
          ))}

          {/* Cart icon — only shown when shop is enabled */}
          {shopEnabled && (
            <Link href="/cart" style={{ position: "relative", color: "var(--lavender)", textDecoration: "none", opacity: 0.8 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>Cart</span>
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: -8, right: -12, background: "var(--rose)", color: "var(--moonwhite)", borderRadius: "50%", width: 16, height: 16, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ui)", fontWeight: 600 }}>
                  {cartCount}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Hamburger */}
        <button className="nav-hamburger" onClick={() => setOpen(!open)} aria-label="Toggle menu" style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 8, flexDirection: "column", gap: 5 }}>
          <span style={{ width: 22, height: 1.5, background: "var(--lavender)", display: "block" }} />
          <span style={{ width: 22, height: 1.5, background: "var(--lavender)", display: "block" }} />
          <span style={{ width: 22, height: 1.5, background: "var(--lavender)", display: "block" }} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="nav-mobile-menu" style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 8px 8px", textAlign: "center" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--lavender)", textDecoration: "none" }}>
              {l.label}
            </Link>
          ))}
          {shopEnabled && (
            <Link href="/cart" onClick={() => setOpen(false)} style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--lavender)", textDecoration: "none" }}>
              Cart {cartCount > 0 ? `(${cartCount})` : ""}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}