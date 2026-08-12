import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — Crystals, Tarot Tools & Spiritual Offerings | AstroTarot",
  description:
    "Browse AstroTarot's curated shop — natural crystal bracelets, tarot tools, and spiritual wellness products hand-picked by Ishita Nag. Free your energy, invite abundance.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}