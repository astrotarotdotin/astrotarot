"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────
interface Banner {
  id: string;
  title: string;
  image_url: string;
  image_url_mobile: string;
  cta_text: string | null;
  cta_link: string | null;
  sort_order: number;
  is_active: boolean;
  section: "home" | "shop";
}

// ── Cloudinary upload helper ───────────────────────────────────
// Returns the secure Cloudinary URL after uploading.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = "astrotarot_products"; // same preset as products

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "banners");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url as string;
}

// ── Dimension validator ─────────────────────────────────────────
// Returns a promise that resolves to null if OK, or an error string.
function validateImageFile(
  file: File,
  expectedW: number,
  expectedH: number,
  label: string
): Promise<string | null> {
  return new Promise((resolve) => {
    // Format check
    const allowed = ["image/jpeg", "image/jpg", "image/webp"];
    // JPG and JPEG have the same MIME type (image/jpeg) so one check covers both
    if (!allowed.includes(file.type)) {
      return resolve(`${label}: only JPG, JPEG, and WebP files are allowed.`);
    }

    // Dimension check via Image element
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth !== expectedW || img.naturalHeight !== expectedH) {
        resolve(
          `${label}: image must be exactly ${expectedW}×${expectedH}px. ` +
          `Your file is ${img.naturalWidth}×${img.naturalHeight}px.`
        );
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(`${label}: could not read the image file.`);
    };
    img.src = url;
  });
}

// ── Form state type ─────────────────────────────────────────────
interface FormState {
  title: string;
  desktopFile: File | null;
  mobileFile: File | null;
  desktopPreview: string;
  mobilePreview: string;
  cta_text: string;
  cta_link: string;
  section: "home" | "shop";
}

const emptyForm = (section: "home" | "shop" = "home"): FormState => ({
  // section determines which tab this banner belongs to
  title: "",
  desktopFile: null,
  mobileFile: null,
  desktopPreview: "",
  mobilePreview: "",
  cta_text: "",
  cta_link: "",
  section,
});

