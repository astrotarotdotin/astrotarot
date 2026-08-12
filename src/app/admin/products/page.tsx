"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock_qty: number;
  is_active: boolean;
  original_price: number | null;   // MRP / pre-discount price
  discount_percent: number | null; // e.g. 50 for 50% off (price is auto-computed)
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = "astrotarot_products";

async function uploadToCloudinary(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", "products");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Image upload failed");
  return (await res.json()).secure_url as string;
}

function validateProductImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const allowed = ["image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) return resolve("Only JPG, JPEG, and WebP images are allowed.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth !== 800 || img.naturalHeight !== 800) {
        resolve(`Image must be exactly 800×800px. Your file is ${img.naturalWidth}×${img.naturalHeight}px.`);
      } else resolve(null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve("Could not read image file."); };
    img.src = url;
  });
}

const emptyForm = () => ({ name: "", description: "", price: "", stock_qty: "0", original_price: "", discount_percent: "", imageFile: null as File | null, imagePreview: "" });

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,240,0.2)", borderRadius: 6, color: "var(--moonwhite)", fontFamily: "var(--font-body)", fontSize: 14, colorScheme: "dark", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--lavender)", marginBottom: 8 };

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/products", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setProducts(json.products ?? []);
    } catch { setError("Failed to load products."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchProducts(); }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, imageFile: file, imagePreview: URL.createObjectURL(file) }));
    setFieldError("");
  }

  async function handleSubmit() {
    setFieldError(""); setError(""); setSuccess("");
    if (!form.name.trim()) return setFieldError("Product name is required.");
    if (!form.price || Number(form.price) <= 0) return setFieldError("Valid price is required.");
    if (!editingId && !form.imageFile) return setFieldError("Product image (800×800px) is required.");

    if (form.imageFile) {
      const imgErr = await validateProductImage(form.imageFile);
      if (imgErr) return setFieldError(imgErr);
    }

    setSaving(true);
    try {
      let image_url: string | undefined;
      if (form.imageFile) image_url = await uploadToCloudinary(form.imageFile);

      const token = await getToken();
      // Auto-compute sale price from original_price + discount_percent
      const origPrice = form.original_price ? Number(form.original_price) : null;
      const discPct   = form.discount_percent ? Math.min(99, Math.max(1, Number(form.discount_percent))) : null;
      let salePrice: number;
      if (origPrice && discPct !== null) {
        salePrice = Math.max(1, Math.round(origPrice * (1 - discPct / 100)));
      } else if (origPrice) {
        salePrice = origPrice;
      } else {
        salePrice = Number(form.price) || 0;
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: salePrice,
        stock_qty: Number(form.stock_qty) || 0,
        original_price: origPrice,
        discount_percent: discPct,
      };
      if (image_url) payload.image_url = image_url;

      if (editingId) {
        payload.id = editingId;
        await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
        setSuccess("Product updated.");
      } else {
        payload.image_url = image_url;
        const res = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setSuccess("Product added.");
      }

      setForm(emptyForm()); setShowForm(false); setEditingId(null);
      fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setSaving(false); }
  }

  async function toggleActive(p: Product) {
    const token = await getToken();
    await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: p.id, is_active: !p.is_active }) });
    fetchProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const token = await getToken();
    await fetch(`/api/admin/products?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchProducts();
  }

  function startEdit(p: Product) {
    setForm({ name: p.name, description: p.description ?? "", price: String(p.price), stock_qty: String(p.stock_qty), original_price: p.original_price ? String(p.original_price) : "", discount_percent: p.discount_percent ? String(p.discount_percent) : "", imageFile: null, imagePreview: p.image_url ?? "" });
    setEditingId(p.id); setShowForm(true); setFieldError(""); setError("");
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 6 }}>Products</h1>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", fontSize: 14, opacity: 0.75 }}>Manage shop products. Images must be 800×800px. Shop visibility is controlled in Content settings.</p>
        </div>
        {!showForm && <button className="btn-fairy" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); setFieldError(""); setError(""); }}>+ Add Product</button>}
      </div>

      {error && <div style={{ background: "rgba(196,96,138,0.15)", border: "1px solid rgba(196,96,138,0.35)", borderRadius: 6, padding: "12px 16px", marginBottom: 20, color: "var(--rose-soft)", fontFamily: "var(--font-ui)", fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: "rgba(94,167,94,0.12)", border: "1px solid rgba(94,167,94,0.3)", borderRadius: 6, padding: "12px 16px", marginBottom: 20, color: "#7fd47f", fontFamily: "var(--font-ui)", fontSize: 13 }}>{success}</div>}

      {/* FORM */}
      {showForm && (
        <div className="card-fairy" style={{ padding: 28, borderRadius: 8, marginBottom: 32 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 24 }}>{editingId ? "Edit Product" : "New Product"}</h2>
          {fieldError && <div style={{ background: "rgba(196,96,138,0.12)", border: "1px solid rgba(196,96,138,0.3)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, color: "var(--rose-soft)", fontFamily: "var(--font-ui)", fontSize: 13 }}>{fieldError}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Product Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="e.g. Crystal Tarot Deck" />
            </div>
            <div>
              <label style={labelStyle}>Price (₹)</label>
              <input type="number" min="1" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} style={inputStyle} placeholder="e.g. 999" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} rows={3} placeholder="Brief description of the product…" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Stock Quantity</label>
            <input type="number" min="0" value={form.stock_qty} onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))} style={{ ...inputStyle, maxWidth: 160 }} />
          </div>

          {/* ── Discount section — auto-computes sale price ────── */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,240,0.15)", borderRadius: 6, padding: "16px 20px", marginBottom: 16 }}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--lavender)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Discount (optional)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Original / MRP Price ₹</label>
                <input type="number" min="1" value={form.original_price} onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))} placeholder="e.g. 400" style={inputStyle} />
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", marginTop: 5, opacity: 0.65 }}>MRP before discount. Shown crossed-out on the card.</p>
              </div>
              <div>
                <label style={labelStyle}>Discount %</label>
                <input type="number" min="1" max="99" value={form.discount_percent} onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))} placeholder="e.g. 50" style={inputStyle} />
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", marginTop: 5, opacity: 0.65 }}>1–99 only. 100% off not allowed.</p>
              </div>
            </div>
            {/* Live preview */}
            {form.original_price && form.discount_percent && Number(form.original_price) > 0 && Number(form.discount_percent) > 0 && (
              <div style={{ background: "rgba(123,94,167,0.12)", border: "1px solid rgba(123,94,167,0.3)", borderRadius: 6, padding: "10px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--silver)", textDecoration: "line-through", opacity: 0.6 }}>₹{Number(form.original_price).toLocaleString("en-IN")}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--violet-mid)" }}>→</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 20, color: "var(--gold)", fontWeight: 600 }}>₹{Math.max(1, Math.round(Number(form.original_price) * (1 - Number(form.discount_percent) / 100))).toLocaleString("en-IN")}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--teal-bright)" }}>← Sale price that gets charged</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Product Image — {editingId ? "leave blank to keep existing" : "required"}</label>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--silver)", opacity: 0.65, marginBottom: 10 }}>Exact size: <strong style={{ color: "var(--gold)" }}>800×800 px</strong> &nbsp;|&nbsp; Formats: JPG, JPEG, WebP only</p>
            <div onClick={() => imgRef.current?.click()} style={{ border: "1.5px dashed rgba(200,168,240,0.3)", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.02)" }}>
              {form.imagePreview
                ? <img src={form.imagePreview} alt="Preview" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 6 }} />
                : <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--silver)", opacity: 0.5, margin: 0 }}>Click to upload image</p>}
            </div>
            <input ref={imgRef} type="file" accept="image/jpeg,image/jpg,image/webp" style={{ display: "none" }} onChange={handleFileChange} />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn-fairy" onClick={handleSubmit} disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Add Product"}</button>
            <button className="btn-ghost-fairy" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()); setFieldError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* PRODUCT LIST */}
      {loading ? (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", opacity: 0.6 }}>Loading…</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.5 }}>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)" }}>No products yet. Add your first product above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map((p) => (
            <div key={p.id} className="card-fairy" style={{ padding: 16, borderRadius: 8, opacity: p.is_active ? 1 : 0.55 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--lavender)" }}>{p.name}</span>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, padding: "3px 9px", borderRadius: 3, background: p.is_active ? "rgba(94,167,94,0.15)" : "rgba(150,150,150,0.12)", color: p.is_active ? "#7fd47f" : "var(--silver)", border: `1px solid ${p.is_active ? "rgba(94,167,94,0.3)" : "rgba(150,150,150,0.2)"}` }}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "2px 0" }}>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--gold)" }}>₹{p.price.toLocaleString("en-IN")}</p>
                    {p.original_price && p.original_price > p.price && <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--silver)", opacity: 0.45, textDecoration: "line-through" }}>₹{p.original_price.toLocaleString("en-IN")}</p>}
                    {p.discount_percent && <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, padding: "3px 9px", borderRadius: 3, background: "rgba(196,96,138,0.15)", color: "var(--rose-soft)", border: "1px solid rgba(196,96,138,0.35)" }}>{p.discount_percent}% OFF</span>}
                  </div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--silver)", opacity: 0.7 }}>Stock: {p.stock_qty} units</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
                  <button className="btn-ghost-fairy" onClick={() => startEdit(p)} style={{ fontSize: 13 }}>Edit</button>
                  <button className="btn-ghost-fairy" onClick={() => toggleActive(p)} style={{ fontSize: 13 }}>{p.is_active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => deleteProduct(p.id)} style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.08em", padding: "8px 14px", background: "rgba(196,96,138,0.1)", border: "1px solid rgba(196,96,138,0.3)", borderRadius: 4, color: "var(--rose-soft)", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
                </div>
              </div>
              {p.description && <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--silver)", opacity: 0.65, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(200,168,240,0.1)" }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}