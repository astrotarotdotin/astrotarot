import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Tarot Reading — AstroTarot",
  description:
    "Draw 3 cards and get a free AI-powered tarot reading. No account needed. Explore what the cards reveal about your question — two free reads available.",
};

export default function FreeReadingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}