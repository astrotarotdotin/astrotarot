"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────
interface Testimonial {
  id: string; // client-side only UUID for list keys
  name: string;
  role: string;
  quote: string;
}

function newTestimonial(): Testimonial {
  return { id: crypto.randomUUID(), name: "", role: "", quote: "" };
}

// ── Save helper ────────────────────────────────────────────────
async function saveContent(token: string, updates: Record<string, string>) {
  const res = await fetch("/api/admin/content", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) throw new Error("Save failed");
}

// ── SectionCard ────────────────────────────────────────────────
// IMPORTANT: defined outside AdminContentPage so React never sees it as a
// new component type on re-render. Moving it inside would cause inputs to
// lose focus and the page to scroll on every keystroke.
function SectionCard({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="card-fairy" style={{ padding: 28, borderRadius: 8, marginBottom: 24 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: subtitle ? 6 : 20 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--silver)", opacity: 0.8, marginBottom: 20 }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

// ── FlashMsg ─────────────────────────────────────────────────────
// Receives flash state as a prop (not via closure) because it lives outside
// the parent component.
interface FlashState {
  section: string;
  ok: boolean;
  msg: string;
}

function FlashMsg({ section, flash }: { section: string; flash: FlashState | null }) {
  if (!flash || flash.section !== section) return null;
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 6,
        marginTop: 12,
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        background: flash.ok ? "rgba(94,167,94,0.12)" : "rgba(196,96,138,0.12)",
        border: `1px solid ${flash.ok ? "rgba(94,167,94,0.3)" : "rgba(196,96,138,0.3)"}`,
        color: flash.ok ? "#7fd47f" : "var(--rose-soft)",
      }}
    >
      {flash.msg}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function AdminContentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // which section is saving
  const [flash, setFlash] = useState<{ section: string; ok: boolean; msg: string } | null>(null);

  // Hero text fields
  const [tagline, setTagline]     = useState("");
  const [headline, setHeadline]   = useState("");
  const [subtext, setSubtext]     = useState("");

  // About section
  const [aboutBio, setAboutBio]         = useState("");
  const [aboutPhotoUrl, setAboutPhotoUrl] = useState("");

  // Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null); // which testimonial card is open

  // Announcement banner
  const [announcementText, setAnnouncementText]     = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);

  // Shop visibility
  const [shopEnabled, setShopEnabled] = useState(false);

  // ── Load all content ─────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/content", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const json = await res.json();
        const c = json.content ?? {};

        setTagline(c.hero_tagline    ?? "Sacred Tarot Readings");
        setHeadline(c.hero_headline  ?? "The Cards Already Know");
        setSubtext(c.hero_subtext    ?? "Every question you carry has an answer waiting in the sacred language of the tarot. Let us find it together.");
        setAboutBio(c.about_bio      ?? "");
        setAboutPhotoUrl(c.about_photo_url ?? "");
        setAnnouncementText(c.announcement_text   ?? "");
        setAnnouncementActive(c.announcement_active === "true");
        setShopEnabled(c.shop_enabled === "true");

        // Testimonials stored as JSON string
        try {
          const parsed = JSON.parse(c.testimonials || "[]");
          setTestimonials(
            Array.isArray(parsed) && parsed.length > 0
              ? parsed.map((t: Omit<Testimonial, "id">) => ({ ...t, id: crypto.randomUUID() }))
              : [newTestimonial()]
          );
        } catch {
          setTestimonials([newTestimonial()]);
        }
      } catch {
        // silent — fields stay at defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Flash helper ─────────────────────────────────────────────
  function showFlash(section: string, ok: boolean, msg: string) {
    setFlash({ section, ok, msg });
    setTimeout(() => setFlash(null), 3000);
  }

  // ── Get token helper ─────────────────────────────────────────
  async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }

  // ── Save: hero text ──────────────────────────────────────────
  async function saveHero() {
    if (!tagline.trim() || !headline.trim()) {
      showFlash("hero", false, "Tagline and headline cannot be empty.");
      return;
    }
    setSaving("hero");
    try {
      const token = await getToken();
      await saveContent(token, {
        hero_tagline:  tagline.trim(),
        hero_headline: headline.trim(),
        hero_subtext:  subtext.trim(),
      });
      showFlash("hero", true, "Hero text saved.");
    } catch {
      showFlash("hero", false, "Failed to save.");
    } finally {
      setSaving(null);
    }
  }

  // ── Save: about ──────────────────────────────────────────────
  async function saveAbout() {
    setSaving("about");
    try {
      const token = await getToken();
      await saveContent(token, {
        about_bio:       aboutBio.trim(),
        about_photo_url: aboutPhotoUrl.trim(),
      });
      showFlash("about", true, "About section saved.");
    } catch {
      showFlash("about", false, "Failed to save.");
    } finally {
      setSaving(null);
    }
  }

  // ── Testimonial helpers ──────────────────────────────────────
  function updateTestimonial(id: string, field: keyof Testimonial, value: string) {
    setTestimonials((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  }

  function addTestimonial() {
    if (testimonials.length >= 3) return;
    setTestimonials((prev) => [...prev, newTestimonial()]);
  }

  function removeTestimonial(id: string) {
    setTestimonials((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      return filtered.length > 0 ? filtered : [newTestimonial()];
    });
  }

  // ── Save: testimonials ───────────────────────────────────────
  async function saveTestimonials() {
    // Validate — at least name + quote on each non-empty row
    const filled = testimonials.filter((t) => t.name.trim() || t.quote.trim());
    const invalid = filled.some((t) => !t.name.trim() || !t.quote.trim());
    if (invalid) {
      showFlash("testimonials", false, "Each testimonial needs both a name and a quote.");
      return;
    }

    setSaving("testimonials");
    try {
      const token = await getToken();
      // Strip client-side id before saving
      const toSave = filled.map(({ name, role, quote }) => ({ name, role, quote }));
      await saveContent(token, { testimonials: JSON.stringify(toSave) });
      showFlash("testimonials", true, `${toSave.length} testimonial${toSave.length !== 1 ? "s" : ""} saved.`);
    } catch {
      showFlash("testimonials", false, "Failed to save.");
    } finally {
      setSaving(null);
    }
  }

  // ── Save: announcement ───────────────────────────────────────
  async function saveAnnouncement() {
    setSaving("announcement");
    try {
      const token = await getToken();
      await saveContent(token, {
        announcement_text:   announcementText.trim(),
        announcement_active: String(announcementActive),
      });
      showFlash("announcement", true, "Announcement saved.");
    } catch {
      showFlash("announcement", false, "Failed to save.");
    } finally {
      setSaving(null);
    }
  }

  // ── Save: shop toggle ────────────────────────────────────────
  async function saveShopToggle(enabled: boolean) {
    setShopEnabled(enabled);
    setSaving("shop");
    try {
      const token = await getToken();
      await saveContent(token, { shop_enabled: String(enabled) });
      showFlash("shop", true, `Shop is now ${enabled ? "visible" : "hidden"} on the public site.`);
    } catch {
      showFlash("shop", false, "Failed to update.");
      setShopEnabled(!enabled); // revert on error
    } finally {
      setSaving(null);
    }
  }

  // ── Shared UI helpers ─────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(200,168,240,0.2)",
    borderRadius: 6,
    color: "var(--moonwhite)",
    fontFamily: "var(--font-body)",
    fontSize: 14,
    colorScheme: "dark",
    boxSizing: "border-box",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    minHeight: 80,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--lavender)",
    marginBottom: 8,
  };

  // SectionCard and FlashMsg are defined outside the component — see below the imports

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", opacity: 0.6, padding: 40 }}>Loading…</p>;
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 6 }}>Content</h1>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--silver)", fontSize: 14, opacity: 0.75 }}>
          Edit the text and content shown on your public website.
        </p>
      </div>

      {/* ── HERO TEXT ──────────────────────────────────────── */}
      <SectionCard title="Hero Text" subtitle="Shown on the homepage when there are no active banners.">
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Tagline (small text above the headline)</label>
          <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Headline</label>
          <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Subtext (the paragraph below the headline)</label>
          <textarea value={subtext} onChange={(e) => setSubtext(e.target.value)} style={textareaStyle} rows={3} />
        </div>
        <button className="btn-fairy" onClick={saveHero} disabled={saving === "hero"} style={{ fontSize: 12 }}>
          {saving === "hero" ? "Saving…" : "Save Hero Text"}
        </button>
        <FlashMsg section="hero" flash={flash} />
      </SectionCard>

      {/* ── ABOUT SECTION ──────────────────────────────────── */}
      <SectionCard title="About You" subtitle="Shown on the homepage About section and the About page.">
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Your Bio</label>
          <textarea
            value={aboutBio}
            onChange={(e) => setAboutBio(e.target.value)}
            placeholder="Write a few sentences about yourself, your journey with tarot, and how you work with clients…"
            style={{ ...textareaStyle, minHeight: 120 }}
            rows={5}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Photo URL (paste Cloudinary link here)</label>
          <input
            type="text"
            value={aboutPhotoUrl}
            onChange={(e) => setAboutPhotoUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/…"
            style={inputStyle}
          />
          {aboutPhotoUrl && (
            <img
              src={aboutPhotoUrl}
              alt="Preview"
              style={{ marginTop: 10, width: 100, height: 100, objectFit: "cover", borderRadius: "50%", border: "2px solid rgba(200,168,240,0.3)" }}
            />
          )}
        </div>
        <button className="btn-fairy" onClick={saveAbout} disabled={saving === "about"} style={{ fontSize: 12 }}>
          {saving === "about" ? "Saving…" : "Save About Section"}
        </button>
        <FlashMsg section="about" flash={flash} />
      </SectionCard>

      {/* ── TESTIMONIALS ───────────────────────────────────── */}
      <SectionCard title="Testimonials" subtitle="Shown on the homepage. Add up to 3 testimonials.">
        {testimonials.map((t, i) => {
          const isOpen = expandedId === t.id;
          const preview = t.name || `Testimonial ${i + 1}`;
          return (
            <div
              key={t.id}
              style={{ border: "1px solid rgba(200,168,240,0.12)", borderRadius: 6, marginBottom: 8, overflow: "hidden" }}
            >
              {/* ── Collapsed header row — always visible ── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: isOpen ? "rgba(192,168,240,0.08)" : "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => setExpandedId(isOpen ? null : t.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--lavender)", letterSpacing: "0.08em" }}>
                    {preview}
                  </span>
                  {t.quote && (
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--silver)", opacity: 0.45, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      — {t.quote}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTestimonial(t.id); }}
                    style={{ background: "none", border: "none", color: "var(--rose-soft)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 11, opacity: 0.7 }}
                  >
                    Remove
                  </button>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--violet-mid)", opacity: 0.6 }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* ── Expanded fields — only when open ── */}
              {isOpen && (
                <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(200,168,240,0.08)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Client Name</label>
                      <input type="text" value={t.name} onChange={(e) => updateTestimonial(t.id, "name", e.target.value)} placeholder="Priya S." style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Role / Location (optional)</label>
                      <input type="text" value={t.role} onChange={(e) => updateTestimonial(t.id, "role", e.target.value)} placeholder="Mumbai" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Quote</label>
                    <textarea value={t.quote} onChange={(e) => updateTestimonial(t.id, "quote", e.target.value)} placeholder="What the client said…" style={{ ...textareaStyle, minHeight: 70 }} rows={3} />
                  </div>

                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {testimonials.length < 3 && (
            <button className="btn-ghost-fairy" onClick={addTestimonial} style={{ fontSize: 11 }}>
              + Add Testimonial
            </button>
          )}
          <button className="btn-fairy" onClick={saveTestimonials} disabled={saving === "testimonials"} style={{ fontSize: 12 }}>
            {saving === "testimonials" ? "Saving…" : "Save Testimonials"}
          </button>
        </div>
        <FlashMsg section="testimonials" flash={flash} />
      </SectionCard>

      {/* ── ANNOUNCEMENT BANNER ────────────────────────────── */}
      <SectionCard title="Announcement Banner" subtitle="A thin bar shown at the top of every page when active. Use it for short messages like 'Bookings open for August'.">
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Announcement Text</label>
          <input
            type="text"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="e.g. Bookings now open for August — limited slots available."
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setAnnouncementActive((v) => !v)}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: "none",
              background: announcementActive ? "var(--violet)" : "rgba(200,168,240,0.2)",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute",
              top: 3,
              left: announcementActive ? 22 : 3,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--moonwhite)",
              transition: "left 0.2s",
            }} />
          </button>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--silver)" }}>
            {announcementActive ? "Banner is active (visible to all visitors)" : "Banner is off"}
          </span>
        </div>
        <button className="btn-fairy" onClick={saveAnnouncement} disabled={saving === "announcement"} style={{ fontSize: 12 }}>
          {saving === "announcement" ? "Saving…" : "Save Announcement"}
        </button>
        <FlashMsg section="announcement" flash={flash} />
      </SectionCard>

      {/* ── SHOP VISIBILITY ────────────────────────────────── */}
      <SectionCard title="Shop Visibility" subtitle="Show or hide the Shop link in the public navigation. Turn this on only when you have products ready.">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => saveShopToggle(!shopEnabled)}
            disabled={saving === "shop"}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: "none",
              background: shopEnabled ? "var(--violet)" : "rgba(200,168,240,0.2)",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute",
              top: 3,
              left: shopEnabled ? 22 : 3,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--moonwhite)",
              transition: "left 0.2s",
            }} />
          </button>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--silver)" }}>
            {shopEnabled ? "Shop is visible in public navigation" : "Shop is hidden (you can still manage products in admin)"}
          </span>
        </div>
        <FlashMsg section="shop" flash={flash} />
      </SectionCard>
    </div>
  );
}