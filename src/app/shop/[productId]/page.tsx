"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;              // sale price (what gets charged)
  image_url: string | null;
  stock_qty: number;
  original_price: number | null;
  discount_percent: number | null;
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.products ?? []).find((p: Product) => p.id === productId);
        setProduct(found ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  function addToCart() {
    if (!product) return;

    // Cart stored in localStorage as [{ productId, name, price, qty, image_url }]
    const raw = localStorage.getItem("astrotarot_cart");
    const cart: { productId: string; name: string; price: number; qty: number; image_url: string | null }[] = raw ? JSON.parse(raw) : [];

    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock_qty);
    } else {
      cart.push({ productId: product.id, name: product.name, price: product.price, qty, image_url: product.image_url });
    }

    localStorage.setItem("astrotarot_cart", JSON.stringify(cart));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, fontFamily: "var(--font-body)", color: "var(--silver)" }}>Loading…</div>;
  if (!product) return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
      <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", fontSize: 18, marginBottom: 20 }}>Product not found.</p>
      <Link href="/shop"><button className="btn-ghost-fairy">Back to shop</button></Link>
    </div>
  );

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 900 }}>
        <Link href="/shop" style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--violet-mid)", textDecoration: "none", opacity: 0.75, display: "inline-block", marginBottom: 32 }}>
          ← Back to Shop
        </Link>

        <div style={{ display: "flex", gap: 48, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Image */}
          {product.image_url && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} style={{ flex: "0 0 auto", width: "min(100%, 380px)" }}>
              <img
                src={product.image_url}
                alt={product.name}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 10, border: "1px solid rgba(200,168,240,0.2)" }}
              />
            </motion.div>
          )}

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px, 3.5vw, 34px)", color: "var(--lavender)", marginBottom: 12 }}>{product.name}</h1>
            <div style={{ marginBottom: 16 }}>
              {product.original_price && product.original_price > product.price && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--silver)", textDecoration: "line-through", opacity: 0.5 }}>
                    ₹{product.original_price.toLocaleString("en-IN")}
                  </span>
                  {product.discount_percent && (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, padding: "3px 10px", borderRadius: 4, background: "rgba(196,96,138,0.15)", color: "var(--rose-soft)", border: "1px solid rgba(196,96,138,0.3)", fontWeight: 600 }}>
                      {product.discount_percent}% OFF
                    </span>
                  )}
                </div>
              )}
              <p style={{ fontFamily: "var(--font-body)", fontSize: 30, color: "var(--gold)", fontWeight: 600 }}>
                ₹{product.price.toLocaleString("en-IN")}
              </p>
              {product.original_price && product.original_price > product.price && product.discount_percent && (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--teal-bright)", opacity: 0.85, marginTop: 4 }}>
                  You save ₹{(product.original_price - product.price).toLocaleString("en-IN")} ({product.discount_percent}% off)
                </p>
              )}
            </div>

            {product.description && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--silver)", lineHeight: 1.85, opacity: 0.85, marginBottom: 28 }}>{product.description}</p>
            )}

            {product.stock_qty > 0 ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--lavender)" }}>Qty</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,240,0.2)", borderRadius: 6, padding: "4px 12px" }}>
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ background: "none", border: "none", color: "var(--lavender)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>−</button>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--moonwhite)", minWidth: 24, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(product.stock_qty, q + 1))} style={{ background: "none", border: "none", color: "var(--lavender)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>+</button>
                  </div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", opacity: 0.6 }}>{product.stock_qty} available</span>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn-fairy" onClick={addToCart}>{added ? "Added ✓" : "Add to Cart"}</button>
                  <button className="btn-ghost-fairy" onClick={() => { addToCart(); router.push("/cart"); }}>Buy Now</button>
                </div>
              </>
            ) : (
              <div style={{ background: "rgba(196,96,138,0.1)", border: "1px solid rgba(196,96,138,0.25)", borderRadius: 6, padding: "12px 16px", display: "inline-block" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--rose-soft)", letterSpacing: "0.06em" }}>Out of Stock</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}