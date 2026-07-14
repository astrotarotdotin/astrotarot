import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MagicLayer from "@/components/layout/MagicLayer";

export const metadata: Metadata = {
  title: "AstroTarot — Tarot Readings & Spiritual Guidance",
  description:
    "Book a live tarot reading, try a free AI-powered reading, or join a tarot workshop with Ishita Nag.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Raleway:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <MagicLayer />
        <Navbar />
        <div className="page-content">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
