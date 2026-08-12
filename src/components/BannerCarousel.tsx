"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Banner {
  id: string;
  title: string;
  image_url: string;         // desktop 1600×500
  image_url_mobile: string;  // mobile  500×300
  cta_text: string | null;
  cta_link: string | null;
}

interface Props {
  banners: Banner[];
}

export default function BannerCarousel({ banners }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Preload all banner images after first render so slide transitions are instant
  useEffect(() => {
    banners.forEach((b) => {
      new window.Image().src = b.image_url;
      new window.Image().src = b.image_url_mobile;
    });
  }, [banners]);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // Auto-slide every 4 seconds — only if 2+ banners and not paused
  useEffect(() => {
    if (banners.length < 2 || paused) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [banners.length, paused, next]);

  if (banners.length === 0) return null;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        // Desktop: 1600×500 → 31.25% aspect ratio
        // Mobile: 500×300 → 60% aspect ratio
        // We switch via CSS classes below
      }}
    >
      <style>{`
        .banner-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1600 / 500;
        }
        @media (max-width: 768px) {
          .banner-wrap {
            aspect-ratio: 500 / 300;
          }
        }
        .banner-img-desktop { display: block; }
        .banner-img-mobile  { display: none;  }
        @media (max-width: 768px) {
          .banner-img-desktop { display: none;  }
          .banner-img-mobile  { display: block; }
        }
      `}</style>

      <div className="banner-wrap">
        <AnimatePresence mode="wait">
          <motion.div
            key={banners[current].id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          >
            {/* Desktop image — fetchpriority high on first slide for fast LCP */}
            <img
              src={banners[current].image_url}
              alt={banners[current].title}
              className="banner-img-desktop"
              fetchPriority={current === 0 ? "high" : "auto"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />

            {/* Mobile image */}
            <img
              src={banners[current].image_url_mobile}
              alt={banners[current].title}
              className="banner-img-mobile"
              fetchPriority={current === 0 ? "high" : "auto"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />

            {/* CTA button overlay — shown only if cta_text + cta_link are set */}
            {banners[current].cta_text && banners[current].cta_link && (
              <div
                style={{
                  position: "absolute",
                  bottom: "10%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 2,
                }}
              >
                <Link href={banners[current].cta_link!}>
                  <button className="btn-fairy">{banners[current].cta_text}</button>
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators — only shown if 2+ banners */}
      {banners.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            padding: "12px 0",
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            zIndex: 3,
          }}
        >
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to banner ${i + 1}`}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                background: i === current
                  ? "var(--rose-soft)"
                  : "rgba(192,168,240,0.35)",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Left / right arrows — only shown if 2+ banners */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)}
            aria-label="Previous banner"
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
              background: "rgba(14,10,31,0.55)",
              border: "1px solid rgba(200,168,240,0.25)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              color: "var(--lavender)",
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Next banner"
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
              background: "rgba(14,10,31,0.55)",
              border: "1px solid rgba(200,168,240,0.25)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              color: "var(--lavender)",
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}