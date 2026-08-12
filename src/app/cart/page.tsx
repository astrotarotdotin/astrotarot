"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CartItem { productId: string; name: string; price: number; qty: number; image_url: string | null; }
interface CustomerForm { name: string; phone: string; email: string; address: string; }

// Match the EXACT same type as book/page.tsx — different declarations cause a TS conflict
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const emptyCustomer = (): CustomerForm => ({ name: "", phone: "", email: "", address: "" });

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer());
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("astrotarot_cart");
      setCart(raw ? JSON.parse(raw) : []);
    } catch { setCart([]); }
  }, []);

  function saveCart(updated: CartItem[]) {
    setCart(updated);
    localStorage.setItem("astrotarot_cart", JSON.stringify(updated));
      // Dispatch storage event so Navbar cart count updates immediately
      window.dispatchEvent(new Event("storage"));
  }

  function updateQty(productId: string, qty: number) {
    if (qty < 1) return removeItem(productId);
    saveCart(cart.map((i) => i.productId === productId ? { ...i, qty } : i));
  }

  function removeItem(productId: string) {
    saveCart(cart.filter((i) => i.productId !== productId));
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,240,0.2)", borderRadius: 6, color: "var(--moonwhite)", fontFamily: "var(--font-body)", fontSize: 14, colorScheme: "dark", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lavender)", marginBottom: 8 };

  async function handleCheckout() {
    setError("");
    if (cart.length === 0) return setError("Your cart is empty.");
    if (!customer.name.trim()) return setError("Please enter your name.");
    if (!/^\d{10}$/.test(customer.phone.trim())) return setError("Please enter a valid 10-digit phone number.");
    if (!customer.address.trim()) return setError("Please enter your shipping address.");

    setPaying(true);
    try {
      // Step 1 — create Razorpay order (server validates prices against DB)
      const orderRes = await fetch("/api/orders/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map(({ productId, qty }) => ({ productId, qty })) }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        // If the server returns a specific product name in the error (out of stock),
        // remove that item from the cart automatically so user doesn't hit it again.
        const errMsg: string = orderData.error || "Could not create order.";
        if (orderRes.status === 400 && errMsg.includes("stock")) {
          // Extract product name from error message pattern "Not enough stock for {name}"
          const match = errMsg.match(/Not enough stock for (.+)/);
          if (match) {
            const soldOutName = match[1].trim();
            const cleaned = cart.filter((i) => i.name !== soldOutName);
            saveCart(cleaned);
            throw new Error(`"${soldOutName}" is sold out and has been removed from your cart. Please review your order.`);
          }
        }
        throw new Error(errMsg);
      }

      const { orderId, amount, keyId } = orderData;

      // Step 2 — load Razorpay SDK if not already loaded
      await new Promise<void>((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Could not load payment gateway."));
        document.body.appendChild(script);
      });

      // Step 3 — open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rp = new window.Razorpay({
          key: keyId,
          amount: amount * 100,
          currency: "INR",
          name: "AstroTarot Shop",
          description: `${cart.length} item${cart.length > 1 ? "s" : ""}`,
          order_id: orderId,
          prefill: { name: customer.name, contact: customer.phone, email: customer.email },
          theme: { color: "#7b5ea7" },
          handler: async (response: Record<string, string>) => {
            try {
              // Step 4 — verify payment server-side and record order
              const verifyRes = await fetch("/api/orders/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  customer_name:    customer.name.trim(),
                  customer_phone:   customer.phone.trim(),
                  customer_email:   customer.email.trim() || null,
                  shipping_address: customer.address.trim(),
                  items: cart.map(({ productId, name, qty, price }) => ({ productId, name, qty, unit_price: price })),
                  total_amount: amount,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed.");

              // Clear cart and go to confirmation page
              localStorage.removeItem("astrotarot_cart");
            window.dispatchEvent(new Event("storage"));
              router.push(`/shop/order-confirmed?id=${verifyData.orderId}`);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
        });
        rp.open();
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPaying(false);
    }
  }

  if (cart.length === 0) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 700, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3.5vw, 36px)", marginBottom: 16 }}>Your Cart</h1>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", opacity: 0.7, marginBottom: 32 }}>Your cart is empty.</p>
          <Link href="/shop"><button className="btn-fairy">Browse the Shop</button></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 840 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3.5vw, 36px)", marginBottom: 32 }}>Your Cart</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
          {/* Cart Items */}
          <div>
            {cart.map((item) => (
              <div key={item.productId} className="card-fairy" style={{ padding: 16, borderRadius: 8, marginBottom: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--lavender)", marginBottom: 4 }}>{item.name}</p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--gold)" }}>₹{item.price.toLocaleString("en-IN")}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,240,0.2)", borderRadius: 6, padding: "4px 10px" }}>
                    <button onClick={() => updateQty(item.productId, item.qty - 1)} style={{ background: "none", border: "none", color: "var(--lavender)", cursor: "pointer", fontSize: 16 }}>−</button>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--moonwhite)", minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.productId, item.qty + 1)} style={{ background: "none", border: "none", color: "var(--lavender)", cursor: "pointer", fontSize: 16 }}>+</button>
                  </div>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--silver)", minWidth: 80, textAlign: "right" }}>₹{(item.price * item.qty).toLocaleString("en-IN")}</span>
                  <button onClick={() => removeItem(item.productId)} style={{ background: "none", border: "none", color: "var(--rose-soft)", cursor: "pointer", fontSize: 18, opacity: 0.6, lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}

            {/* Total */}
            <div style={{ textAlign: "right", padding: "16px 0", borderTop: "1px solid rgba(200,168,240,0.15)", marginTop: 8 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--silver)", opacity: 0.7 }}>Total </span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 24, color: "var(--gold)" }}>₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Customer Details + Checkout */}
          <div className="card-fairy" style={{ padding: 28, borderRadius: 8 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 24 }}>Shipping Details</h2>

            {error && (
              <div style={{ background: "rgba(196,96,138,0.12)", border: "1px solid rgba(196,96,138,0.3)", borderRadius: 6, padding: "10px 14px", marginBottom: 20, color: "var(--rose-soft)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} style={inputStyle} placeholder="Your name" />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} style={inputStyle} placeholder="10-digit number" maxLength={10} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email (optional)</label>
              <input type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} style={inputStyle} placeholder="For order updates" />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Shipping Address</label>
              <textarea value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} style={{ ...inputStyle, resize: "vertical", minHeight: 90 }} rows={3} placeholder="Full address including city, state, and PIN code" />
            </div>

            <button className="btn-fairy" onClick={handleCheckout} disabled={paying} style={{ width: "100%", justifyContent: "center" }}>
              {paying ? "Processing…" : `Pay ₹${total.toLocaleString("en-IN")}`}
            </button>

            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--silver)", opacity: 0.5, textAlign: "center", marginTop: 14 }}>
              Secured by Razorpay · Shipping via Blue Dart
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}