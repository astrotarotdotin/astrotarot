"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import BannerCarousel from "@/components/BannerCarousel";

interface Banner {
  id: string; title: string;
  image_url: string; image_url_mobile: string;
  cta_text: string | null; cta_link: string | null;
}

interface Product {
  id: string; name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock_qty: number;
  discount_label: string | null;
  original_price: number | null;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/banners?section=shop").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([bd, pd]) => { setBanners(bd.banners ?? []); setProducts(pd.products ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      {/* Shop image banner — add via Admin → Banners → Shop Banners tab */}
      {banners.length > 0 && <div style={{ marginBottom: 48 }}><BannerCarousel banners={banners} /></div>}
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="rune-line" style={{ marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--violet-mid)" }}>
              Sacred Tools & Offerings
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 44px)", marginBottom: 12 }}>The Shop</h1>
          <p style={{ fontFamily: "var(--font-body)", fontStyle: "italic", color: "var(--silver)", opacity: 0.75, maxWidth: 480, margin: "0 auto" }}>
            Curated tools to support your journey — tarot decks, crystals, and more.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", fontFamily: "var(--font-body)", color: "var(--silver)", opacity: 0.6 }}>Loading…</p>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.55 }}>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", fontSize: 18 }}>New offerings coming soon.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 28 }}>
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
              >
                <Link href={`/shop/${p.id}`} style={{ textDecoration: "none" }}>
                  <div className="card-fairy" style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer" }}>
                    {p.image_url && (
                      <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden" }}>
                        <img src={p.image_url} alt={p.name}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        />
                        {p.discount_label && (
                          <div style={{ position: "absolute", top: 12, left: 0, background: "linear-gradient(135deg,#c41e5b,#e8335f)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", padding: "6px 14px 6px 10px", borderRadius: "0 4px 4px 0", boxShadow: "2px 2px 10px rgba(196,30,91,0.4)", clipPath: "polygon(0 0,100% 0,100% 100%,0 100%,8px 50%)", zIndex: 2 }}>
                            {p.discount_label}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ padding: "20px 20px 24px" }}>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--lavender)", marginBottom: 8 }}>{p.name}</h3>
                      {p.description && <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--silver)", opacity: 0.7, marginBottom: 12, lineHeight: 1.6 }}>{p.description.slice(0, 80)}{p.description.length > 80 ? "…" : ""}</p>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          {p.original_price && p.original_price > p.price && (
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--silver)", opacity: 0.5, textDecoration: "line-through", margin: "0 0 2px" }}>
                              ₹{p.original_price.toLocaleString("en-IN")}
                            </p>
                          )}
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 20, color: "var(--gold)" }}>₹{p.price.toLocaleString("en-IN")}</span>
                        </div>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: p.stock_qty > 0 ? "var(--teal-bright)" : "var(--rose-soft)", letterSpacing: "0.08em", marginTop: 6 }}>
                          {p.stock_qty > 0 ? "In stock" : "Out of stock"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}