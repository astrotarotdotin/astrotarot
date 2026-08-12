import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Ishita Nag — Tarot Reader & Spiritual Wellness Practitioner | AstroTarot",
  description:
    "Meet Ishita Nag — certified tarot reader and spiritual wellness practitioner. Guiding seekers through love, purpose, career, and healing with honesty, warmth, and compassion.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}