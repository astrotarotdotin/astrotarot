import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Tarot Reading — AstroTarot",
  description:
    "Book a live 1:1 tarot reading with Ishita Nag on WhatsApp Video. Choose from Quick Clarity (₹199), Insight Reading (₹599), Detailed Reading (₹1,199), or Emergency Same-Day (₹1,499).",
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}