// ── Main component ──────────────────────────────────────────────
export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeSection, setActiveSection] = useState<"home" | "shop">("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const filteredBanners = banners.filter((b) => (b.section ?? "home") === activeSection);

  // ── Fetch banners ──────────────────────────────────────────────
  async function fetchBanners() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/banners", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      setBanners(json.banners ?? []);
    } catch {
      setError("Failed to load banners.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBanners(); }, []);

  // ── File picker handler ────────────────────────────────────────
  function handleFilePick(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "desktop" | "mobile"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (type === "desktop") {
      setForm((f) => ({ ...f, desktopFile: file, desktopPreview: previewUrl }));
    } else {
      setForm((f) => ({ ...f, mobileFile: file, mobilePreview: previewUrl }));
    }
    setFieldErrors([]);
  }

  // ── Submit new banner ──────────────────────────────────────────
  async function handleSubmit() {
    setFieldErrors([]);
    setError("");
    setSuccess("");

    // Validate title
    if (!form.title.trim()) {
      setFieldErrors(["Banner title is required."]);
      return;
    }
    if (!form.desktopFile) {
      setFieldErrors(["Desktop image (1600×500px) is required."]);
      return;
    }
    if (!form.mobileFile) {
      setFieldErrors(["Mobile image (500×300px) is required."]);
      return;
    }

    // Validate dimensions + formats before uploading
    const [dErr, mErr] = await Promise.all([
      validateImageFile(form.desktopFile, 1600, 500, "Desktop image"),
      validateImageFile(form.mobileFile, 500, 300, "Mobile image"),
    ]);

    const errs = [dErr, mErr].filter(Boolean) as string[];
    if (errs.length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      // Upload both images to Cloudinary
      const [desktopUrl, mobileUrl] = await Promise.all([
        uploadToCloudinary(form.desktopFile!),
        uploadToCloudinary(form.mobileFile!),
      ]);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          image_url: desktopUrl,
          image_url_mobile: mobileUrl,
          cta_text: form.cta_text.trim() || null,
          cta_link: form.cta_link.trim() || null,
          section: form.section,
          sort_order: filteredBanners.length,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save banner");

      setSuccess("Banner added successfully!");
      setForm(emptyForm());
      setShowForm(false);
      fetchBanners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ──────────────────────────────────────────────
  async function toggleActive(banner: Banner) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/admin/banners", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ id: banner.id, is_active: !banner.is_active }),
      });
      fetchBanners();
    } catch {
      setError("Failed to update banner.");
    }
  }

  // ── Delete banner ──────────────────────────────────────────────
  async function deleteBanner(id: string) {
    if (!confirm("Delete this banner? This cannot be undone.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/admin/banners?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      fetchBanners();
    } catch {
      setError("Failed to delete banner.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 6 }}>
            Banners
          </h1>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", fontSize: 14, opacity: 0.75 }}>
            Manage Home and Shop image carousels. Max 3 banners per section.
          </p>
        </div>
        {filteredBanners.length < 3 && !showForm && (
          <button className="btn-fairy" onClick={() => { setShowForm(true); setForm(emptyForm(activeSection)); setError(""); setSuccess(""); }}>
            + Add Banner
          </button>
        )}
        {filteredBanners.length >= 3 && (
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--violet-mid)", opacity: 0.7 }}>
            Maximum 3 {activeSection} banners reached
          </span>
        )}
      </div>

      {/* Feedback */}
      {/* Section tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["home", "shop"] as const).map((sec) => (
          <button key={sec} onClick={() => { setActiveSection(sec); setShowForm(false); }} style={{ fontFamily: "var(--font-ui)", fontSize: 12, padding: "8px 20px", borderRadius: 4, border: `1px solid ${activeSection === sec ? "var(--violet)" : "rgba(200,168,240,0.2)"}`, background: activeSection === sec ? "rgba(123,94,167,0.2)" : "transparent", color: activeSection === sec ? "var(--lavender)" : "var(--silver)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}>{sec === "home" ? "Home" : "Shop"}</button>
        ))}
        <span style={{ fontSize: 12, color: "var(--silver)", opacity: 0.6, alignSelf: "center", marginLeft: 8 }}>{filteredBanners.length}/3</span>
      </div>

      {error && (
        <div style={{ background: "rgba(196,96,138,0.15)", border: "1px solid rgba(196,96,138,0.35)", borderRadius: 6, padding: "12px 16px", marginBottom: 20, color: "var(--rose-soft)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "rgba(94,167,94,0.12)", border: "1px solid rgba(94,167,94,0.3)", borderRadius: 6, padding: "12px 16px", marginBottom: 20, color: "#7fd47f", fontFamily: "var(--font-ui)", fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Add Banner Form */}
      {showForm && (
        <div className="card-fairy" style={{ padding: 28, marginBottom: 32, borderRadius: 8 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 24 }}>
            New Banner
          </h2>

          {fieldErrors.length > 0 && (
            <div style={{ background: "rgba(196,96,138,0.12)", border: "1px solid rgba(196,96,138,0.3)", borderRadius: 6, padding: "12px 16px", marginBottom: 20 }}>
              {fieldErrors.map((e, i) => (
                <p key={i} style={{ color: "var(--rose-soft)", fontFamily: "var(--font-ui)", fontSize: 13, margin: "2px 0" }}>
                  {e}
                </p>
              ))}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lavender)", marginBottom: 8 }}>
              Banner Title (for your reference only — not shown to visitors)
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Diwali Offer Banner"
              style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,240,0.2)", borderRadius: 6, color: "var(--moonwhite)", fontFamily: "var(--font-body)", fontSize: 14, colorScheme: "dark", boxSizing: "border-box" }}
            />
          </div>

          {/* Desktop image */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lavender)", marginBottom: 8 }}>
              Desktop Image — required
            </label>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--silver)", opacity: 0.65, marginBottom: 10 }}>
              Exact size: <strong style={{ color: "var(--gold)" }}>1600 × 500 px</strong> &nbsp;|&nbsp; Formats: JPG, JPEG, WebP only
            </p>
            <div
              onClick={() => desktopInputRef.current?.click()}
              style={{ border: "1.5px dashed rgba(200,168,240,0.3)", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.02)", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(200,168,240,0.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(200,168,240,0.3)")}
            >
              {form.desktopPreview ? (
                <img src={form.desktopPreview} alt="Desktop preview" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 4, objectFit: "contain" }} />
              ) : (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--silver)", opacity: 0.5, margin: 0 }}>
                  Click to upload desktop image
                </p>
              )}
            </div>
            <input ref={desktopInputRef} type="file" accept="image/jpeg,image/jpg,image/webp" style={{ display: "none" }} onChange={(e) => handleFilePick(e, "desktop")} />
            {form.desktopFile && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--violet-mid)", marginTop: 6 }}>
                Selected: {form.desktopFile.name}
              </p>
            )}
          </div>

          {/* Mobile image */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lavender)", marginBottom: 8 }}>
              Mobile Image — required
            </label>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--silver)", opacity: 0.65, marginBottom: 10 }}>
              Exact size: <strong style={{ color: "var(--gold)" }}>500 × 300 px</strong> &nbsp;|&nbsp; Formats: JPG, JPEG, WebP only
            </p>
            <div
              onClick={() => mobileInputRef.current?.click()}
              style={{ border: "1.5px dashed rgba(200,168,240,0.3)", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.02)", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(200,168,240,0.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(200,168,240,0.3)")}
            >
              {form.mobilePreview ? (
                <img src={form.mobilePreview} alt="Mobile preview" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 4, objectFit: "contain" }} />
              ) : (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--silver)", opacity: 0.5, margin: 0 }}>
                  Click to upload mobile image
                </p>
              )}
            </div>
            <input ref={mobileInputRef} type="file" accept="image/jpeg,image/jpg,image/webp" style={{ display: "none" }} onChange={(e) => handleFilePick(e, "mobile")} />
            {form.mobileFile && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--violet-mid)", marginTop: 6 }}>
                Selected: {form.mobileFile.name}
              </p>
            )}
          </div>

          {/* CTA — optional */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lavender)", marginBottom: 8 }}>
                Button Text (optional)
              </label>
              <input
                type="text"
                value={form.cta_text}
                onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))}
                placeholder="e.g. Book a Reading"
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,240,0.2)", borderRadius: 6, color: "var(--moonwhite)", fontFamily: "var(--font-body)", fontSize: 14, colorScheme: "dark", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lavender)", marginBottom: 8 }}>
                Button Link (optional)
              </label>
              <input
                type="text"
                value={form.cta_link}
                onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))}
                placeholder="e.g. /book"
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,168,240,0.2)", borderRadius: 6, color: "var(--moonwhite)", fontFamily: "var(--font-body)", fontSize: 14, colorScheme: "dark", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn-fairy" onClick={handleSubmit} disabled={saving}>
              {saving ? "Uploading…" : "Save Banner"}
            </button>
            <button className="btn-ghost-fairy" onClick={() => { setShowForm(false); setForm(emptyForm()); setFieldErrors([]); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Banner list */}
      {loading ? (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", opacity: 0.6 }}>Loading…</p>
      ) : filteredBanners.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.5 }}>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", marginBottom: 8 }}>No banners yet.</p>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--violet-mid)" }}>
            The homepage will show the default animated hero until you add a banner.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredBanners.map((banner, index) => (
            <div
              key={banner.id}
              className="card-fairy"
              style={{ padding: 20, borderRadius: 8, opacity: banner.is_active ? 1 : 0.55 }}
            >
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* Previews */}
                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--violet-mid)", marginBottom: 4 }}>Desktop</p>
                    <img src={banner.image_url} alt="Desktop" style={{ width: 180, height: 56, objectFit: "cover", borderRadius: 4, border: "1px solid rgba(200,168,240,0.15)" }} />
                  </div>
                  <div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--violet-mid)", marginBottom: 4 }}>Mobile</p>
                    <img src={banner.image_url_mobile} alt="Mobile" style={{ width: 60, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid rgba(200,168,240,0.15)" }} />
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.12em", color: "var(--violet-mid)", textTransform: "uppercase" }}>
                      Banner {index + 1}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 3,
                        background: banner.is_active ? "rgba(94,167,94,0.15)" : "rgba(150,150,150,0.12)",
                        color: banner.is_active ? "#7fd47f" : "var(--silver)",
                        border: `1px solid ${banner.is_active ? "rgba(94,167,94,0.3)" : "rgba(150,150,150,0.2)"}`,
                      }}
                    >
                      {banner.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--lavender)", marginBottom: 4 }}>
                    {banner.title}
                  </p>
                  {banner.cta_text && (
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--silver)", opacity: 0.65 }}>
                      Button: "{banner.cta_text}" → {banner.cta_link}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
                  <button
                    className="btn-ghost-fairy"
                    onClick={() => toggleActive(banner)}
                    style={{ fontSize: 11 }}
                  >
                    {banner.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteBanner(banner.id)}
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      padding: "8px 14px",
                      background: "rgba(196,96,138,0.1)",
                      border: "1px solid rgba(196,96,138,0.3)",
                      borderRadius: 4,
                      color: "var(--rose-soft)",
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}