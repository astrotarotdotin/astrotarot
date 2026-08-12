import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — AstroTarot",
  description:
    "Have a question before booking a tarot reading? Reach out to Ishita Nag directly on WhatsApp. She will get back to you soon.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}