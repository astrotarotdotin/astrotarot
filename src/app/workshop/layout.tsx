import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarot Workshop — Learn Tarot with Ishita Nag | AstroTarot",
  description:
    "Join Ishita Nag's live online tarot workshop and learn to read the cards yourself. Beginner-friendly, deeply intuitive. Enroll for ₹2,999.",
};

export default function WorkshopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}